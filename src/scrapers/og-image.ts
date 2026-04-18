import * as cheerio from "cheerio";
import { normalizePublicHttpUrl } from "../url-safety";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 12_000;
const MAX_REDIRECT_HOPS = 3;
const MAX_HTML_BYTES = 512 * 1024;

const STANDARD_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
};

/**
 * Patrones de imágenes "falsas" que llegan desde agregadores (p.ej. el logo
 * genérico de Google News). Si la imagen casa con alguno, tratamos al item
 * como si no tuviera imagen y forzamos la extracción de og:image.
 */
const BAD_IMAGE_PATTERNS: RegExp[] = [
  /lh3\.googleusercontent\.com\/[^=]+=s\d+-w\d+(-rw)?$/i,
  /news\.google\.com\/.*favicon/i,
  /ssl\.gstatic\.com/i,
  /google\.com\/favicon/i,
  /data:image\//i,
];

export const isBadImage = (url: string | undefined | null): boolean => {
  const safeUrl = normalizePublicHttpUrl(url);
  if (!safeUrl) return true;
  return BAD_IMAGE_PATTERNS.some((p) => p.test(safeUrl));
};

/**
 * Detecta URLs de Google News que en realidad son un redirect hacia el
 * artículo real en la web del medio.
 */
const isGoogleNewsUrl = (url: string): boolean => {
  const safeUrl = normalizePublicHttpUrl(url);
  if (!safeUrl) return false;
  return new URL(safeUrl).hostname.toLowerCase() === "news.google.com";
};

/**
 * A partir del HTML intermedio que sirve Google News cuando pinchas un
 * artículo del RSS, intenta extraer la URL real del medio original.
 */
const extractGoogleNewsRedirect = (html: string): string | null => {
  const metaRefresh = html.match(
    /<meta[^>]+http-equiv=["']?refresh["']?[^>]+content=["'][^"']*url=([^"'>]+)/i,
  );
  if (metaRefresh?.[1]) return metaRefresh[1].trim();

  const dataNau = html.match(/data-n-au=["']([^"']+)["']/i);
  if (dataNau?.[1] && !dataNau[1].includes("news.google.com")) {
    return dataNau[1].trim();
  }

  const canonical = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
  );
  if (canonical?.[1] && !canonical[1].includes("news.google.com")) {
    return canonical[1].trim();
  }

  const ogUrl = html.match(
    /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i,
  );
  if (ogUrl?.[1] && !ogUrl[1].includes("news.google.com")) {
    return ogUrl[1].trim();
  }

  const jsLocation = html.match(
    /(?:window\.location(?:\.href|\.replace)?\s*=\s*|location\.replace\(\s*)["']([^"']+)["']/i,
  );
  if (jsLocation?.[1] && !jsLocation[1].includes("news.google.com")) {
    return jsLocation[1].trim();
  }

  return null;
};

/**
 * Dado un posible redirect de Google News, intenta resolverlo a la URL real
 * del artículo. Si no se puede, devuelve la URL original.
 */
export const resolveArticleUrl = async (url: string): Promise<string> => {
  const safeInput = normalizePublicHttpUrl(url);
  if (!safeInput) return "";
  if (!isGoogleNewsUrl(safeInput)) return safeInput;

  let current = safeInput;
  for (let hop = 0; hop < MAX_REDIRECT_HOPS; hop++) {
    try {
      const res = await fetch(current, {
        headers: STANDARD_HEADERS,
        redirect: "follow",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      const finalUrl = normalizePublicHttpUrl(res.url || current);
      if (!finalUrl) return current;
      if (!isGoogleNewsUrl(finalUrl)) return finalUrl;

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("html")) return finalUrl;

      const html = await res.text();
      const next = normalizePublicHttpUrl(
        extractGoogleNewsRedirect(html),
        finalUrl,
      );
      if (!next) return finalUrl;

      if (!isGoogleNewsUrl(next)) return next;
      current = next;
    } catch {
      return current;
    }
  }
  return current;
};

/**
 * Resuelve una URL relativa a absoluta usando el `base` como origen.
 */
const absolutize = (src: string, base: string): string => {
  return normalizePublicHttpUrl(src, base);
};

/**
 * Recorre bloques JSON-LD buscando propiedades `image` (string, objeto o array).
 */
const extractJsonLdImage = (html: string, base: string): string => {
  const scripts = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  if (!scripts) return "";

  for (const block of scripts) {
    const inner = block.replace(/^[\s\S]*?>|<\/script>$/g, "").trim();
    if (!inner) continue;
    try {
      const parsed: unknown = JSON.parse(inner);
      const queue: unknown[] = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (queue.length > 0) {
        const node = queue.shift();
        if (!node || typeof node !== "object") continue;
        const obj = node as Record<string, unknown>;
        const img = obj.image ?? obj.thumbnailUrl ?? obj.thumbnail;
        if (img) {
          if (typeof img === "string") {
            const abs = absolutize(img, base);
            if (abs) return abs;
          } else if (Array.isArray(img)) {
            for (const entry of img) {
              if (typeof entry === "string") {
                const abs = absolutize(entry, base);
                if (abs) return abs;
              } else if (entry && typeof entry === "object") {
                const u = (entry as Record<string, unknown>).url;
                if (typeof u === "string") {
                  const abs = absolutize(u, base);
                  if (abs) return abs;
                }
              }
            }
          } else if (typeof img === "object") {
            const u = (img as Record<string, unknown>).url;
            if (typeof u === "string") {
              const abs = absolutize(u, base);
              if (abs) return abs;
            }
          }
        }
        if (obj["@graph"] && Array.isArray(obj["@graph"])) {
          queue.push(...(obj["@graph"] as unknown[]));
        }
      }
    } catch {
      // JSON inválido: ignoramos este bloque.
    }
  }
  return "";
};

/**
 * Busca en orden de prioridad una imagen representativa del artículo:
 *   1. og:image en todas sus variantes (secure_url, url, og:image).
 *   2. twitter:image y twitter:image:src.
 *   3. link[rel=image_src] y meta[itemprop=image].
 *   4. meta[name=thumbnail], article:image.
 *   5. JSON-LD (schema.org/NewsArticle, Article, etc.).
 *   6. Primer <img> dentro del <article>/main content.
 *   7. Primer <img> con tamaño "hero" del body.
 */
const pickOgImage = (html: string, base: string): string => {
  const $ = cheerio.load(html);

  const metaCandidates: (string | undefined)[] = [
    $('meta[property="og:image:secure_url"]').attr("content"),
    $('meta[property="og:image:url"]').attr("content"),
    $('meta[property="og:image"]').attr("content"),
    $('meta[name="og:image"]').attr("content"),
    $('meta[property="twitter:image"]').attr("content"),
    $('meta[name="twitter:image"]').attr("content"),
    $('meta[name="twitter:image:src"]').attr("content"),
    $('meta[property="twitter:image:src"]').attr("content"),
    $('link[rel="image_src"]').attr("href"),
    $('meta[itemprop="image"]').attr("content"),
    $('meta[name="thumbnail"]').attr("content"),
    $('meta[property="article:image"]').attr("content"),
    $('meta[name="sailthru.image.full"]').attr("content"),
    $('meta[name="sailthru.image.thumb"]').attr("content"),
    $('meta[name="parsely-image-url"]').attr("content"),
  ];

  for (const c of metaCandidates) {
    if (!c) continue;
    const abs = absolutize(c, base);
    if (abs && !isBadImage(abs)) return abs;
  }

  const jsonLd = extractJsonLdImage(html, base);
  if (jsonLd && !isBadImage(jsonLd)) return jsonLd;

  const articleImg = $("article img").first().attr("src");
  if (articleImg) {
    const abs = absolutize(articleImg, base);
    if (abs && !isBadImage(abs)) return abs;
  }

  const mainImg = $("main img").first().attr("src");
  if (mainImg) {
    const abs = absolutize(mainImg, base);
    if (abs && !isBadImage(abs)) return abs;
  }

  const figureImg = $("figure img").first().attr("src");
  if (figureImg) {
    const abs = absolutize(figureImg, base);
    if (abs && !isBadImage(abs)) return abs;
  }

  const firstImg = $("img").first().attr("src");
  if (firstImg) {
    const abs = absolutize(firstImg, base);
    if (abs && !isBadImage(abs)) return abs;
  }

  return "";
};

/**
 * Descarga una página y extrae la imagen más representativa del artículo
 * mirando metatags sociales (og:image, twitter:image), JSON-LD y como
 * fallback las primeras imágenes del body. Si la URL apunta a Google News,
 * resuelve primero a la URL real del medio.
 */
export const fetchOgImage = async (url: string): Promise<string> => {
  try {
    const targetUrl = await resolveArticleUrl(url);
    if (!targetUrl) return "";

    const res = await fetch(targetUrl, {
      headers: STANDARD_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) return "";

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) return "";

    const fullHtml = await res.text();
    const html =
      fullHtml.length > MAX_HTML_BYTES ? fullHtml.slice(0, MAX_HTML_BYTES) : fullHtml;

    const base = normalizePublicHttpUrl(res.url || targetUrl) || targetUrl;
    return pickOgImage(html, base);
  } catch {
    return "";
  }
};

/**
 * Construye una URL a WordPress mShots (servicio gratuito, sin API key) para
 * generar un screenshot del artículo cuando el medio bloquea el scraping
 * del og:image (típico en sitios tras Cloudflare como openai.com). La imagen
 * se genera "lazy": el primer request puede tardar unos segundos, pero los
 * siguientes salen de caché. Devuelve cadena vacía si la URL no es http(s).
 */
export const buildScreenshotUrl = (
  url: string,
  width = 1280,
): string => {
  const safeUrl = normalizePublicHttpUrl(url);
  if (!safeUrl) return "";
  return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(safeUrl)}?w=${width}`;
};

/**
 * Ejecuta trabajos en paralelo con un límite de concurrencia.
 */
export const mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i]!, i);
    }
  });

  await Promise.all(runners);
  return results;
};
