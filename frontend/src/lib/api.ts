import type {
  BrowseResponse,
  Category,
  DigestResponse,
  GeneralMode,
  GeneralResponse,
  Language,
  SourcesResponse,
} from "./types";

const API_URL = (
  import.meta.env.API_URL ??
  process.env.API_URL ??
  "http://localhost:3000"
).replace(/\/+$/, "");

/**
 * URL pública que se muestra al usuario en el footer.
 * Si no se especifica, caemos en la interna (no recomendado fuera de Docker).
 */
const PUBLIC_API_URL = (
  import.meta.env.PUBLIC_API_URL ??
  process.env.PUBLIC_API_URL ??
  API_URL
).replace(/\/+$/, "");

export interface BrowseParams {
  language: Language;
  category: Category;
  page?: number;
  pageSize?: number;
  q?: string;
  source?: string;
}

/**
 * Consulta paginada al endpoint /:lang/browse/:category de la API Bun.
 * Siempre se ejecuta del lado del servidor (SSR).
 */
export const fetchBrowse = async (
  params: BrowseParams,
): Promise<BrowseResponse> => {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params.q) qs.set("q", params.q);
  if (params.source) qs.set("source", params.source);

  const url = `${API_URL}/${params.language}/browse/${params.category}${
    qs.size ? `?${qs.toString()}` : ""
  }`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(
      `API request failed: ${res.status} ${res.statusText} @ ${url}`,
    );
  }
  return (await res.json()) as BrowseResponse;
};

/**
 * Fuentes configuradas para un idioma (opcionalmente filtradas por categoría).
 */
export const fetchSources = async (
  language: Language,
  category?: Category,
): Promise<SourcesResponse> => {
  const qs = category ? `?category=${category}` : "";
  const url = `${API_URL}/${language}/sources${qs}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(
      `Sources request failed: ${res.status} ${res.statusText} @ ${url}`,
    );
  }
  return (await res.json()) as SourcesResponse;
};

/**
 * Resumen agrupado por categoría: N noticias frescas de cada sección del
 * idioma pedido. Una única petición SSR para dibujar toda la "home" de resumen.
 */
export const fetchDigest = async (
  language: Language,
  perCategory = 4,
): Promise<DigestResponse> => {
  const url = `${API_URL}/${language}/digest?perCategory=${perCategory}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(
      `Digest request failed: ${res.status} ${res.statusText} @ ${url}`,
    );
  }
  return (await res.json()) as DigestResponse;
};

/**
 * Feed "General": mezcla noticias de todas las categorías del idioma pedido.
 *
 * - `mode = "recent"` (por defecto): prioriza las más recientes en el tiempo
 *   manteniendo una mezcla por categoría (muestreo ponderado hacia lo nuevo
 *   y pequeño diversity shuffle para evitar rachas de la misma categoría).
 * - `mode = "random"`: comportamiento antiguo, aleatorio puro.
 */
export const fetchGeneral = async (
  language: Language,
  limit = 20,
  mode: GeneralMode = "recent",
): Promise<GeneralResponse> => {
  const qs = new URLSearchParams({ limit: String(limit), mode });
  const url = `${API_URL}/${language}/general?${qs.toString()}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(
      `General request failed: ${res.status} ${res.statusText} @ ${url}`,
    );
  }
  return (await res.json()) as GeneralResponse;
};

export const getApiUrl = (): string => API_URL;
export const getPublicApiUrl = (): string => PUBLIC_API_URL;
