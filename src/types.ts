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
  | "hack";

export const ALL_CATEGORIES: Category[] = [
  "ia",
  "futbol",
  "internacional",
  "tecnologia",
  "software",
  "hack",
];

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
  id: number;
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
