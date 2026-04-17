import {
  enrichStoredNews,
  getDigest,
  getGeneralFeed,
  getTopNews,
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

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Cache-Control": "no-cache",
    },
  });

const isLanguage = (v: string): v is Language => (ALL_LANGUAGES as string[]).includes(v);
const isCategory = (v: string): v is Category => (ALL_CATEGORIES as string[]).includes(v);

const parseLimit = (raw: string | null, def = 10): number => {
  const n = Number(raw ?? def) || def;
  return Math.min(Math.max(Math.floor(n), 1), 50);
};

/**
 * Handler: /:lang/browse/:category
 * Paginación + búsqueda + filtro por fuente. Pensado para el frontend.
 */
const handleBrowse = (language: Language, categoryRaw: string, url: URL): Response => {
  const category = categoryRaw as Category;
  if (!isCategory(category)) {
    return json({ error: "Unknown category", category }, 400);
  }

  const sources = getSourcesBy(language, category);
  if (sources.length === 0) {
    return json({ error: "No sources for this bucket", language, category }, 404);
  }

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

  return json({
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
 * Si no se indica categoría, devuelve IA por defecto.
 */
const handleLanguageNews = async (
  language: Language,
  categoryRaw: string | null,
  url: URL,
): Promise<Response> => {
  const category = (categoryRaw ?? "ia") as Category;
  if (!isCategory(category)) {
    return json(
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

  return json({
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
  // El scraping y enriquecimiento pueden tardar >10s; subimos el idle timeout
  // para que Bun no cierre la conexión antes de tiempo.
  idleTimeout: 255,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (req.method !== "GET") {
      return json({ error: "Method Not Allowed" }, 405);
    }

    try {
      const path = url.pathname.replace(/\/+$/, "") || "/";
      const segments = path.split("/").filter(Boolean);

      if (path === "/") {
        return json({
          name: "AI News API",
          version: "2.0.0",
          description:
            "API agregadora de noticias multi-idioma y multi-categoría con cache diario en SQLite.",
          languages: ALL_LANGUAGES,
          categoriesByLanguage: Object.fromEntries(
            ALL_LANGUAGES.map((l) => [l, getCategoriesByLanguage(l)]),
          ),
          endpoints: {
            "GET /:lang/news": "Top 10 noticias del día (idioma + categoría IA por defecto)",
            "GET /:lang/news/:category":
              "Top 10 noticias de una categoría concreta (ia, futbol, internacional, tecnologia, software, hack)",
            "GET /:lang/news/:category?limit=N": "Personaliza el número (1-50)",
            "GET /:lang/browse/:category":
              "Listado paginado con filtros (page, pageSize, q, source) — pensado para UIs",
            "GET /:lang/digest?perCategory=N":
              "Resumen agrupado: N noticias por cada categoría disponible en el idioma",
            "GET /:lang/general?limit=N":
              "Feed General: mezcla aleatoriamente hasta 20 noticias de todas las categorías",
            "GET /:lang/categories": "Categorías disponibles para un idioma",
            "GET /:lang/sources?category=":
              "Fuentes disponibles para un idioma (opcionalmente filtradas por categoría)",
            "GET /sources": "Lista completa de fuentes configuradas",
            "GET /health": "Health check con nº de noticias de hoy",
            "GET /refresh": "Fuerza scraping de todas las fuentes (solo añade nuevas)",
            "GET /sync":
              "Sincroniza todas las fuentes: inserta nuevas, no modifica existentes, borra las que ya no están en el RSS",
            "GET /:lang/sync":
              "Sincroniza todas las fuentes de un idioma concreto",
            "GET /:lang/sync/:category":
              "Sincroniza las fuentes de un bucket (idioma + categoría)",
            "GET /enrich?limit=N":
              "Recorre registros con links de Google News o imágenes genéricas y resuelve URL + og:image",
            "GET /cleanup":
              "Borra manualmente las noticias con más de 3 días de antigüedad",
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
        return json({
          status: "ok",
          day: getToday(),
          newsToday: countNews({ day: getToday() }),
          uptimeSec: Math.round(process.uptime()),
        });
      }

      if (path === "/sources") {
        return json({
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
        const result = await scrapeAllSources();
        return json({
          day: getToday(),
          totalFetched: result.totalFetched,
          inserted: result.inserted,
          purged: result.purged,
          errors: result.errors,
        });
      }

      if (path === "/sync") {
        const result = await syncAllSources();
        return json({ day: getToday(), ...result });
      }

      if (path === "/enrich") {
        const rawLimit = Number(url.searchParams.get("limit") ?? 400);
        const limit = Math.min(Math.max(Math.floor(rawLimit) || 400, 1), 2000);
        const result = await enrichStoredNews(limit);
        return json({ day: getToday(), limit, ...result });
      }

      if (path === "/cleanup") {
        const purged = purgeOldNews();
        return json({ day: getToday(), purged });
      }

      if (path === "/news") {
        return await handleLanguageNews("en", "ia", url);
      }

      if (segments.length >= 1 && isLanguage(segments[0]!)) {
        const language = segments[0] as Language;

        if (segments.length === 2 && segments[1] === "categories") {
          return json({
            language,
            categories: getCategoriesByLanguage(language),
          });
        }

        if (segments.length === 2 && segments[1] === "news") {
          return await handleLanguageNews(language, null, url);
        }

        if (segments.length === 3 && segments[1] === "news") {
          return await handleLanguageNews(language, segments[2]!, url);
        }

        if (segments.length === 3 && segments[1] === "browse") {
          return handleBrowse(language, segments[2]!, url);
        }

        if (segments.length === 2 && segments[1] === "digest") {
          const rawPer = Number(url.searchParams.get("perCategory") ?? 4);
          const perCategory = Math.min(
            Math.max(Math.floor(rawPer) || 4, 1),
            12,
          );
          const result = await getDigest(language, perCategory);
          return json(result);
        }

        if (segments.length === 2 && segments[1] === "general") {
          const rawLimit = Number(url.searchParams.get("limit") ?? 20);
          const limit = Math.min(Math.max(Math.floor(rawLimit) || 20, 1), 50);
          const result = await getGeneralFeed(language, limit);
          return json(result);
        }

        if (segments.length === 2 && segments[1] === "sources") {
          const cat = url.searchParams.get("category");
          const filtered = SOURCES.filter(
            (s) => s.language === language && (!cat || s.category === cat),
          );
          return json({
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
          return json({ language, day, count: news.length, news });
        }

        if (segments.length === 3 && segments[1] === "refresh") {
          const category = segments[2];
          if (!category || !isCategory(category)) {
            return json({ error: "Invalid category", category }, 400);
          }
          const result = await scrapeBucket(language, category);
          return json({ language, category, day: getToday(), ...result });
        }

        if (segments.length === 2 && segments[1] === "sync") {
          const result = await syncLanguage(language);
          return json({ language, day: getToday(), ...result });
        }

        if (segments.length === 3 && segments[1] === "sync") {
          const category = segments[2];
          if (!category || !isCategory(category)) {
            return json({ error: "Invalid category", category }, 400);
          }
          const result = await syncBucket(language, category);
          return json({ language, category, day: getToday(), ...result });
        }
      }

      return json({ error: "Not Found", path: url.pathname }, 404);
    } catch (err) {
      console.error("[api] error en", url.pathname, err);
      return json(
        {
          error: "Internal Server Error",
          message: err instanceof Error ? err.message : String(err),
        },
        500,
      );
    }
  },
});

console.log(`AI News API en http://localhost:${server.port}`);
console.log(`  GET /es/news             -> top 10 noticias IA en español`);
console.log(`  GET /es/news/futbol      -> top 10 fútbol`);
console.log(`  GET /es/news/internacional`);
console.log(`  GET /es/news/tecnologia`);
console.log(`  GET /es/news/software`);
console.log(`  GET /es/news/hack`);
console.log(`  GET /en/news             -> top 10 noticias IA en inglés`);
console.log(`  GET /sources             -> fuentes configuradas`);
console.log(`  GET /refresh             -> fuerza scraping global`);
