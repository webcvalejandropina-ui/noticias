import {
  enrichStoredNews,
  ensureBucketFresh,
  getDigest,
  getGeneralFeed,
  getTopNews,
  kickoffBackgroundSync,
  scrapeAllSources,
  scrapeBucket,
  syncAllSources,
  syncBucket,
  syncLanguage,
} from "./scrapers";
import { countNews, getToday, purgeOldNews, queryNews } from "./db";
import {
  SOURCES,
  getCategoriesByLanguage,
  getSourcesBy,
} from "./scrapers/sources";
import {
  ALL_CATEGORIES,
  ALL_LANGUAGES,
  type Category,
  type Language,
} from "./types";

const PORT = Number(process.env.PORT ?? 3000);

/**
 * Modo producción = APP_ENV=production. Se usa SOLO APP_ENV para no mezclar
 * con NODE_ENV (que el Dockerfile puede fijar a "production" para optimizaciones
 * de Bun/Node aunque el despliegue sea dev/LAN).
 */
const IS_PRODUCTION = process.env.APP_ENV === "production";

const ADMIN_TOKEN = (process.env.ADMIN_API_TOKEN ?? "").trim();

/** Solo `ALLOW_OPEN_ADMIN_ROUTES=1` en máquina local de confianza; nunca expuesto a LAN/internet. */
const ADMIN_ROUTES_OPEN = process.env.ALLOW_OPEN_ADMIN_ROUTES === "1";

const adminRouteEpilog = ADMIN_ROUTES_OPEN
  ? " (rutas admin abiertas: ALLOW_OPEN_ADMIN_ROUTES=1)"
  : IS_PRODUCTION
    ? " (Authorization: Bearer … o X-Admin-Token con ADMIN_API_TOKEN)"
    : " (Authorization: Bearer …, X-Admin-Token o ?token= con ADMIN_API_TOKEN)";

const parseCorsAllowlist = (): string[] => {
  const raw = process.env.CORS_ALLOWED_ORIGINS?.trim();
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
};

const corsHeadersFor = (req: Request): Record<string, string> => {
  const list = parseCorsAllowlist();
  const origin = req.headers.get("Origin");
  const h: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token",
  };

  if (!IS_PRODUCTION) {
    h["Access-Control-Allow-Origin"] = "*";
    return h;
  }

  if (list.length === 0) {
    if (origin) h["Vary"] = "Origin";
    return h;
  }

  // En producción ignoramos wildcards aunque alguien los configure por error.
  const allowedOrigins = list.filter((entry) => entry !== "*");

  if (origin && allowedOrigins.includes(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Vary"] = "Origin";
  }

  return h;
};

const json = (req: Request, data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
      ...corsHeadersFor(req),
    },
  });

/**
 * Rutas que modifican scraping / BD. Por defecto exigen ADMIN_API_TOKEN
 * (Bearer o X-Admin-Token; ?token= solo se acepta fuera de producción).
 * Opt-in explícito a abrirlas: ALLOW_OPEN_ADMIN_ROUTES=1.
 */
const assertAdminAuthorized = (req: Request): Response | null => {
  if (ADMIN_ROUTES_OPEN) return null;

  if (!ADMIN_TOKEN) {
    return json(
      req,
      {
        error: "Forbidden",
        detail:
          "Define ADMIN_API_TOKEN en el servicio api, o en local de confianza ALLOW_OPEN_ADMIN_ROUTES=1. Rutas: /refresh, /sync, /enrich, /cleanup y variantes por idioma/categoría.",
      },
      403,
    );
  }

  const auth = req.headers.get("Authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const header = req.headers.get("X-Admin-Token")?.trim() ?? "";
  const q = IS_PRODUCTION
    ? ""
    : new URL(req.url).searchParams.get("token")?.trim() ?? "";
  const ok =
    (bearer.length > 0 && bearer === ADMIN_TOKEN) ||
    (header.length > 0 && header === ADMIN_TOKEN) ||
    (q.length > 0 && q === ADMIN_TOKEN);

  if (!ok) {
    return json(req, { error: "Unauthorized" }, 401);
  }

  return null;
};

const isLanguage = (v: string): v is Language => (ALL_LANGUAGES as string[]).includes(v);
const isCategory = (v: string): v is Category => (ALL_CATEGORIES as string[]).includes(v);

const parseLimit = (raw: string | null, def = 10): number => {
  const n = Number(raw ?? def) || def;
  return Math.min(Math.max(Math.floor(n), 1), 50);
};

/**
 * Handler: /:lang/browse/:category
 */
const handleBrowse = async (
  req: Request,
  language: Language,
  categoryRaw: string,
  url: URL,
): Promise<Response> => {
  const category = categoryRaw as Category;
  if (!isCategory(category)) {
    return json(req, { error: "Unknown category", category }, 400);
  }

  const sources = getSourcesBy(language, category);
  if (sources.length === 0) {
    return json(req, { error: "No sources for this bucket", language, category }, 404);
  }

  await ensureBucketFresh(language, category);

  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const pageSize = Math.min(
    Math.max(Number(url.searchParams.get("pageSize") ?? 12) || 12, 1),
    50,
  );
  const q = url.searchParams.get("q")?.trim() || undefined;
  const source = url.searchParams.get("source")?.trim() || undefined;

  const baseQuery = { language, category, search: q, source };
  const total = countNews(baseQuery);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const news = queryNews({
    ...baseQuery,
    limit: pageSize,
    offset: (safePage - 1) * pageSize,
  });

  return json(req, {
    language,
    category,
    page: safePage,
    pageSize,
    total,
    totalPages,
    filters: { q: q ?? null, source: source ?? null },
    sources: sources.map((s) => s.name),
    count: news.length,
    news,
  });
};

/**
 * Handler: /:lang/news[/:category]
 */
const handleLanguageNews = async (
  req: Request,
  language: Language,
  categoryRaw: string | null,
  url: URL,
): Promise<Response> => {
  const category = (categoryRaw ?? "ia") as Category;
  if (!isCategory(category)) {
    return json(
      req,
      {
        error: "Unknown category",
        category,
        availableCategories: getCategoriesByLanguage(language),
      },
      400,
    );
  }

  const sources = getSourcesBy(language, category);
  if (sources.length === 0) {
    return json(
      req,
      {
        error: "No sources configured for this language+category",
        language,
        category,
        availableCategories: getCategoriesByLanguage(language),
      },
      404,
    );
  }

  const limit = parseLimit(url.searchParams.get("limit"));
  const result = await getTopNews(language, category, limit);

  return json(req, {
    language: result.language,
    category: result.category,
    day: result.day,
    fromCache: result.fromCache,
    totalAvailable: result.total,
    count: result.news.length,
    sources: sources.map((s) => s.name),
    news: result.news,
  });
};

const server = Bun.serve({
  port: PORT,
  idleTimeout: 255,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "X-Content-Type-Options": "nosniff",
          ...corsHeadersFor(req),
        },
      });
    }

    if (req.method !== "GET") {
      return json(req, { error: "Method Not Allowed" }, 405);
    }

    try {
      const path = url.pathname.replace(/\/+$/, "") || "/";
      const segments = path.split("/").filter(Boolean);

      if (path === "/") {
        return json(req, {
          name: "AI News API",
          version: "2.0.0",
          description:
            "API agregadora de noticias multi-idioma y multi-categoría con cache diario en SQLite.",
          languages: ALL_LANGUAGES,
          categoriesByLanguage: Object.fromEntries(
            ALL_LANGUAGES.map((l) => [l, getCategoriesByLanguage(l)]),
          ),
          security: {
            appEnv: IS_PRODUCTION ? "production" : "development",
            adminRoutesRequireToken: !ADMIN_ROUTES_OPEN,
            allowOpenAdminRoutes: ADMIN_ROUTES_OPEN,
            cors:
              IS_PRODUCTION && parseCorsAllowlist().length === 0
                ? "Solo orígenes listados en CORS_ALLOWED_ORIGINS (vacío = sin CORS abierto)."
                : IS_PRODUCTION
                  ? "Orígenes permitidos según CORS_ALLOWED_ORIGINS."
                  : "Desarrollo: Access-Control-Allow-Origin: *",
          },
          endpoints: {
            "GET /:lang/news": "Top 10 noticias del día (idioma + categoría IA por defecto)",
            "GET /:lang/news/:category":
              "Top 10 noticias de una categoría concreta (ia, futbol, internacional, tecnologia, software, hack)",
            "GET /:lang/news/:category?limit=N": "Personaliza el número (1-50)",
            "GET /:lang/browse/:category":
              "Listado paginado con filtros (page, pageSize, q, source) — pensado para UIs",
            "GET /:lang/digest?perCategory=N":
              "Resumen agrupado: N noticias por cada categoría disponible en el idioma",
            "GET /:lang/general?limit=N&mode=recent|random":
              "Feed General: mezcla por categoría; por defecto prioriza las más recientes (mode=recent). mode=random restaura el comportamiento aleatorio puro",
            "GET /:lang/categories": "Categorías disponibles para un idioma",
            "GET /:lang/sources?category=":
              "Fuentes disponibles para un idioma (opcionalmente filtradas por categoría)",
            "GET /sources": "Lista completa de fuentes configuradas",
            "GET /health": "Health check con nº de noticias de hoy",
            "GET /refresh": `Fuerza scraping global${adminRouteEpilog}`,
            "GET /sync": `Sync global de fuentes${adminRouteEpilog}`,
            "GET /:lang/sync": `Sync por idioma${adminRouteEpilog}`,
            "GET /:lang/sync/:category": `Sync por bucket${adminRouteEpilog}`,
            "GET /enrich?limit=N": `Enriquecimiento de registros${adminRouteEpilog}`,
            "GET /cleanup": `Purge manual +3 días${adminRouteEpilog}`,
            "GET /news": "Alias retrocompat de /en/news/ia",
          },
          examples: [
            "/es/news",
            "/es/news/ia",
            "/es/news/futbol",
            "/es/news/internacional",
            "/es/news/tecnologia",
            "/es/news/software",
            "/es/news/hack",
            "/en/news",
            "/en/news/ia?limit=20",
          ],
        });
      }

      if (path === "/health") {
        return json(req, {
          status: "ok",
          day: getToday(),
          newsToday: countNews({ day: getToday() }),
          uptimeSec: Math.round(process.uptime()),
        });
      }

      if (path === "/sources") {
        return json(req, {
          count: SOURCES.length,
          sources: SOURCES.map((s) => ({
            name: s.name,
            language: s.language,
            category: s.category,
            homepage: s.homepage,
          })),
        });
      }

      if (path === "/refresh") {
        const denied = assertAdminAuthorized(req);
        if (denied) return denied;
        const result = await scrapeAllSources();
        return json(req, {
          day: getToday(),
          totalFetched: result.totalFetched,
          inserted: result.inserted,
          purged: result.purged,
          errors: result.errors,
        });
      }

      if (path === "/sync") {
        const denied = assertAdminAuthorized(req);
        if (denied) return denied;
        const result = await syncAllSources();
        return json(req, { day: getToday(), ...result });
      }

      if (path === "/enrich") {
        const denied = assertAdminAuthorized(req);
        if (denied) return denied;
        const rawLimit = Number(url.searchParams.get("limit") ?? 400);
        const limit = Math.min(Math.max(Math.floor(rawLimit) || 400, 1), 2000);
        const result = await enrichStoredNews(limit);
        return json(req, { day: getToday(), limit, ...result });
      }

      if (path === "/cleanup") {
        const denied = assertAdminAuthorized(req);
        if (denied) return denied;
        const purged = purgeOldNews();
        return json(req, { day: getToday(), purged });
      }

      if (path === "/news") {
        return await handleLanguageNews(req, "en", "ia", url);
      }

      if (segments.length >= 1 && isLanguage(segments[0]!)) {
        const language = segments[0] as Language;

        if (segments.length === 2 && segments[1] === "categories") {
          return json(req, {
            language,
            categories: getCategoriesByLanguage(language),
          });
        }

        if (segments.length === 2 && segments[1] === "news") {
          return await handleLanguageNews(req, language, null, url);
        }

        if (segments.length === 3 && segments[1] === "news") {
          return await handleLanguageNews(req, language, segments[2]!, url);
        }

        if (segments.length === 3 && segments[1] === "browse") {
          return await handleBrowse(req, language, segments[2]!, url);
        }

        if (segments.length === 2 && segments[1] === "digest") {
          const rawPer = Number(url.searchParams.get("perCategory") ?? 4);
          const perCategory = Math.min(
            Math.max(Math.floor(rawPer) || 4, 1),
            12,
          );
          const result = await getDigest(language, perCategory);
          return json(req, result);
        }

        if (segments.length === 2 && segments[1] === "general") {
          const rawLimit = Number(url.searchParams.get("limit") ?? 20);
          const limit = Math.min(Math.max(Math.floor(rawLimit) || 20, 1), 50);
          const rawMode = (url.searchParams.get("mode") ?? "recent").toLowerCase();
          const mode = rawMode === "random" ? "random" : "recent";
          const result = await getGeneralFeed(language, limit, mode);
          return json(req, result);
        }

        if (segments.length === 2 && segments[1] === "sources") {
          const cat = url.searchParams.get("category");
          const filtered = SOURCES.filter(
            (s) => s.language === language && (!cat || s.category === cat),
          );
          return json(req, {
            language,
            count: filtered.length,
            sources: filtered.map((s) => ({
              name: s.name,
              category: s.category,
              homepage: s.homepage,
            })),
          });
        }

        if (segments.length === 2 && segments[1] === "all") {
          const day = getToday();
          const news = queryNews({ language, day });
          return json(req, { language, day, count: news.length, news });
        }

        if (segments.length === 3 && segments[1] === "refresh") {
          const denied = assertAdminAuthorized(req);
          if (denied) return denied;
          const category = segments[2];
          if (!category || !isCategory(category)) {
            return json(req, { error: "Invalid category", category }, 400);
          }
          const result = await scrapeBucket(language, category);
          return json(req, { language, category, day: getToday(), ...result });
        }

        if (segments.length === 2 && segments[1] === "sync") {
          const denied = assertAdminAuthorized(req);
          if (denied) return denied;
          const result = await syncLanguage(language);
          return json(req, { language, day: getToday(), ...result });
        }

        if (segments.length === 3 && segments[1] === "sync") {
          const denied = assertAdminAuthorized(req);
          if (denied) return denied;
          const category = segments[2];
          if (!category || !isCategory(category)) {
            return json(req, { error: "Invalid category", category }, 400);
          }
          const result = await syncBucket(language, category);
          return json(req, { language, category, day: getToday(), ...result });
        }
      }

      return json(req, { error: "Not Found", path: url.pathname }, 404);
    } catch (err) {
      console.error("[api] error en", url.pathname, err);
      return json(
        req,
        IS_PRODUCTION
          ? { error: "Internal Server Error" }
          : {
              error: "Internal Server Error",
              message: err instanceof Error ? err.message : String(err),
            },
        500,
      );
    }
  },
});

console.log(`AI News API en http://localhost:${server.port}`);
if (!ADMIN_ROUTES_OPEN) {
  console.log(
    "[api] rutas admin protegidas: usa ADMIN_API_TOKEN o ALLOW_OPEN_ADMIN_ROUTES=1 solo en local",
  );
}

if (/^(1|true|yes|on)$/i.test(process.env.SCRAPE_ON_START ?? "")) {
  console.log("[api] SCRAPE_ON_START activo → lanzando sync en background");
  kickoffBackgroundSync();
}

console.log(`  GET /es/news             -> top 10 noticias IA en español`);
console.log(`  GET /es/news/futbol      -> top 10 fútbol`);
console.log(`  GET /es/news/internacional`);
console.log(`  GET /es/news/tecnologia`);
console.log(`  GET /es/news/software`);
console.log(`  GET /es/news/hack`);
console.log(`  GET /en/news             -> top 10 noticias IA en inglés`);
console.log(`  GET /sources             -> fuentes configuradas`);
console.log(`  GET /refresh             -> fuerza scraping global`);
