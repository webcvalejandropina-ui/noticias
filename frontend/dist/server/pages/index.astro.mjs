import { e as createComponent, g as addAttribute, k as renderHead, l as renderSlot, r as renderTemplate, h as createAstro, m as maybeRenderHead, n as renderComponent, o as Fragment } from '../chunks/astro/server_CJiREjLT.mjs';
import 'piccolore';
import 'clsx';
/* empty css                                 */
export { renderers } from '../renderers.mjs';

const $$Astro$9 = createAstro();
const $$Layout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$9, $$props, $$slots);
  Astro2.self = $$Layout;
  const {
    title = "AI News \xB7 Agregador de noticias",
    description = "Las noticias m\xE1s relevantes del d\xEDa en IA, f\xFAtbol, internacional, tecnolog\xEDa, software y ciberseguridad."
  } = Astro2.props;
  return renderTemplate`<html lang="es"> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description"${addAttribute(description, "content")}><meta name="color-scheme" content="light"><meta name="theme-color" content="#000000"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><title>${title}</title>${renderHead()}</head> <body> ${renderSlot($$result, $$slots["default"])} </body></html>`;
}, "/app/src/layouts/Layout.astro", void 0);

const LANGUAGES$1 = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" }
];
const CATEGORIES_BY_LANG = {
  es: ["ia", "futbol", "internacional", "tecnologia", "software", "hack"],
  en: ["ia"]
};
const CATEGORY_LABELS = {
  ia: { es: "IA", en: "AI" },
  futbol: { es: "Fútbol", en: "Football" },
  internacional: { es: "Internacional", en: "International" },
  tecnologia: { es: "Tecnología", en: "Technology" },
  software: { es: "Software", en: "Software" },
  hack: { es: "Hack", en: "Hack" }
};
const categoryLabel = (cat, lang) => CATEGORY_LABELS[cat][lang];
const LANG_LABELS = {
  es: {
    title: "Noticias",
    subtitle: "Las noticias más relevantes del día, en castellano. 6 categorías, 15 fuentes de referencia y cache diario."
  },
  en: {
    title: "News",
    subtitle: "Today's most relevant AI news, curated from 9 reference English-language sources with daily caching."
  }
};
const UI_TEXT = {
  es: {
    search: "Buscar",
    searchPlaceholder: "Buscar por título o descripción…",
    allSources: "Todas las fuentes",
    results: (n) => n === 1 ? "1 resultado" : `${n.toLocaleString("es-ES")} resultados`,
    empty: "No hay noticias que coincidan con esos filtros todavía.",
    readMore: "Leer más",
    previous: "Anterior",
    next: "Siguiente",
    clearFilters: "Limpiar filtros",
    page: (c, t) => `Página ${c} de ${t}`,
    digest: "Resumen",
    digestSubtitle: "Un vistazo rápido a cada sección",
    viewAll: "Ver todas",
    byCategory: "Por categoría",
    general: "General",
    generalSubtitle: "Una mezcla aleatoria de todas las secciones del día"
  },
  en: {
    search: "Search",
    searchPlaceholder: "Search by title or description…",
    allSources: "All sources",
    results: (n) => n === 1 ? "1 result" : `${n.toLocaleString("en-US")} results`,
    empty: "No news match those filters yet.",
    readMore: "Read more",
    previous: "Previous",
    next: "Next",
    clearFilters: "Clear filters",
    page: (c, t) => `Page ${c} of ${t}`,
    digest: "Digest",
    digestSubtitle: "A quick look at every section",
    viewAll: "View all",
    byCategory: "By category",
    general: "General",
    generalSubtitle: "A shuffled mix from every section today"
  }
};

const $$Astro$8 = createAstro();
const $$Header = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$8, $$props, $$slots);
  Astro2.self = $$Header;
  const { language, category } = Astro2.props;
  const buildLangHref = (lang) => {
    const params = new URLSearchParams();
    params.set("lang", lang);
    params.set("cat", "ia");
    return `/?${params.toString()}`;
  };
  return renderTemplate`${maybeRenderHead()}<header class="site-header" data-astro-cid-3ef6ksr2> <div class="container site-header__inner" data-astro-cid-3ef6ksr2> <a${addAttribute(`/?lang=${language}&cat=${category}`, "href")} class="site-header__brand" data-astro-cid-3ef6ksr2> <span class="site-header__logo" aria-hidden="true" data-astro-cid-3ef6ksr2> <svg viewBox="0 0 32 32" width="28" height="28" data-astro-cid-3ef6ksr2> <rect width="32" height="32" rx="6" fill="#0070cc" data-astro-cid-3ef6ksr2></rect> <path d="M9 9h4l5 14h-4l-1-3h-4l-1 3H4L9 9zm2.5 4.5L10 18h3l-1.5-4.5z" fill="#fff" data-astro-cid-3ef6ksr2></path> </svg> </span> <span class="site-header__wordmark" data-astro-cid-3ef6ksr2> <span class="site-header__title" data-astro-cid-3ef6ksr2>AI News</span> <span class="site-header__tagline" data-astro-cid-3ef6ksr2>agregador · cache diario</span> </span> </a> <nav class="site-header__nav" aria-label="Idioma" data-astro-cid-3ef6ksr2> ${LANGUAGES$1.map((l) => renderTemplate`<a${addAttribute(buildLangHref(l.code), "href")}${addAttribute([
    "site-header__lang",
    l.code === language && "is-active"
  ], "class:list")}${addAttribute(l.code === language ? "page" : void 0, "aria-current")} data-astro-cid-3ef6ksr2> ${l.code.toUpperCase()} </a>`)} </nav> </div> </header> `;
}, "/app/src/components/Header.astro", void 0);

const $$Astro$7 = createAstro();
const $$Hero = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$7, $$props, $$slots);
  Astro2.self = $$Hero;
  const { language, category, total, sourcesCount, mode = "list" } = Astro2.props;
  const labels = LANG_LABELS[language];
  const t = UI_TEXT[language];
  const catLabel = categoryLabel(category, language);
  const todayLabel = language === "es" ? "Hoy" : "Today";
  const kicker = mode === "digest" ? `${todayLabel} \xB7 ${t.digest}` : mode === "general" ? `${todayLabel} \xB7 ${t.general}` : `${todayLabel} \xB7 ${catLabel}`;
  const subtitle = mode === "digest" ? t.digestSubtitle : mode === "general" ? t.generalSubtitle : labels.subtitle;
  const totalFormatted = total.toLocaleString(language === "es" ? "es-ES" : "en-US");
  return renderTemplate`${maybeRenderHead()}<section class="hero surface-dark-gradient" aria-label="Cabecera" data-astro-cid-bbe6dxrz> <div class="container hero__inner" data-astro-cid-bbe6dxrz> <p class="hero__kicker" data-astro-cid-bbe6dxrz> <span class="hero__dot" aria-hidden="true" data-astro-cid-bbe6dxrz></span> ${kicker} </p> <h1 class="hero__title display-xl" data-astro-cid-bbe6dxrz>${labels.title}</h1> <p class="hero__subtitle body-relaxed" data-astro-cid-bbe6dxrz>${subtitle}</p> <div class="hero__stats" role="list" data-astro-cid-bbe6dxrz> <div class="hero__stat" role="listitem" data-astro-cid-bbe6dxrz> <span class="hero__stat-value" data-astro-cid-bbe6dxrz>${totalFormatted}</span> <span class="hero__stat-label" data-astro-cid-bbe6dxrz> ${language === "es" ? "noticias indexadas" : "indexed articles"} </span> </div> <div class="hero__stat" role="listitem" data-astro-cid-bbe6dxrz> <span class="hero__stat-value" data-astro-cid-bbe6dxrz>${sourcesCount}</span> <span class="hero__stat-label" data-astro-cid-bbe6dxrz> ${language === "es" ? "fuentes activas" : "active sources"} </span> </div> <div class="hero__stat" role="listitem" data-astro-cid-bbe6dxrz> <span class="hero__stat-value" data-astro-cid-bbe6dxrz>24/7</span> <span class="hero__stat-label" data-astro-cid-bbe6dxrz> ${language === "es" ? "scraping + cache SQLite" : "scraping + SQLite cache"} </span> </div> </div> </div> </section> `;
}, "/app/src/components/Hero.astro", void 0);

const buildUrl = (state, overrides = {}) => {
  const merged = { ...state, ...overrides };
  const resetPage = overrides.language !== void 0 || overrides.category !== void 0 || overrides.q !== void 0 || overrides.source !== void 0 || overrides.view !== void 0;
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
const LANGUAGES = /* @__PURE__ */ new Set(["es", "en"]);
const CATEGORIES = /* @__PURE__ */ new Set([
  "ia",
  "futbol",
  "internacional",
  "tecnologia",
  "software",
  "hack"
]);
const parseState = (url) => {
  const langRaw = url.searchParams.get("lang") ?? "es";
  const language = LANGUAGES.has(langRaw) ? langRaw : "es";
  const catRaw = url.searchParams.get("cat") ?? "ia";
  const category = CATEGORIES.has(catRaw) ? catRaw : "ia";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const q = (url.searchParams.get("q") ?? "").trim();
  const source = (url.searchParams.get("source") ?? "").trim();
  const viewRaw = url.searchParams.get("view");
  const view = viewRaw === "digest" ? "digest" : viewRaw === "general" ? "general" : "list";
  return { language, category, page, q, source, view };
};

const $$Astro$6 = createAstro();
const $$FilterBar = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$6, $$props, $$slots);
  Astro2.self = $$FilterBar;
  const { state, sources } = Astro2.props;
  const { language, category, q, source, view } = state;
  const t = UI_TEXT[language];
  const availableCategories = CATEGORIES_BY_LANG[language];
  const hasFilters = Boolean(q || source);
  const isDigest = view === "digest";
  const isGeneral = view === "general";
  const isList = view === "list";
  return renderTemplate`${maybeRenderHead()}<section class="filters" aria-label="Filtros de búsqueda" data-astro-cid-svhkuxpx> <div class="container filters__inner" data-astro-cid-svhkuxpx> <nav class="filters__categories" aria-label="Categorías" data-astro-cid-svhkuxpx> ${CATEGORIES_BY_LANG[language].length > 1 && renderTemplate`<a${addAttribute(buildUrl(state, { view: "general" }), "href")}${addAttribute(["ps-pill", "filters__general-pill", isGeneral && "is-active"], "class:list")}${addAttribute(isGeneral ? "page" : void 0, "aria-current")} data-astro-cid-svhkuxpx> <span class="filters__general-dot" aria-hidden="true" data-astro-cid-svhkuxpx></span> ${t.general} </a>`} ${CATEGORIES_BY_LANG[language].length > 1 && renderTemplate`<a${addAttribute(buildUrl(state, { view: "digest" }), "href")}${addAttribute(["ps-pill", "filters__digest-pill", isDigest && "is-active"], "class:list")}${addAttribute(isDigest ? "page" : void 0, "aria-current")} data-astro-cid-svhkuxpx> <span class="filters__digest-dot" aria-hidden="true" data-astro-cid-svhkuxpx></span> ${t.digest} </a>`} ${availableCategories.map((cat) => renderTemplate`<a${addAttribute(buildUrl(state, { view: "list", category: cat, page: 1 }), "href")}${addAttribute(["ps-pill", isList && cat === category && "is-active"], "class:list")}${addAttribute(isList && cat === category ? "page" : void 0, "aria-current")} data-astro-cid-svhkuxpx> ${categoryLabel(cat, language)} </a>`)} </nav> ${isList && renderTemplate`<form class="filters__form" method="get" action="/" role="search" data-astro-cid-svhkuxpx> <input type="hidden" name="lang"${addAttribute(language, "value")} data-astro-cid-svhkuxpx> <input type="hidden" name="cat"${addAttribute(category, "value")} data-astro-cid-svhkuxpx> <label class="filters__search" data-astro-cid-svhkuxpx> <span class="visually-hidden" data-astro-cid-svhkuxpx>${t.search}</span> <svg class="filters__search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" data-astro-cid-svhkuxpx> <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" data-astro-cid-svhkuxpx></circle> <path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-astro-cid-svhkuxpx></path> </svg> <input type="search" name="q" class="ps-input filters__input"${addAttribute(t.searchPlaceholder, "placeholder")}${addAttribute(q, "value")} autocomplete="off" data-astro-cid-svhkuxpx> </label> ${sources.length > 1 && renderTemplate`<select name="source" class="ps-select filters__select"${addAttribute(t.allSources, "aria-label")} data-astro-cid-svhkuxpx> <option value="" data-astro-cid-svhkuxpx>${t.allSources}</option> ${sources.map((s) => renderTemplate`<option${addAttribute(s, "value")}${addAttribute(s === source, "selected")} data-astro-cid-svhkuxpx> ${s} </option>`)} </select>`} <button type="submit" class="ps-btn ps-btn--mini filters__submit" data-astro-cid-svhkuxpx> ${t.search} </button> ${hasFilters && renderTemplate`<a${addAttribute(buildUrl(state, { q: "", source: "", page: 1 }), "href")} class="filters__clear" data-astro-cid-svhkuxpx> ${t.clearFilters} </a>`} </form>`} </div> </section> `;
}, "/app/src/components/FilterBar.astro", void 0);

const $$Astro$5 = createAstro();
const $$NewsCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$5, $$props, $$slots);
  Astro2.self = $$NewsCard;
  const { item, language, eager = false, showCategory = true } = Astro2.props;
  const t = UI_TEXT[language];
  const catLabel = showCategory && item.category ? categoryLabel(item.category, language) : "";
  const formatDate = (iso) => {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "";
      return new Intl.DateTimeFormat(language === "es" ? "es-ES" : "en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).format(d);
    } catch {
      return "";
    }
  };
  const date = formatDate(item.pubDate);
  return renderTemplate`${maybeRenderHead()}<article class="news-card" data-astro-cid-ibl2wg7k> <a${addAttribute(item.link, "href")} class="news-card__link" target="_blank" rel="noopener noreferrer"${addAttribute(item.title, "aria-label")} data-astro-cid-ibl2wg7k> <div class="news-card__media" data-astro-cid-ibl2wg7k> <img${addAttribute(item.image, "src")} alt=""${addAttribute(eager ? "eager" : "lazy", "loading")} decoding="async" referrerpolicy="no-referrer" data-astro-cid-ibl2wg7k> ${catLabel && renderTemplate`<span${addAttribute(["ps-tag", "news-card__category", `news-card__category--${item.category}`], "class:list")}${addAttribute(catLabel, "aria-label")} data-astro-cid-ibl2wg7k> ${catLabel} </span>`} </div> <div class="news-card__body" data-astro-cid-ibl2wg7k> <div class="news-card__meta" data-astro-cid-ibl2wg7k> <span class="ps-tag ps-tag--blue" data-astro-cid-ibl2wg7k>${item.source}</span> ${date && renderTemplate`<span class="news-card__date" data-astro-cid-ibl2wg7k>${date}</span>`} </div> <h3 class="news-card__title" data-astro-cid-ibl2wg7k>${item.title}</h3> ${item.description && renderTemplate`<p class="news-card__description" data-astro-cid-ibl2wg7k>${item.description}</p>`} <span class="news-card__cta" data-astro-cid-ibl2wg7k> ${t.readMore} <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" data-astro-cid-ibl2wg7k> <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-ibl2wg7k></path> </svg> </span> </div> </a> </article> `;
}, "/app/src/components/NewsCard.astro", void 0);

const $$Astro$4 = createAstro();
const $$NewsGrid = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$4, $$props, $$slots);
  Astro2.self = $$NewsGrid;
  const { items, language } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<div class="news-grid" data-astro-cid-dtuulsrz> ${items.map((item, idx) => renderTemplate`${renderComponent($$result, "NewsCard", $$NewsCard, { "item": item, "language": language, "eager": idx < 3, "data-astro-cid-dtuulsrz": true })}`)} </div> `;
}, "/app/src/components/NewsGrid.astro", void 0);

const $$Astro$3 = createAstro();
const $$Pagination = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$3, $$props, $$slots);
  Astro2.self = $$Pagination;
  const { state, totalPages } = Astro2.props;
  const { page, language } = state;
  const t = UI_TEXT[language];
  const getPageItems = (current, total) => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const items = [];
    const window = 1;
    items.push(1);
    if (current - window > 2) items.push("\u2026");
    const start = Math.max(2, current - window);
    const end = Math.min(total - 1, current + window);
    for (let i = start; i <= end; i += 1) items.push(i);
    if (current + window < total - 1) items.push("\u2026");
    items.push(total);
    return items;
  };
  const pages = getPageItems(page, totalPages);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  return renderTemplate`${totalPages > 1 && renderTemplate`${maybeRenderHead()}<nav class="pagination" aria-label="Paginación" data-astro-cid-d776pwuy><a${addAttribute(hasPrev ? buildUrl(state, { page: page - 1 }) : "#", "href")}${addAttribute(["pagination__arrow", !hasPrev && "is-disabled"], "class:list")}${addAttribute(hasPrev ? void 0 : "true", "aria-disabled")}${addAttribute(hasPrev ? "prev" : void 0, "rel")} data-astro-cid-d776pwuy><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" data-astro-cid-d776pwuy><path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-d776pwuy></path></svg><span data-astro-cid-d776pwuy>${t.previous}</span></a><ul class="pagination__pages" role="list" data-astro-cid-d776pwuy>${pages.map(
    (p) => p === "\u2026" ? renderTemplate`<li class="pagination__ellipsis" aria-hidden="true" data-astro-cid-d776pwuy>
…
</li>` : renderTemplate`<li data-astro-cid-d776pwuy><a${addAttribute(buildUrl(state, { page: p }), "href")}${addAttribute(["pagination__page", p === page && "is-active"], "class:list")}${addAttribute(p === page ? "page" : void 0, "aria-current")} data-astro-cid-d776pwuy>${p}</a></li>`
  )}</ul><a${addAttribute(hasNext ? buildUrl(state, { page: page + 1 }) : "#", "href")}${addAttribute(["pagination__arrow", !hasNext && "is-disabled"], "class:list")}${addAttribute(hasNext ? void 0 : "true", "aria-disabled")}${addAttribute(hasNext ? "next" : void 0, "rel")} data-astro-cid-d776pwuy><span data-astro-cid-d776pwuy>${t.next}</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" data-astro-cid-d776pwuy><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-d776pwuy></path></svg></a></nav>`}`;
}, "/app/src/components/Pagination.astro", void 0);

const $$Astro$2 = createAstro();
const $$DigestSection = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$DigestSection;
  const { state, category, total, items } = Astro2.props;
  const { language } = state;
  const t = UI_TEXT[language];
  const label = categoryLabel(category, language);
  const viewAllHref = buildUrl(state, { view: "list", category, page: 1, q: "", source: "" });
  return renderTemplate`${maybeRenderHead()}<section class="digest-section"${addAttribute(label, "aria-label")} data-astro-cid-ol2h4bq4> <header class="digest-section__header" data-astro-cid-ol2h4bq4> <div class="digest-section__title-wrap" data-astro-cid-ol2h4bq4> <span class="digest-section__kicker" data-astro-cid-ol2h4bq4>${t.byCategory}</span> <h2 class="digest-section__title" data-astro-cid-ol2h4bq4>${label}</h2> </div> <div class="digest-section__meta" data-astro-cid-ol2h4bq4> <span class="ps-tag digest-section__count" data-astro-cid-ol2h4bq4>${t.results(total)}</span> <a${addAttribute(viewAllHref, "href")} class="ps-btn ps-btn--mini digest-section__view-all" data-astro-cid-ol2h4bq4> ${t.viewAll} <span aria-hidden="true" data-astro-cid-ol2h4bq4>→</span> </a> </div> </header> ${items.length === 0 ? renderTemplate`<p class="digest-section__empty" data-astro-cid-ol2h4bq4>${t.empty}</p>` : renderTemplate`<div class="digest-section__grid" data-astro-cid-ol2h4bq4> ${items.map((item, idx) => renderTemplate`${renderComponent($$result, "NewsCard", $$NewsCard, { "item": item, "language": language, "eager": idx < 2, "data-astro-cid-ol2h4bq4": true })}`)} </div>`} </section> `;
}, "/app/src/components/DigestSection.astro", void 0);

const $$Astro$1 = createAstro();
const $$Footer = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$Footer;
  const { language, apiUrl } = Astro2.props;
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  const copy = {
    es: {
      title: "API p\xFAblica y abierta",
      subtitle: "Scraping diario con cache SQLite, orquestado en Bun y servido v\xEDa Astro.",
      apiLabel: "Endpoint de la API",
      stack: "Bun \xB7 SQLite \xB7 Astro \xB7 Docker",
      rights: "Proyecto educativo. Todas las marcas pertenecen a sus propietarios."
    },
    en: {
      title: "Open public API",
      subtitle: "Daily scraping with SQLite cache, orchestrated with Bun and served via Astro.",
      apiLabel: "API endpoint",
      stack: "Bun \xB7 SQLite \xB7 Astro \xB7 Docker",
      rights: "Educational project. All trademarks belong to their owners."
    }
  }[language];
  return renderTemplate`${maybeRenderHead()}<footer class="site-footer" data-astro-cid-sz7xmlte> <div class="container site-footer__inner" data-astro-cid-sz7xmlte> <div class="site-footer__lead" data-astro-cid-sz7xmlte> <h2 class="display-s site-footer__title" data-astro-cid-sz7xmlte>${copy.title}</h2> <p class="site-footer__subtitle" data-astro-cid-sz7xmlte>${copy.subtitle}</p> </div> <div class="site-footer__meta" data-astro-cid-sz7xmlte> <p class="site-footer__meta-label" data-astro-cid-sz7xmlte>${copy.apiLabel}</p> <code class="site-footer__code" data-astro-cid-sz7xmlte>${apiUrl}</code> <p class="site-footer__stack" data-astro-cid-sz7xmlte>${copy.stack}</p> </div> </div> <div class="site-footer__bottom" data-astro-cid-sz7xmlte> <div class="container site-footer__bottom-inner" data-astro-cid-sz7xmlte> <span data-astro-cid-sz7xmlte>© ${year} · AI News Aggregator</span> <span class="site-footer__rights" data-astro-cid-sz7xmlte>${copy.rights}</span> </div> </div> </footer> `;
}, "/app/src/components/Footer.astro", void 0);

const API_URL = (process.env.API_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const PUBLIC_API_URL = (process.env.PUBLIC_API_URL ?? API_URL).replace(/\/+$/, "");
const fetchBrowse = async (params) => {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  qs.set("pageSize", String(params.pageSize));
  if (params.q) qs.set("q", params.q);
  if (params.source) qs.set("source", params.source);
  const url = `${API_URL}/${params.language}/browse/${params.category}${qs.size ? `?${qs.toString()}` : ""}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(
      `API request failed: ${res.status} ${res.statusText} @ ${url}`
    );
  }
  return await res.json();
};
const fetchDigest = async (language, perCategory = 4) => {
  const url = `${API_URL}/${language}/digest?perCategory=${perCategory}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(
      `Digest request failed: ${res.status} ${res.statusText} @ ${url}`
    );
  }
  return await res.json();
};
const fetchGeneral = async (language, limit = 20) => {
  const url = `${API_URL}/${language}/general?limit=${limit}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(
      `General request failed: ${res.status} ${res.statusText} @ ${url}`
    );
  }
  return await res.json();
};
const getPublicApiUrl = () => PUBLIC_API_URL;

const $$Astro = createAstro();
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  const state = parseState(Astro2.url);
  const t = UI_TEXT[state.language];
  const PAGE_SIZE = 12;
  const DIGEST_PER_CATEGORY = 4;
  const GENERAL_LIMIT = 20;
  let browseData = null;
  let digestData = null;
  let generalData = null;
  let fetchError = null;
  try {
    if (state.view === "digest") {
      digestData = await fetchDigest(state.language, DIGEST_PER_CATEGORY);
    } else if (state.view === "general") {
      generalData = await fetchGeneral(state.language, GENERAL_LIMIT);
    } else {
      browseData = await fetchBrowse({
        language: state.language,
        category: state.category,
        page: state.page,
        pageSize: PAGE_SIZE,
        q: state.q || void 0,
        source: state.source || void 0
      });
    }
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
  }
  const news = browseData?.news ?? [];
  const total = browseData?.total ?? 0;
  const totalPages = browseData?.totalPages ?? 1;
  const sources = browseData?.sources ?? [];
  const digestSections = digestData?.sections ?? [];
  const digestTotal = digestSections.reduce((acc, s) => acc + s.total, 0);
  const digestSourcesCount = digestSections.length;
  const generalNews = generalData?.news ?? [];
  const generalTotal = generalNews.length;
  const generalSourcesCount = new Set(generalNews.map((n) => n.source)).size;
  const heroTotal = state.view === "digest" ? digestTotal : state.view === "general" ? generalTotal : total;
  const heroSources = state.view === "digest" ? digestSourcesCount : state.view === "general" ? generalSourcesCount : sources.length;
  const pageTitle = state.view === "digest" ? `AI News \xB7 ${t.digest}` : state.view === "general" ? `AI News \xB7 ${t.general}` : `AI News \xB7 ${categoryLabel(state.category, state.language)}`;
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": pageTitle, "data-astro-cid-j7pv25f6": true }, { "default": async ($$result2) => renderTemplate` ${renderComponent($$result2, "Header", $$Header, { "language": state.language, "category": state.category, "data-astro-cid-j7pv25f6": true })} ${renderComponent($$result2, "Hero", $$Hero, { "language": state.language, "category": state.category, "total": heroTotal, "sourcesCount": heroSources, "mode": state.view, "data-astro-cid-j7pv25f6": true })} ${renderComponent($$result2, "FilterBar", $$FilterBar, { "state": state, "sources": sources, "data-astro-cid-j7pv25f6": true })} ${maybeRenderHead()}<main class="main surface-light-gradient" data-astro-cid-j7pv25f6> <div class="container main__inner" data-astro-cid-j7pv25f6> ${fetchError && renderTemplate`<div class="main__error" role="alert" data-astro-cid-j7pv25f6> <strong data-astro-cid-j7pv25f6>${state.language === "es" ? "Error cargando datos" : "Error loading data"}:</strong>${" "} ${fetchError} </div>`} ${!fetchError && state.view === "digest" && digestData && renderTemplate`${renderComponent($$result2, "Fragment", Fragment, { "data-astro-cid-j7pv25f6": true }, { "default": async ($$result3) => renderTemplate` <header class="main__header" data-astro-cid-j7pv25f6> <p class="main__count" data-astro-cid-j7pv25f6> <span class="main__count-value" data-astro-cid-j7pv25f6>${t.digest}</span> <span class="ps-tag" data-astro-cid-j7pv25f6> ${state.language === "es" ? `${digestSections.length} secciones` : `${digestSections.length} sections`} </span> </p> <p class="main__page-info" data-astro-cid-j7pv25f6> ${state.language === "es" ? `${digestData.perCategory} noticias por categor\xEDa` : `${digestData.perCategory} news per category`} </p> </header> ${digestSections.length === 0 && renderTemplate`<div class="main__empty" data-astro-cid-j7pv25f6> <p class="display-s" data-astro-cid-j7pv25f6>${t.empty}</p> </div>`}${digestSections.map((section) => renderTemplate`${renderComponent($$result3, "DigestSection", $$DigestSection, { "state": state, "category": section.category, "total": section.total, "items": section.news, "data-astro-cid-j7pv25f6": true })}`)}` })}`} ${!fetchError && state.view === "general" && generalData && renderTemplate`${renderComponent($$result2, "Fragment", Fragment, { "data-astro-cid-j7pv25f6": true }, { "default": async ($$result3) => renderTemplate` <header class="main__header" data-astro-cid-j7pv25f6> <p class="main__count" data-astro-cid-j7pv25f6> <span class="main__count-value" data-astro-cid-j7pv25f6>${t.general}</span> <span class="ps-tag" data-astro-cid-j7pv25f6> ${state.language === "es" ? `${generalNews.length} noticias al azar` : `${generalNews.length} random picks`} </span> </p> <p class="main__page-info" data-astro-cid-j7pv25f6>${t.generalSubtitle}</p> </header> ${generalNews.length === 0 ? renderTemplate`<div class="main__empty" data-astro-cid-j7pv25f6> <p class="display-s" data-astro-cid-j7pv25f6>${t.empty}</p> </div>` : renderTemplate`${renderComponent($$result3, "NewsGrid", $$NewsGrid, { "items": generalNews, "language": state.language, "data-astro-cid-j7pv25f6": true })}`}` })}`} ${!fetchError && state.view === "list" && renderTemplate`${renderComponent($$result2, "Fragment", Fragment, { "data-astro-cid-j7pv25f6": true }, { "default": async ($$result3) => renderTemplate` <header class="main__header" data-astro-cid-j7pv25f6> <p class="main__count" data-astro-cid-j7pv25f6> <span class="main__count-value" data-astro-cid-j7pv25f6>${t.results(total)}</span> ${(state.q || state.source) && renderTemplate`<span class="main__count-filters" data-astro-cid-j7pv25f6> ${state.q && renderTemplate`<span class="ps-tag" data-astro-cid-j7pv25f6> ${state.language === "es" ? "B\xFAsqueda" : "Search"}: “${state.q}”
</span>`} ${state.source && renderTemplate`<span class="ps-tag" data-astro-cid-j7pv25f6> ${state.language === "es" ? "Fuente" : "Source"}: ${state.source} </span>`} </span>`} </p> <p class="main__page-info" data-astro-cid-j7pv25f6>${t.page(state.page, totalPages)}</p> </header> ${news.length === 0 && renderTemplate`<div class="main__empty" data-astro-cid-j7pv25f6> <p class="display-s" data-astro-cid-j7pv25f6>${t.empty}</p> </div>`}${news.length > 0 && renderTemplate`${renderComponent($$result3, "NewsGrid", $$NewsGrid, { "items": news, "language": state.language, "data-astro-cid-j7pv25f6": true })}`}${renderComponent($$result3, "Pagination", $$Pagination, { "state": state, "totalPages": totalPages, "data-astro-cid-j7pv25f6": true })} ` })}`} </div> </main> ${renderComponent($$result2, "Footer", $$Footer, { "language": state.language, "apiUrl": getPublicApiUrl(), "data-astro-cid-j7pv25f6": true })} ` })} `;
}, "/app/src/pages/index.astro", void 0);

const $$file = "/app/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
