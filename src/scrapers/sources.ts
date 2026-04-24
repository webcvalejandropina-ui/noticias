import type { Category, Language, ScrapeSource } from "../types";
import { VIRTUAL_CATEGORIES } from "../types";

/**
 * Fuentes de noticias. Usamos RSS porque es estable, ligero y respetuoso con
 * los servidores de origen (evita abusar con scraping HTML).
 *
 * Cuando una fuente no tiene un feed filtrado por tema, usamos Google News
 * (`news.google.com/rss/search?q=site:…`) para obtener solo los artículos
 * relevantes para la categoría.
 *
 * `fallbackImage` se usa cuando el RSS no trae imagen y la página tampoco se
 * puede scrapear (p.ej. por Cloudflare) para garantizar que toda noticia tenga
 * imagen en la respuesta de la API. Se usan favicons de alta resolución via
 * Google S2, que están siempre disponibles y no golpean los sitios de origen.
 */
const favicon = (domain: string): string =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;

/**
 * Solo se usa como ÚLTIMO recurso cuando una fuente no expone RSS propio.
 * Google News sirve redirects (news.google.com/rss/articles/…) con miniaturas
 * genéricas compartidas; los feeds directos de cada medio son siempre
 * preferibles para tener imágenes reales y enlaces que no necesiten resolver.
 */
const googleNewsEn = (query: string): string =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;

/**
 * Variante en castellano de Google News RSS, útil para secciones de medios
 * españoles/hispanos que no publican un feed dedicado (p.ej. páginas de
 * categoría en Hipertextual como `/software/` o `/ciencia/`).
 */
const googleNewsEs = (query: string): string =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=es&gl=ES&ceid=ES:es`;

export const SOURCES: ScrapeSource[] = [
  {
    name: "MIT Technology Review",
    rssUrl: "https://www.technologyreview.com/topic/artificial-intelligence/feed",
    homepage: "https://www.technologyreview.com/topic/artificial-intelligence/",
    fallbackImage: favicon("technologyreview.com"),
    language: "en",
    category: "ia",
  },
  {
    name: "VentureBeat AI",
    rssUrl: "https://venturebeat.com/category/ai/feed/",
    homepage: "https://venturebeat.com/category/ai/",
    fallbackImage: favicon("venturebeat.com"),
    language: "en",
    category: "ia",
  },
  {
    name: "The Verge",
    rssUrl: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    homepage: "https://www.theverge.com/ai-artificial-intelligence",
    fallbackImage: favicon("theverge.com"),
    language: "en",
    category: "ia",
  },
  {
    name: "Wired",
    rssUrl: "https://www.wired.com/feed/tag/ai/latest/rss",
    homepage: "https://www.wired.com/tag/artificial-intelligence/",
    fallbackImage: favicon("wired.com"),
    language: "en",
    category: "ia",
  },
  {
    name: "AI News",
    rssUrl: "https://www.artificialintelligence-news.com/feed/",
    homepage: "https://www.artificialintelligence-news.com/",
    fallbackImage: favicon("artificialintelligence-news.com"),
    language: "en",
    category: "ia",
  },
  {
    name: "AI Trends",
    rssUrl: "https://www.aitrends.com/feed/",
    homepage: "https://www.aitrends.com/",
    fallbackImage: favicon("aitrends.com"),
    language: "en",
    category: "ia",
  },
  {
    name: "AI Magazine",
    rssUrl: googleNewsEn("site:aimagazine.com"),
    homepage: "https://aimagazine.com/",
    fallbackImage: favicon("aimagazine.com"),
    language: "en",
    category: "ia",
  },
  {
    name: "Analytics Insight",
    rssUrl: "https://www.analyticsinsight.net/feed",
    homepage: "https://www.analyticsinsight.net/",
    fallbackImage: favicon("analyticsinsight.net"),
    language: "en",
    category: "ia",
  },
  {
    name: "OpenAI Blog",
    rssUrl: "https://openai.com/news/rss.xml",
    homepage: "https://openai.com/news/",
    fallbackImage: favicon("openai.com"),
    language: "en",
    category: "ia",
  },

  {
    name: "Xataka IA",
    rssUrl: "https://www.xataka.com/tag/inteligencia-artificial/rss2.xml",
    homepage: "https://www.xataka.com/tag/inteligencia-artificial",
    fallbackImage: favicon("xataka.com"),
    language: "es",
    category: "ia",
  },
  {
    name: "El País IA",
    rssUrl:
      "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/tecnologia/portada",
    homepage: "https://elpais.com/noticias/inteligencia-artificial/",
    fallbackImage: favicon("elpais.com"),
    language: "es",
    category: "ia",
    keywords: [
      "inteligencia artificial",
      "chatgpt",
      "openai",
      "gemini",
      "anthropic",
      "claude",
      "copilot",
      "llm",
      "modelo de lenguaje",
      "deepmind",
      "nvidia",
      "algoritmo",
    ],
  },
  {
    name: "20 Minutos IA",
    rssUrl: "https://www.20minutos.es/rss/tecnologia/inteligencia-artificial/",
    homepage: "https://www.20minutos.es/tecnologia/inteligencia-artificial/",
    fallbackImage: favicon("20minutos.es"),
    language: "es",
    category: "ia",
  },
  {
    name: "Wired ES IA",
    rssUrl: "https://es.wired.com/feed/rss",
    homepage: "https://es.wired.com/tag/inteligencia-artificial",
    fallbackImage: favicon("es.wired.com"),
    language: "es",
    category: "ia",
    keywords: [
      "inteligencia artificial",
      "chatgpt",
      "openai",
      "gemini",
      "anthropic",
      "claude",
      "copilot",
      "llm",
      "algoritmo",
      "deepmind",
    ],
  },
  {
    name: "Telefónica IA",
    rssUrl: "https://www.telefonica.com/es/tag/inteligencia-artificial/feed",
    homepage: "https://www.telefonica.com/es/tag/inteligencia-artificial/",
    fallbackImage: favicon("telefonica.com"),
    language: "es",
    category: "ia",
  },
  {
    name: "Hipertextual IA",
    rssUrl: "https://hipertextual.com/inteligencia-artificial/feed/",
    homepage: "https://hipertextual.com/inteligencia-artificial/",
    fallbackImage: favicon("hipertextual.com"),
    language: "es",
    category: "ia",
  },

  {
    name: "Marca",
    rssUrl: "https://www.marca.com/rss/futbol.xml",
    homepage: "https://www.marca.com/",
    fallbackImage: favicon("marca.com"),
    language: "es",
    category: "futbol",
  },
  {
    name: "AS",
    rssUrl: "https://as.com/rss/futbol/portada.xml",
    homepage: "https://as.com/",
    fallbackImage: favicon("as.com"),
    language: "es",
    category: "futbol",
  },

  {
    name: "20 Minutos Internacional",
    rssUrl: "https://www.20minutos.es/rss/internacional/",
    homepage: "https://www.20minutos.es/internacional/",
    fallbackImage: favicon("20minutos.es"),
    language: "es",
    category: "internacional",
  },
  {
    name: "ABC Internacional",
    rssUrl: "https://www.abc.es/rss/feeds/abc_Internacional.xml",
    homepage: "https://www.abc.es/internacional/",
    fallbackImage: favicon("abc.es"),
    language: "es",
    category: "internacional",
  },

  {
    name: "Xataka Tecnología",
    rssUrl: "https://www.xataka.com/tag/tecnologia/rss2.xml",
    homepage: "https://www.xataka.com/tag/tecnologia",
    fallbackImage: favicon("xataka.com"),
    language: "es",
    category: "tecnologia",
  },
  {
    name: "ComputerHoy",
    rssUrl: "https://computerhoy.20minutos.es/rss",
    homepage: "https://computerhoy.20minutos.es/",
    fallbackImage: favicon("computerhoy.20minutos.es"),
    language: "es",
    category: "tecnologia",
  },
  {
    name: "Muy Interesante Tecnología",
    rssUrl: "https://www.muyinteresante.com/tecnologia/feed/",
    homepage: "https://www.muyinteresante.com/tecnologia/",
    fallbackImage: favicon("muyinteresante.com"),
    language: "es",
    category: "tecnologia",
  },
  {
    name: "Hipertextual Ciencia",
    rssUrl: googleNewsEs("site:hipertextual.com/ciencia"),
    homepage: "https://hipertextual.com/ciencia/",
    fallbackImage: favicon("hipertextual.com"),
    language: "es",
    category: "tecnologia",
  },

  {
    name: "Softzone",
    rssUrl: "https://www.softzone.es/feed/",
    homepage: "https://www.softzone.es/",
    fallbackImage: favicon("softzone.es"),
    language: "es",
    category: "software",
  },
  {
    name: "MuyComputer",
    rssUrl: "https://www.muycomputer.com/feed/",
    homepage: "https://www.muycomputer.com/",
    fallbackImage: favicon("muycomputer.com"),
    language: "es",
    category: "software",
  },
  {
    name: "Hipertextual Software",
    rssUrl: googleNewsEs("site:hipertextual.com/software"),
    homepage: "https://hipertextual.com/software/",
    fallbackImage: favicon("hipertextual.com"),
    language: "es",
    category: "software",
  },

  {
    name: "Hispasec Una al Día",
    rssUrl: "https://unaaldia.hispasec.com/feed",
    homepage: "https://unaaldia.hispasec.com/",
    fallbackImage: favicon("hispasec.com"),
    language: "es",
    category: "hack",
  },
  {
    name: "Genbeta Seguridad",
    rssUrl: "https://www.genbeta.com/categoria/seguridad/rss2.xml",
    homepage: "https://www.genbeta.com/categoria/seguridad",
    fallbackImage: favicon("genbeta.com"),
    language: "es",
    category: "hack",
  },
  {
    name: "The Hacker News",
    rssUrl: "https://feeds.feedburner.com/TheHackersNews",
    homepage: "https://thehackernews.com/",
    fallbackImage: favicon("thehackernews.com"),
    language: "es",
    category: "hack",
  },

  {
    name: "SensaCine",
    rssUrl: "https://www.sensacine.com/rss/noticias.xml",
    homepage: "https://www.sensacine.com/noticias/",
    fallbackImage: favicon("sensacine.com"),
    language: "es",
    category: "cine",
  },
  {
    name: "Hipertextual Cine/TV",
    rssUrl: "https://hipertextual.com/cine-television/feed/",
    homepage: "https://hipertextual.com/cine-television/",
    fallbackImage: favicon("hipertextual.com"),
    language: "es",
    category: "cine",
  },
  {
    name: "eCartelera",
    rssUrl: "https://www.ecartelera.com/rss/feed.xml",
    homepage: "https://www.ecartelera.com/noticias/",
    fallbackImage: favicon("ecartelera.com"),
    language: "es",
    category: "cine",
  },
  {
    name: "El Séptimo Arte",
    rssUrl: "https://www.elseptimoarte.net/rss.php",
    homepage: "https://www.elseptimoarte.net/noticias/",
    fallbackImage: favicon("elseptimoarte.net"),
    language: "es",
    category: "cine",
  },
  {
    name: "HobbyCine",
    rssUrl: "https://www.hobbyconsolas.com/rss/hobbycine.xml",
    homepage: "https://www.hobbyconsolas.com/hobbycine/",
    fallbackImage: favicon("hobbyconsolas.com"),
    language: "es",
    category: "cine",
  },
];

export const getSourceByName = (name: string): ScrapeSource | undefined =>
  SOURCES.find((s) => s.name === name);

export const getSourcesBy = (
  language: Language,
  category: Category,
): ScrapeSource[] => SOURCES.filter((s) => s.language === language && s.category === category);

export const getCategoriesByLanguage = (language: Language): Category[] => {
  const set = new Set<Category>();
  for (const s of SOURCES) {
    if (s.language === language) set.add(s.category);
  }
  // Categorías virtuales: se muestran en un idioma aunque no tengan fuentes
  // propias (p.ej. "medios-int" agrega en ES todo el contenido de EN).
  for (const [cat, def] of Object.entries(VIRTUAL_CATEGORIES)) {
    if (!def) continue;
    if (language === "es" && (cat as Category) === "medios-int") {
      set.add(cat as Category);
    }
  }
  return Array.from(set);
};
