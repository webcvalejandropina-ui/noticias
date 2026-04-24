export type Language = "es" | "en";

export type Category =
  | "ia"
  | "futbol"
  | "internacional"
  | "tecnologia"
  | "software"
  | "hack"
  | "cine"
  | "medios-int";

export interface NewsItem {
  uuid: string;
  source: string;
  title: string;
  description: string;
  link: string;
  image: string;
  pubDate: string;
  scrapedAt: string;
  scrapeDay: string;
  language: Language;
  category: Category;
}

export interface BrowseResponse {
  language: Language;
  category: Category;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  filters: {
    q: string | null;
    source: string | null;
  };
  sources: string[];
  count: number;
  news: NewsItem[];
}

export interface SourceInfo {
  name: string;
  category: Category;
  homepage: string;
}

export interface SourcesResponse {
  language: Language;
  count: number;
  sources: SourceInfo[];
}

export interface DigestSection {
  category: Category;
  total: number;
  news: NewsItem[];
}

export interface DigestResponse {
  language: Language;
  day: string;
  perCategory: number;
  sections: DigestSection[];
}

export type GeneralMode = "recent" | "random";

export interface GeneralResponse {
  language: Language;
  day: string;
  limit: number;
  mode: GeneralMode;
  count: number;
  news: NewsItem[];
}
