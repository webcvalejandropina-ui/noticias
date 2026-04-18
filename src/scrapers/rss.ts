import { XMLParser } from "fast-xml-parser";
import * as cheerio from "cheerio";
import type { NewsItem, ScrapeSource, ScrapeResult } from "../types";
import { MAX_AGE_DAYS } from "../db";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

/**
 * Corte (en ms epoch) anterior al cual no aceptamos items del RSS. Evita
 * ensuciar la BD con entradas antiguas que algunos feeds todavía listan.
 */
const getMaxAgeCutoffMs = (): number =>
  Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: false,
  parseAttributeValue: false,
  trimValues: true,
  cdataPropName: "__cdata",
});

/**
 * Asegura que obtenemos una string desde un valor RSS que puede venir como
 * string, objeto con CDATA, array de strings, o undefined.
 */
const toText = (value: unknown): string => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join(" ");
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (typeof v.__cdata === "string") return v.__cdata;
    if (typeof v["#text"] === "string") return v["#text"];
    if (typeof v["@_url"] === "string") return v["@_url"];
    if (typeof v["@_href"] === "string") return v["@_href"];
  }
  return "";
};

/**
 * Convierte HTML a texto plano y trunca a `maxLen` caracteres.
 */
const htmlToText = (html: string, maxLen = 320): string => {
  if (!html) return "";
  const $ = cheerio.load(`<root>${html}</root>`);
  const text = $("root").text().replace(/\s+/g, " ").trim();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
};

/**
 * Intenta extraer la primera imagen de un bloque HTML.
 */
const extractImageFromHtml = (html: string): string => {
  if (!html) return "";
  const $ = cheerio.load(`<root>${html}</root>`);
  const src = $("img").first().attr("src");
  return src ?? "";
};

/**
 * Intenta extraer la imagen del item RSS probando los campos más habituales.
 */
const extractImage = (item: Record<string, unknown>): string => {
  const candidates: unknown[] = [
    item["media:content"],
    item["media:thumbnail"],
    item.enclosure,
    item["itunes:image"],
    item.image,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (Array.isArray(candidate)) {
      for (const c of candidate) {
        const url = toText(c);
        if (url.startsWith("http")) return url;
      }
    } else {
      const url = toText(candidate);
      if (url.startsWith("http")) return url;
    }
  }

  const htmlBlobs = [
    toText(item["content:encoded"]),
    toText(item.content),
    toText(item.description),
    toText(item.summary),
  ];

  for (const blob of htmlBlobs) {
    if (!blob) continue;
    const img = extractImageFromHtml(blob);
    if (img) return img;
  }

  return "";
};

/**
 * Extrae el link desde un item RSS. Soporta tanto Atom (<link href="..."/>) como RSS 2.0.
 */
const extractLink = (item: Record<string, unknown>): string => {
  const link = item.link;
  if (!link) return toText(item.guid);
  if (typeof link === "string") return link;
  if (Array.isArray(link)) {
    for (const l of link) {
      const text = toText(l);
      if (text.startsWith("http")) return text;
    }
  }
  return toText(link);
};

/**
 * Normaliza una fecha a ISO-8601. Si no se puede parsear devuelve "".
 */
const normalizeDate = (raw: string): string => {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "";
  return d.toISOString();
};

/**
 * Descarga y parsea un feed RSS/Atom, devolviendo las noticias normalizadas.
 */
export const fetchRssFeed = async (source: ScrapeSource): Promise<ScrapeResult> => {
  try {
    const res = await fetch(source.rssUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return { source: source.name, items: [], error: `HTTP ${res.status}` };
    }

    const xml = await res.text();
    const parsed = parser.parse(xml);

    const rssItems =
      parsed?.rss?.channel?.item ??
      parsed?.feed?.entry ??
      parsed?.["rdf:RDF"]?.item ??
      [];

    const itemsArr: Record<string, unknown>[] = Array.isArray(rssItems)
      ? rssItems
      : rssItems
        ? [rssItems]
        : [];

    const keywords = source.keywords?.map((k) => k.toLowerCase());
    const cutoffMs = getMaxAgeCutoffMs();

    const items: NewsItem[] = itemsArr
      .map((item) => {
        const title = toText(item.title).trim();
        const link = extractLink(item).trim();
        if (!title || !link) return null;

        const rawDescription =
          toText(item.description) ||
          toText(item.summary) ||
          toText(item["content:encoded"]) ||
          toText(item.content);

        const pubDateRaw =
          toText(item.pubDate) ||
          toText(item.published) ||
          toText(item.updated) ||
          toText(item["dc:date"]);

        const cleanTitle = htmlToText(title, 240);
        const cleanDescription = htmlToText(rawDescription, 320);

        if (keywords && keywords.length > 0) {
          const haystack = `${cleanTitle} ${cleanDescription}`.toLowerCase();
          if (!keywords.some((k) => haystack.includes(k))) return null;
        }

        const pubDateIso = normalizeDate(pubDateRaw);
        if (pubDateIso) {
          const pubMs = new Date(pubDateIso).getTime();
          if (!isNaN(pubMs) && pubMs < cutoffMs) return null;
        }

        const isGoogleNewsLink = /(?:^|\/\/)news\.google\.com\//i.test(link);

        return {
          source: source.name,
          title: cleanTitle,
          description: cleanDescription,
          link,
          image: isGoogleNewsLink ? "" : extractImage(item),
          pubDate: pubDateIso,
          language: source.language,
          category: source.category,
        } satisfies NewsItem;
      })
      .filter((x): x is NewsItem => x !== null);

    return { source: source.name, items };
  } catch (err) {
    return {
      source: source.name,
      items: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
};
