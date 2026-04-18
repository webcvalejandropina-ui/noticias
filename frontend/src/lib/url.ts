import type { Category, Language } from "./types";

export type ViewMode = "list" | "digest" | "general";

export interface PageState {
  language: Language;
  category: Category;
  page: number;
  q: string;
  source: string;
  view: ViewMode;
}

/**
 * Construye una URL relativa para `/` cambiando los parámetros que se pasen,
 * preservando el resto del estado.
 */
export const buildUrl = (
  state: PageState,
  overrides: Partial<PageState> = {},
): string => {
  const merged: PageState = { ...state, ...overrides };

  // Si cambian filtros "de bloque" (idioma/categoría/q/source/view), reseteamos page.
  const resetPage =
    overrides.language !== undefined ||
    overrides.category !== undefined ||
    overrides.q !== undefined ||
    overrides.source !== undefined ||
    overrides.view !== undefined;

  const page = overrides.page ?? (resetPage ? 1 : merged.page);

  const params = new URLSearchParams();
  params.set("lang", merged.language);
  if (merged.view === "digest") {
    params.set("view", "digest");
  } else if (merged.view === "general") {
    params.set("view", "general");
  } else {
    params.set("cat", merged.category);
    if (page > 1) params.set("page", String(page));
    if (merged.q) params.set("q", merged.q);
    if (merged.source) params.set("source", merged.source);
  }

  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
};

const LANGUAGES = new Set<Language>(["es", "en"]);
const CATEGORIES = new Set<Category>([
  "ia",
  "futbol",
  "internacional",
  "tecnologia",
  "software",
  "hack",
]);

export const parseState = (url: URL): PageState => {
  const langRaw = url.searchParams.get("lang") ?? "es";
  const language: Language = LANGUAGES.has(langRaw as Language)
    ? (langRaw as Language)
    : "es";

  const catRaw = url.searchParams.get("cat") ?? "ia";
  const category: Category = CATEGORIES.has(catRaw as Category)
    ? (catRaw as Category)
    : "ia";

  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const q = (url.searchParams.get("q") ?? "").trim();
  const source = (url.searchParams.get("source") ?? "").trim();

  const viewRaw = url.searchParams.get("view");
  const view: ViewMode =
    viewRaw === "digest" ? "digest" : viewRaw === "general" ? "general" : "list";

  return { language, category, page, q, source, view };
};
