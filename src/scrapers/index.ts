import { fetchRssFeed } from "./rss";
import { SOURCES, getSourceByName, getSourcesBy } from "./sources";
import {
  buildScreenshotUrl,
  fetchOgImage,
  isBadImage,
  mapWithConcurrency,
  resolveArticleUrl,
} from "./og-image";
import {
  countNews,
  db,
  deleteMissingForSource,
  getLastScrapeAt,
  getToday,
  insertNews,
  purgeOldNews,
  queryNews,
  queryRandomMix,
} from "../db";
import type { Category, Language, NewsItem, ScrapeSource, StoredNewsItem } from "../types";

const CACHE_TTL_MS = 1000 * 60 * 60 * 3;
const OG_IMAGE_CONCURRENCY = 6;
const SHARED_IMAGE_THRESHOLD = 2;

/**
 * Marca como "imagen genérica" las URLs que aparecen repetidas en varios items
 * de la misma fuente (típico de agregadores que sirven el mismo logo/miniatura
 * para todos los artículos). Esas imágenes se vacían para forzar el fetch de
 * og:image desde el artículo real.
 */
const flagSharedImages = (items: NewsItem[]): void => {
  const counts = new Map<string, number>();
  for (const it of items) {
    if (!it.image) continue;
    const key = `${it.source}::${it.image}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const it of items) {
    if (!it.image) continue;
    const key = `${it.source}::${it.image}`;
    if ((counts.get(key) ?? 0) > SHARED_IMAGE_THRESHOLD) {
      it.image = "";
    }
  }
};

/**
 * Si el link viene de un agregador (Google News), intenta resolverlo al link
 * real del medio. Es crucial para que la UI abra la noticia directamente y
 * para que la extracción de og:image posterior funcione.
 */
const resolveAggregatorLinks = async (items: NewsItem[]): Promise<void> => {
  const toResolve = items.filter((it) => /news\.google\.com\//i.test(it.link));
  if (toResolve.length === 0) return;

  await mapWithConcurrency(toResolve, OG_IMAGE_CONCURRENCY, async (item) => {
    const resolved = await resolveArticleUrl(item.link);
    if (resolved && resolved !== item.link) item.link = resolved;
    return null;
  });
};

/**
 * Rellena la propiedad `image` haciendo fetch del og:image de la página cuando
 * el RSS no la incluye (o trae una miniatura genérica). Se ejecuta solo para
 * items afectados, con concurrencia limitada. Si sigue faltando usa el
 * fallback definido por la fuente (garantía de imagen siempre presente).
 */
const enrichMissingImages = async (items: NewsItem[]): Promise<void> => {
  flagSharedImages(items);

  const toEnrich = items.filter(
    (it) => (isBadImage(it.image) || !it.image) && it.link,
  );

  if (toEnrich.length > 0) {
    await mapWithConcurrency(toEnrich, OG_IMAGE_CONCURRENCY, async (item) => {
      const img = await fetchOgImage(item.link);
      if (img && !isBadImage(img)) item.image = img;
      else item.image = "";
      return null;
    });
  }

  for (const item of items) {
    if (item.image && !isBadImage(item.image)) continue;
    // Último recurso antes del favicon: screenshot via mshots (sirve para
    // medios con anti-bot que bloquean el fetch directo de og:image).
    const screenshot = buildScreenshotUrl(item.link);
    if (screenshot) {
      item.image = screenshot;
      continue;
    }
    const source = getSourceByName(item.source);
    item.image = source ? source.fallbackImage : "";
  }
};

export interface ScrapeSummary {
  inserted: number;
  totalFetched: number;
  purged: number;
  errors: { source: string; error: string }[];
}

export interface SyncSummary extends ScrapeSummary {
  deleted: number;
  deletedBySource: Record<string, number>;
  skippedSources: string[];
}

export interface EnrichSummary {
  scanned: number;
  linksUpdated: number;
  imagesUpdated: number;
  fallbacksApplied: number;
}

interface EnrichableRow {
  id: number;
  source: string;
  link: string;
  image: string;
}

/**
 * Revisa registros ya almacenados que tienen links de Google News o imágenes
 * genéricas y los actualiza resolviendo la URL real y extrayendo og:image.
 * Se puede disparar manualmente vía GET /enrich para arreglar datos antiguos
 * sin forzar un re-scrape.
 */
export const enrichStoredNews = async (limit = 400): Promise<EnrichSummary> => {
  const rows = db
    .prepare<EnrichableRow, [number]>(
      `
      SELECT id, source, link, image
      FROM news
      WHERE
        link LIKE '%news.google.com%'
        OR image = ''
        OR image LIKE '%lh3.googleusercontent.com%=s0-w%'
        OR image LIKE '%lh3.googleusercontent.com%=s%-w%-rw%'
        OR image LIKE '%s2/favicons%'
      ORDER BY id DESC
      LIMIT ?
    `,
    )
    .all(limit);

  const summary: EnrichSummary = {
    scanned: rows.length,
    linksUpdated: 0,
    imagesUpdated: 0,
    fallbacksApplied: 0,
  };

  if (rows.length === 0) return summary;

  const update = db.prepare(
    `UPDATE news SET link = $link, image = $image WHERE id = $id`,
  );

  const isPlaceholderImage = (img: string): boolean =>
    isBadImage(img) || /s2\/favicons/i.test(img);

  await mapWithConcurrency(rows, OG_IMAGE_CONCURRENCY, async (row) => {
    let link = row.link;
    let image = row.image;
    let linkChanged = false;
    let imageChanged = false;

    if (/news\.google\.com/i.test(link)) {
      const resolved = await resolveArticleUrl(link);
      if (resolved && resolved !== link && !/news\.google\.com/i.test(resolved)) {
        link = resolved;
        linkChanged = true;
      }
    }

    if (isPlaceholderImage(image)) {
      const img = await fetchOgImage(link);
      if (img && !isBadImage(img)) {
        image = img;
        imageChanged = true;
      }
    }

    if (isPlaceholderImage(image)) {
      const screenshot = buildScreenshotUrl(link);
      if (screenshot) {
        image = screenshot;
        imageChanged = true;
      }
    }

    if (isBadImage(image)) {
      const src = getSourceByName(row.source);
      if (src) {
        image = src.fallbackImage;
        imageChanged = true;
        summary.fallbacksApplied += 1;
      }
    }

    if (linkChanged || imageChanged) {
      try {
        update.run({ $id: row.id, $link: link, $image: image });
        if (linkChanged) summary.linksUpdated += 1;
        if (imageChanged) summary.imagesUpdated += 1;
      } catch {
        // Puede fallar si el nuevo link colisiona con el UNIQUE de otra fila.
      }
    }

    return null;
  });

  return summary;
};

/**
 * Scrapea un conjunto de fuentes y guarda resultados en SQLite. Usado tanto
 * para scrapear todas como para scrapear un bucket (idioma + categoría).
 */
const scrapeSources = async (sources: ScrapeSource[]): Promise<ScrapeSummary> => {
  const results = await Promise.allSettled(sources.map((s) => fetchRssFeed(s)));

  const allItems: NewsItem[] = [];
  const errors: { source: string; error: string }[] = [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i]!;
    const sourceName = sources[i]!.name;
    if (r.status === "fulfilled") {
      if (r.value.error) errors.push({ source: sourceName, error: r.value.error });
      allItems.push(...r.value.items);
    } else {
      errors.push({
        source: sourceName,
        error: r.reason instanceof Error ? r.reason.message : String(r.reason),
      });
    }
  }

  await resolveAggregatorLinks(allItems);
  await enrichMissingImages(allItems);
  const inserted = insertNews(allItems);
  const purged = purgeOldNews();

  return { inserted, errors, totalFetched: allItems.length, purged };
};

/**
 * Lanza el scraping de TODAS las fuentes configuradas (todas las categorías e idiomas).
 */
export const scrapeAllSources = (): Promise<ScrapeSummary> => scrapeSources(SOURCES);

/**
 * Lanza el scraping de las fuentes de un bucket concreto.
 */
export const scrapeBucket = (
  language: Language,
  category: Category,
): Promise<ScrapeSummary> => scrapeSources(getSourcesBy(language, category));

/**
 * Sincroniza un conjunto de fuentes:
 *  - Scrapea los RSS, enriquece imágenes y resuelve aggregators.
 *  - Inserta en la BD solo las noticias que no existen (por link UNIQUE).
 *  - Las que ya existen no se tocan (ni actualiza imagen, ni título, etc.).
 *  - Borra de la BD los registros de cada fuente que respondió correctamente
 *    cuyos links ya no aparecen en el RSS actual. Si una fuente falla (error
 *    HTTP, timeout, XML inválido…) no se borra nada de ella para no vaciar
 *    la BD por un fallo puntual del feed.
 *  - Al final purga los registros con más de 3 días.
 */
const syncSources = async (sources: ScrapeSource[]): Promise<SyncSummary> => {
  const results = await Promise.allSettled(sources.map((s) => fetchRssFeed(s)));

  const allItems: NewsItem[] = [];
  const errors: { source: string; error: string }[] = [];
  const linksBySource = new Map<string, string[]>();
  const skippedSources: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i]!;
    const sourceName = sources[i]!.name;

    if (r.status === "fulfilled") {
      if (r.value.error) {
        errors.push({ source: sourceName, error: r.value.error });
        skippedSources.push(sourceName);
        continue;
      }
      allItems.push(...r.value.items);
      linksBySource.set(
        sourceName,
        r.value.items.map((it) => it.link),
      );
    } else {
      errors.push({
        source: sourceName,
        error: r.reason instanceof Error ? r.reason.message : String(r.reason),
      });
      skippedSources.push(sourceName);
    }
  }

  await resolveAggregatorLinks(allItems);
  await enrichMissingImages(allItems);

  // Al resolver aggregator links los links pueden haber cambiado. Reagrupamos
  // para que el DELETE NOT IN use las URLs definitivas.
  const finalLinksBySource = new Map<string, string[]>();
  for (const item of allItems) {
    const arr = finalLinksBySource.get(item.source) ?? [];
    arr.push(item.link);
    finalLinksBySource.set(item.source, arr);
  }

  const inserted = insertNews(allItems);

  let deleted = 0;
  const deletedBySource: Record<string, number> = {};
  for (const [sourceName, links] of finalLinksBySource.entries()) {
    const removed = deleteMissingForSource(sourceName, links);
    if (removed > 0) {
      deleted += removed;
      deletedBySource[sourceName] = removed;
    }
  }

  const purged = purgeOldNews();

  return {
    inserted,
    totalFetched: allItems.length,
    purged,
    errors,
    deleted,
    deletedBySource,
    skippedSources,
  };
};

/**
 * Sincroniza todas las fuentes configuradas.
 */
export const syncAllSources = (): Promise<SyncSummary> => syncSources(SOURCES);

/**
 * Sincroniza todas las fuentes de un idioma.
 */
export const syncLanguage = (language: Language): Promise<SyncSummary> =>
  syncSources(SOURCES.filter((s) => s.language === language));

/**
 * Sincroniza las fuentes de un bucket concreto (idioma + categoría).
 */
export const syncBucket = (
  language: Language,
  category: Category,
): Promise<SyncSummary> => syncSources(getSourcesBy(language, category));

/**
 * Decide si el cache de un bucket sigue siendo válido.
 */
const isBucketFresh = (language: Language, category: Category): boolean => {
  const day = getToday();
  if (countNews({ language, category, day }) === 0) return false;
  const last = getLastScrapeAt(language, category, day);
  if (!last) return false;
  const lastMs = new Date(last).getTime();
  if (isNaN(lastMs)) return false;
  return Date.now() - lastMs < CACHE_TTL_MS;
};

/**
 * Ordena items por fecha de publicación (desc) y luego por id (desc) como tiebreaker.
 */
const sortByRecency = (items: StoredNewsItem[]): StoredNewsItem[] => {
  return [...items].sort((a, b) => {
    if (a.pubDate !== b.pubDate) return a.pubDate > b.pubDate ? -1 : 1;
    return b.id - a.id;
  });
};

/**
 * Selecciona hasta `limit` noticias garantizando que cada fuente configurada
 * aporte al menos 1 elemento si tiene alguna disponible.
 *
 * Estrategia:
 *  1. Agrupa por fuente y ordena cada grupo por fecha desc.
 *  2. Ronda 1: toma el más reciente de cada fuente con items.
 *  3. Rondas siguientes: round-robin entre fuentes hasta completar `limit`.
 */
const selectWithFairness = (
  items: StoredNewsItem[],
  sources: ScrapeSource[],
  limit: number,
): StoredNewsItem[] => {
  const grouped = new Map<string, StoredNewsItem[]>();
  for (const s of sources) grouped.set(s.name, []);
  for (const it of items) {
    const arr = grouped.get(it.source);
    if (arr) arr.push(it);
  }
  for (const [, arr] of grouped) {
    arr.sort((a, b) => {
      if (a.pubDate !== b.pubDate) return a.pubDate > b.pubDate ? -1 : 1;
      return b.id - a.id;
    });
  }

  const result: StoredNewsItem[] = [];
  const seen = new Set<number>();

  const rounds = Math.max(0, ...Array.from(grouped.values()).map((a) => a.length));
  for (let round = 0; round < rounds && result.length < limit; round++) {
    for (const [, arr] of grouped) {
      if (result.length >= limit) break;
      const item = arr[round];
      if (item && !seen.has(item.id)) {
        result.push(item);
        seen.add(item.id);
      }
    }
  }

  return result;
};

export interface TopNewsResult {
  fromCache: boolean;
  news: StoredNewsItem[];
  day: string;
  total: number;
  language: Language;
  category: Category;
}

/**
 * Devuelve las top N noticias de un idioma y categoría, garantizando que cada
 * fuente configurada para ese bucket aporte al menos 1 elemento (de hoy si es
 * posible; si una fuente no publicó hoy se usa el más reciente disponible).
 */
export const getTopNews = async (
  language: Language,
  category: Category,
  limit = 10,
): Promise<TopNewsResult> => {
  let fromCache = true;

  if (!isBucketFresh(language, category)) {
    fromCache = false;
    await scrapeBucket(language, category);
  }

  const day = getToday();
  const sources = getSourcesBy(language, category);

  const todayItems = queryNews({ language, category, day });
  let selected = selectWithFairness(todayItems, sources, limit);

  const coveredSources = new Set(selected.map((i) => i.source));
  const missingSources = sources.filter((s) => !coveredSources.has(s.name));

  if (missingSources.length > 0) {
    for (const missing of missingSources) {
      const [fallback] = queryNews({
        language,
        category,
        source: missing.name,
        limit: 1,
      });
      if (fallback && !selected.some((s) => s.id === fallback.id)) {
        selected.push(fallback);
      }
    }
  }

  selected = sortByRecency(selected).slice(0, limit);

  const total = countNews({ language, category, day });

  return { fromCache, news: selected, day, total, language, category };
};

export interface DigestSection {
  category: Category;
  total: number;
  news: StoredNewsItem[];
}

export interface DigestResult {
  language: Language;
  day: string;
  perCategory: number;
  sections: DigestSection[];
}

/**
 * Devuelve un "resumen" agrupando las N noticias más recientes de cada
 * categoría disponible en el idioma pedido. Pensado para la vista unificada
 * del frontend donde se muestra un bloque por sección.
 */
export const getDigest = async (
  language: Language,
  perCategory = 4,
): Promise<DigestResult> => {
  const day = getToday();
  const categories = Array.from(
    new Set(SOURCES.filter((s) => s.language === language).map((s) => s.category)),
  );

  const sections: DigestSection[] = [];

  for (const category of categories) {
    if (!isBucketFresh(language, category)) {
      await scrapeBucket(language, category);
    }
  }

  for (const category of categories) {
    const sources = getSourcesBy(language, category);
    const todayItems = queryNews({ language, category, day });
    let selected = selectWithFairness(todayItems, sources, perCategory);

    if (selected.length < perCategory) {
      const fallback = queryNews({
        language,
        category,
        limit: perCategory - selected.length,
      });
      for (const f of fallback) {
        if (!selected.some((s) => s.id === f.id)) selected.push(f);
      }
    }

    selected = sortByRecency(selected).slice(0, perCategory);

    sections.push({
      category,
      total: countNews({ language, category, day }),
      news: selected,
    });
  }

  return { language, day, perCategory, sections };
};

export interface GeneralResult {
  language: Language;
  day: string;
  limit: number;
  count: number;
  news: StoredNewsItem[];
}

/**
 * Feed "General": mezcla aleatoriamente noticias de TODAS las categorías
 * disponibles del idioma pedido, garantizando un mínimo por categoría pero
 * aleatorizando el orden final. Se refresca el scraping por bucket si el
 * cache del día está vencido, igual que en las vistas normales.
 */
export const getGeneralFeed = async (
  language: Language,
  limit = 20,
): Promise<GeneralResult> => {
  const categories = Array.from(
    new Set(SOURCES.filter((s) => s.language === language).map((s) => s.category)),
  );

  for (const category of categories) {
    if (!isBucketFresh(language, category)) {
      await scrapeBucket(language, category);
    }
  }

  const news = queryRandomMix(language, limit, categories);

  return {
    language,
    day: getToday(),
    limit,
    count: news.length,
    news,
  };
};
