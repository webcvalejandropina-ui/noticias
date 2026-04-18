import { scrapeAllSources, scrapeBucket } from "../scrapers";
import { countNews, getToday } from "../db";
import {
  ALL_CATEGORIES,
  ALL_LANGUAGES,
  type Category,
  type Language,
} from "../types";

/**
 * CLI de scraping. Uso:
 *   pnpm scrape                -> todas las fuentes
 *   pnpm scrape es             -> todas las fuentes en español
 *   pnpm scrape es ia          -> solo español + IA
 *   pnpm scrape en ia          -> solo inglés + IA
 */

const [langArg, catArg] = process.argv.slice(2);

const isLanguage = (v: string): v is Language => (ALL_LANGUAGES as string[]).includes(v);
const isCategory = (v: string): v is Category => (ALL_CATEGORIES as string[]).includes(v);

const start = Date.now();
console.log(`[scrape] iniciando para ${getToday()}…`);

if (!langArg) {
  const result = await scrapeAllSources();
  console.log(
    `[scrape] all | fetched=${result.totalFetched} inserted=${result.inserted} ms=${Date.now() - start}`,
  );
  for (const e of result.errors) console.log(`  error ${e.source}: ${e.error}`);
} else {
  if (!isLanguage(langArg)) {
    console.error(`[scrape] idioma inválido: ${langArg}. Usa: ${ALL_LANGUAGES.join(", ")}`);
    process.exit(1);
  }
  if (catArg && !isCategory(catArg)) {
    console.error(`[scrape] categoría inválida: ${catArg}. Usa: ${ALL_CATEGORIES.join(", ")}`);
    process.exit(1);
  }

  let categories: Category[];
  if (catArg) {
    categories = [catArg as Category];
  } else {
    categories = [...ALL_CATEGORIES];
  }
  for (const cat of categories) {
    const result = await scrapeBucket(langArg, cat);
    console.log(
      `[scrape] ${langArg}/${cat} | fetched=${result.totalFetched} inserted=${result.inserted}`,
    );
    for (const e of result.errors) console.log(`  error ${e.source}: ${e.error}`);
  }
  console.log(`[scrape] total ms=${Date.now() - start}`);
}

console.log(`[scrape] noticias hoy en DB: ${countNews({ day: getToday() })}`);
process.exit(0);
