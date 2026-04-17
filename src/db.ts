import { Database } from "bun:sqlite";
import { mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import type { Category, Language, NewsItem, StoredNewsItem } from "./types";

const DB_PATH = process.env.DB_PATH ?? "./data/news.db";

if (!existsSync(dirname(DB_PATH))) {
  mkdirSync(dirname(DB_PATH), { recursive: true });
}

export const db = new Database(DB_PATH, { create: true });

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    link TEXT NOT NULL UNIQUE,
    image TEXT NOT NULL DEFAULT '',
    pub_date TEXT NOT NULL DEFAULT '',
    scraped_at TEXT NOT NULL,
    scrape_day TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    category TEXT NOT NULL DEFAULT 'ia'
  );
`);

const ensureColumn = (table: string, column: string, definition: string): void => {
  const info = db
    .prepare<{ name: string }, []>(`PRAGMA table_info(${table})`)
    .all();
  if (!info.some((row) => row.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
};

ensureColumn("news", "language", "TEXT NOT NULL DEFAULT 'en'");
ensureColumn("news", "category", "TEXT NOT NULL DEFAULT 'ia'");

db.exec(`CREATE INDEX IF NOT EXISTS idx_scrape_day ON news(scrape_day);`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_source ON news(source);`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_pub_date ON news(pub_date);`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_lang_cat ON news(language, category);`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_lang_cat_day ON news(language, category, scrape_day);`);

/**
 * Devuelve la fecha actual en formato YYYY-MM-DD (UTC).
 */
export const getToday = (): string => {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Inserta o ignora (si el link ya existe) noticias recibidas.
 * Devuelve cuántas filas se insertaron realmente.
 */
export const insertNews = (items: NewsItem[]): number => {
  if (items.length === 0) return 0;

  const scrapedAt = new Date().toISOString();
  const scrapeDay = getToday();

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO news
      (source, title, description, link, image, pub_date, scraped_at, scrape_day, language, category)
    VALUES
      ($source, $title, $description, $link, $image, $pub_date, $scraped_at, $scrape_day, $language, $category)
  `);

  const insertMany = db.transaction((rows: NewsItem[]) => {
    let inserted = 0;
    for (const row of rows) {
      const res = stmt.run({
        $source: row.source,
        $title: row.title,
        $description: row.description,
        $link: row.link,
        $image: row.image,
        $pub_date: row.pubDate,
        $scraped_at: scrapedAt,
        $scrape_day: scrapeDay,
        $language: row.language,
        $category: row.category,
      });
      if (res.changes > 0) inserted++;
    }
    return inserted;
  });

  return insertMany(items);
};

interface RawNewsRow {
  id: number;
  source: string;
  title: string;
  description: string;
  link: string;
  image: string;
  pub_date: string;
  scraped_at: string;
  scrape_day: string;
  language: string;
  category: string;
}

const mapRow = (row: RawNewsRow): StoredNewsItem => ({
  id: row.id,
  source: row.source,
  title: row.title,
  description: row.description,
  link: row.link,
  image: row.image,
  pubDate: row.pub_date,
  scrapedAt: row.scraped_at,
  scrapeDay: row.scrape_day,
  language: row.language as Language,
  category: row.category as Category,
});

export interface NewsQuery {
  language?: Language;
  category?: Category;
  day?: string;
  source?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

const buildWhere = (
  q: Omit<NewsQuery, "limit" | "offset">,
): { sql: string; params: Record<string, string> } => {
  const where: string[] = [];
  const params: Record<string, string> = {};

  if (q.language) {
    where.push("language = $language");
    params.$language = q.language;
  }
  if (q.category) {
    where.push("category = $category");
    params.$category = q.category;
  }
  if (q.day) {
    where.push("scrape_day = $day");
    params.$day = q.day;
  }
  if (q.source) {
    where.push("source = $source");
    params.$source = q.source;
  }
  if (q.search) {
    where.push("(title LIKE $search OR description LIKE $search)");
    params.$search = `%${q.search}%`;
  }

  return {
    sql: where.length > 0 ? `WHERE ${where.join(" AND ")}` : "",
    params,
  };
};

/**
 * Consulta noticias por filtros. Sin día: trae cualquier día (ordenadas por pub_date).
 */
export const queryNews = (q: NewsQuery = {}): StoredNewsItem[] => {
  const { sql: whereSql, params } = buildWhere(q);
  const limitSql = q.limit ? `LIMIT ${Math.max(1, Math.floor(q.limit))}` : "";
  const offsetSql = q.offset ? `OFFSET ${Math.max(0, Math.floor(q.offset))}` : "";

  const sql = `
    SELECT id, source, title, description, link, image, pub_date, scraped_at, scrape_day, language, category
    FROM news
    ${whereSql}
    ORDER BY pub_date DESC, id DESC
    ${limitSql} ${offsetSql}
  `;

  return db.prepare<RawNewsRow, Record<string, string>>(sql).all(params).map(mapRow);
};

/**
 * Devuelve N noticias aleatorias de un idioma, intentando repartir entre
 * categorías. Se consulta por categoría tomando N/C resultados aleatorios
 * y luego se mezcla el resultado final. Pensado para la vista "General".
 */
export const queryRandomMix = (
  language: Language,
  limit: number,
  categories: Category[],
): StoredNewsItem[] => {
  if (categories.length === 0 || limit <= 0) return [];

  const perCategory = Math.max(1, Math.ceil(limit / categories.length));
  const collected: StoredNewsItem[] = [];

  for (const category of categories) {
    const rows = db
      .prepare<RawNewsRow, [Language, Category, number]>(
        `
        SELECT id, source, title, description, link, image, pub_date, scraped_at, scrape_day, language, category
        FROM news
        WHERE language = ? AND category = ?
        ORDER BY RANDOM()
        LIMIT ?
      `,
      )
      .all(language, category, perCategory)
      .map(mapRow);
    collected.push(...rows);
  }

  for (let i = collected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [collected[i], collected[j]] = [collected[j]!, collected[i]!];
  }

  return collected.slice(0, limit);
};

/**
 * Cantidad de noticias almacenadas para unos filtros dados.
 */
export const countNews = (q: Omit<NewsQuery, "limit" | "offset"> = {}): number => {
  const { sql: whereSql, params } = buildWhere(q);
  const sql = `SELECT COUNT(*) as c FROM news ${whereSql}`;
  const row = db.prepare<{ c: number }, Record<string, string>>(sql).get(params);
  return row?.c ?? 0;
};

/**
 * Ventana máxima de antigüedad permitida para las noticias almacenadas.
 * Cualquier noticia con `pub_date` (o en su defecto `scraped_at`) anterior a
 * esta ventana se elimina automáticamente tras cada scraping.
 */
export const MAX_AGE_DAYS = 3;

/**
 * Devuelve el ISO-8601 del instante "hace N días" en UTC. Usado para las
 * queries de limpieza y para filtrar RSS entrante.
 */
export const getCutoffIso = (days = MAX_AGE_DAYS): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
};

/**
 * Borra de la base de datos cualquier noticia cuya `pub_date` (o
 * `scraped_at` si la fecha de publicación está vacía) sea anterior al
 * corte configurado. Devuelve el número de filas borradas.
 */
export const purgeOldNews = (days = MAX_AGE_DAYS): number => {
  const cutoff = getCutoffIso(days);
  const res = db
    .prepare(
      `DELETE FROM news
       WHERE (pub_date != '' AND pub_date < $cutoff)
          OR (pub_date = '' AND scraped_at < $cutoff)`,
    )
    .run({ $cutoff: cutoff });
  return res.changes ?? 0;
};

/**
 * Borra de la BD todos los registros de una fuente concreta cuyo `link` NO
 * esté en el conjunto `keepLinks`. Usado por `syncSources` para eliminar
 * noticias que ya no aparecen en el RSS (p.ej. porque el medio las ha
 * retirado). Devuelve el número de filas borradas.
 *
 * Si `keepLinks` está vacío se considera que la fuente no devolvió nada y
 * se aborta el borrado (protección ante fallos puntuales del feed).
 */
export const deleteMissingForSource = (
  sourceName: string,
  keepLinks: string[],
): number => {
  if (keepLinks.length === 0) return 0;

  db.exec("DROP TABLE IF EXISTS _sync_keep");
  db.exec("CREATE TEMP TABLE _sync_keep (link TEXT PRIMARY KEY)");

  const insert = db.prepare("INSERT OR IGNORE INTO _sync_keep (link) VALUES (?)");
  const insertMany = db.transaction((links: string[]) => {
    for (const link of links) insert.run(link);
  });
  insertMany(keepLinks);

  const res = db
    .prepare(
      `DELETE FROM news
       WHERE source = $source
         AND link NOT IN (SELECT link FROM _sync_keep)`,
    )
    .run({ $source: sourceName });

  db.exec("DROP TABLE IF EXISTS _sync_keep");
  return res.changes ?? 0;
};

/**
 * Último timestamp de scraping para un bucket (language + category + día).
 */
export const getLastScrapeAt = (
  language: Language,
  category: Category,
  day: string = getToday(),
): string | null => {
  const row = db
    .prepare<{ last: string | null }, [Language, Category, string]>(
      `SELECT MAX(scraped_at) as last FROM news WHERE language = ? AND category = ? AND scrape_day = ?`,
    )
    .get(language, category, day);
  return row?.last ?? null;
};
