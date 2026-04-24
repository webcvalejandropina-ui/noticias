/**
 * Tipos compartidos para la API de noticias.
 */

export type Language = "en" | "es";

export type Category =
  | "ia"
  | "futbol"
  | "internacional"
  | "tecnologia"
  | "software"
  | "hack"
  | "cine"
  | "medios-int";

export const ALL_CATEGORIES: Category[] = [
  "ia",
  "futbol",
  "internacional",
  "tecnologia",
  "software",
  "hack",
  "cine",
  "medios-int",
];

/**
 * Categorías virtuales: no tienen fuentes RSS propias, se construyen al vuelo
 * remezclando contenido que ya tenemos de otros buckets. Para cada categoría
 * virtual definimos su origen (idioma del cual se agregan las noticias).
 */
export const VIRTUAL_CATEGORIES: Partial<Record<Category, { sourceLanguage: Language }>> = {
  "medios-int": { sourceLanguage: "en" },
};

export const isVirtualCategory = (category: Category): boolean =>
  Object.prototype.hasOwnProperty.call(VIRTUAL_CATEGORIES, category);

export const ALL_LANGUAGES: Language[] = ["en", "es"];

export interface NewsItem {
  source: string;
  title: string;
  description: string;
  link: string;
  image: string;
  pubDate: string;
  language: Language;
  category: Category;
}

export interface StoredNewsItem extends NewsItem {
  uuid: string;
  scrapedAt: string;
  scrapeDay: string;
}

export interface ScrapeSource {
  name: string;
  rssUrl: string;
  homepage: string;
  fallbackImage: string;
  language: Language;
  category: Category;
  /**
   * Palabras clave para filtrar relevancia en fuentes cuyo feed RSS no está
   * filtrado por tema. Si se define, solo se aceptan items cuyo título o
   * descripción contengan al menos una coincidencia (case-insensitive).
   */
  keywords?: string[];
}

export interface ScrapeResult {
  source: string;
  items: NewsItem[];
  error?: string;
}
