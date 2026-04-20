import type { Category, Language } from "./types";

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
];

export const CATEGORIES_BY_LANG: Record<Language, Category[]> = {
  es: ["ia", "futbol", "internacional", "tecnologia", "software", "hack"],
  en: ["ia"],
};

export const CATEGORY_LABELS: Record<Category, { es: string; en: string }> = {
  ia: { es: "IA", en: "AI" },
  futbol: { es: "Fútbol", en: "Football" },
  internacional: { es: "Internacional", en: "International" },
  tecnologia: { es: "Tecnología", en: "Technology" },
  software: { es: "Software", en: "Software" },
  hack: { es: "Hack", en: "Hack" },
};

export const categoryLabel = (cat: Category, lang: Language): string =>
  CATEGORY_LABELS[cat][lang];

export const LANG_LABELS: Record<Language, { title: string; subtitle: string }> = {
  es: {
    title: "Noticias",
    subtitle:
      "Las noticias más relevantes del día, en castellano. 6 categorías, 15 fuentes de referencia y cache diario.",
  },
  en: {
    title: "News",
    subtitle:
      "Today's most relevant AI news, curated from 9 reference English-language sources with daily caching.",
  },
};

export const UI_TEXT = {
  es: {
    search: "Buscar",
    searchPlaceholder: "Buscar por título o descripción…",
    allSources: "Todas las fuentes",
    results: (n: number): string =>
      n === 1 ? "1 resultado" : `${n.toLocaleString("es-ES")} resultados`,
    empty: "No hay noticias que coincidan con esos filtros todavía.",
    readMore: "Leer más",
    previous: "Anterior",
    next: "Siguiente",
    clearFilters: "Limpiar filtros",
    page: (c: number, t: number): string => `Página ${c} de ${t}`,
    digest: "Resumen",
    digestSubtitle: "Un vistazo rápido a cada sección",
    viewAll: "Ver todas",
    byCategory: "Por categoría",
    general: "General",
    generalSubtitle: "Lo más reciente de todas las secciones, mezclado por categoría",
  },
  en: {
    search: "Search",
    searchPlaceholder: "Search by title or description…",
    allSources: "All sources",
    results: (n: number): string =>
      n === 1 ? "1 result" : `${n.toLocaleString("en-US")} results`,
    empty: "No news match those filters yet.",
    readMore: "Read more",
    previous: "Previous",
    next: "Next",
    clearFilters: "Clear filters",
    page: (c: number, t: number): string => `Page ${c} of ${t}`,
    digest: "Digest",
    digestSubtitle: "A quick look at every section",
    viewAll: "View all",
    byCategory: "By category",
    general: "General",
    generalSubtitle: "The latest from every section, blended by category",
  },
} as const;
