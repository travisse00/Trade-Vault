import "server-only";

import { getAuthenticatedAccount } from "@/lib/service/account.service";

export type NewsCategory =
  | "all"
  | "forex"
  | "crypto"
  | "stocks"
  | "indices"
  | "commodities"
  | "macro";

export type NewsImpact = "High" | "Medium" | "Low" | null;

export interface NormalizedNewsArticle {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string; // ISO string
  category: Exclude<NewsCategory, "all">;
  categoryLabel: string;
  relatedAsset: string | null;
  imageUrl: string | null;
  impact: NewsImpact;
  impactReason: string | null;
}

export interface NewsFeedResult {
  articles: NormalizedNewsArticle[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  provider: string;
  attribution: string | null;
  lastUpdated: string;
  warnings: string[];
}

export interface NewsFeedParams {
  category?: string | null;
  query?: string | null;
  page?: number | string | null;
  pageSize?: number | string | null;
}

const PROVIDER_NAME = "Marketaux";
const PROVIDER_ATTRIBUTION = "Market news provided by Marketaux.";
const MARKETAUX_ENDPOINT = "https://api.marketaux.com/v1/news/all";

// Marketaux free plan: 100 requests/day, 3 articles per news request (verified from Marketaux pricing/docs).
const DEFAULT_PAGE_SIZE = 3;
const MAX_PAGE_SIZE = 3;
const CACHE_TTL_MS = 10 * 60 * 1000; // reduce API usage/rate-limit pressure

const CATEGORY_LABELS: Record<Exclude<NewsCategory, "all">, string> = {
  forex: "Forex",
  crypto: "Crypto",
  stocks: "Stocks",
  indices: "Indices",
  commodities: "Commodities",
  macro: "Macro",
};

type CacheEntry = {
  expiresAt: number;
  result: NewsFeedResult;
};

const feedCache = new Map<string, CacheEntry>();

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeCategory(value?: string | null): NewsCategory {
  switch ((value ?? "").toLowerCase().trim()) {
    case "forex":
      return "forex";
    case "crypto":
      return "crypto";
    case "stocks":
      return "stocks";
    case "indices":
      return "indices";
    case "commodities":
      return "commodities";
    case "macro":
      return "macro";
    case "all":
    default:
      return "all";
  }
}

function clampPage(value: number | string | null | undefined): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num < 1) return 1;
  return Math.floor(num);
}

function clampPageSize(value: number | string | null | undefined): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.floor(num));
}

function getApiKey(): string {
  const key =
    process.env.MARKETAUX_API_TOKEN?.trim() ||
    process.env.MARKETAUX_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "Market news is not configured. Set the MARKETAUX_API_TOKEN environment variable on the server."
    );
  }
  return key;
}

function toIsoDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function hashId(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `news_${(hash >>> 0).toString(16)}`;
}

function getEntityRecords(item: Record<string, unknown>): Record<string, unknown>[] {
  if (!Array.isArray(item.entities)) return [];
  return item.entities.filter(
    (entity): entity is Record<string, unknown> =>
      !!entity && typeof entity === "object"
  );
}

function inferCategoryFromItem(
  item: Record<string, unknown>,
  requested: NewsCategory
): Exclude<NewsCategory, "all"> {
  const entities = getEntityRecords(item);
  const entityTypes = entities
    .map((entity) => safeString(entity.type).toLowerCase())
    .filter(Boolean);
  const industries = entities
    .map((entity) => safeString(entity.industry).toLowerCase())
    .filter(Boolean);

  const textBlob = [
    safeString(item.title),
    safeString(item.description),
    safeString(item.snippet),
    ...entityTypes,
    ...industries,
  ]
    .join(" ")
    .toLowerCase();

  if (
    entityTypes.includes("cryptocurrency") ||
    /\b(bitcoin|btc|ethereum|eth|crypto|altcoin|stablecoin|defi|token|blockchain)\b/.test(
      textBlob
    )
  ) {
    return "crypto";
  }

  if (
    entityTypes.includes("currency") ||
    /\b(forex|\bfx\b|currency pair|usd\/|eur\/|gbp\/|jpy\/|aud\/|cad\/|chf\/|exchange rate)\b/.test(
      textBlob
    )
  ) {
    return "forex";
  }

  if (
    industries.includes("energy") ||
    industries.includes("basic materials") ||
    /\b(gold|silver|oil|crude|wti|brent|natural gas|copper|wheat|corn|commodity|commodities)\b/.test(
      textBlob
    )
  ) {
    return "commodities";
  }

  if (
    entityTypes.includes("index") ||
    /\b(s&p 500|s&p|nasdaq 100|nasdaq composite|dow jones|ftse|dax|nikkei|hang seng|index|indices)\b/.test(
      textBlob
    )
  ) {
    return "indices";
  }

  if (
    entityTypes.includes("equity") ||
    entityTypes.includes("etf") ||
    entityTypes.includes("mutualfund")
  ) {
    return "stocks";
  }

  if (
    /\b(inflation|cpi|ppi|gdp|interest rate|central bank|federal reserve|fed\b|ecb\b|boj\b|boe\b|macro|unemployment|jobs report|monetary|fiscal|recession)\b/.test(
      textBlob
    )
  ) {
    return "macro";
  }

  if (/\b(stock|stocks|shares|equity|earnings|ipo|nasdaq|nyse|company)\b/.test(textBlob)) {
    return "stocks";
  }

  if (requested !== "all") return requested;
  return "macro";
}

function inferImpact(item: Record<string, unknown>): {
  impact: NewsImpact;
  reason: string | null;
} {
  const entities = getEntityRecords(item);
  const scores = entities
    .map((entity) => safeNumber(entity.sentiment_score))
    .filter((score): score is number => score !== null);

  if (scores.length === 0) {
    return { impact: null, reason: null };
  }

  const maxMagnitude = scores.reduce(
    (max, score) => Math.max(max, Math.abs(score)),
    0
  );
  const avgMagnitude =
    scores.reduce((sum, score) => sum + Math.abs(score), 0) / scores.length;
  const magnitude = Math.max(maxMagnitude, avgMagnitude);

  let impact: NewsImpact = "Low";
  if (magnitude >= 0.45) {
    impact = "High";
  } else if (magnitude >= 0.2) {
    impact = "Medium";
  }

  return {
    impact,
    reason:
      "Inferred from provider entity sentiment scores; not a factual prediction of market impact.",
  };
}

function extractRelatedAsset(item: Record<string, unknown>): string | null {
  const entities = getEntityRecords(item);
  if (entities.length === 0) return null;

  let best: { label: string; score: number } | null = null;
  for (const entity of entities) {
    const symbol = safeString(entity.symbol);
    const name = safeString(entity.name);
    const label = symbol || name;
    if (!label) continue;

    const score = safeNumber(entity.match_score) ?? 0;
    if (!best || score > best.score) {
      best = { label, score };
    }
  }

  if (best?.label) return best.label;

  const title = safeString(item.title);
  const pairMatch = /\b([A-Z]{2,5}\/[A-Z]{2,5})\b/.exec(title);
  return pairMatch ? pairMatch[1] : null;
}

function normalizeFeedItem(
  item: unknown,
  requested: NewsCategory
): NormalizedNewsArticle | null {
  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, unknown>;

  const headline = safeString(record.title);
  const url = safeString(record.url);
  const publishedAt = toIsoDate(record.published_at);

  if (!headline || !url || !publishedAt) {
    return null;
  }

  const summary =
    safeString(record.description) ||
    safeString(record.snippet) ||
    "No summary available from the news provider.";
  const source = safeString(record.source) || "Unknown source";
  const imageUrlRaw = safeString(record.image_url);
  const imageUrl = imageUrlRaw || null;
  const uuid = safeString(record.uuid);
  const category = inferCategoryFromItem(record, requested);
  const { impact, reason } = inferImpact(record);

  return {
    id: uuid || hashId(`${url}|${publishedAt}|${headline}`),
    headline,
    summary,
    source,
    url,
    publishedAt,
    category,
    categoryLabel: CATEGORY_LABELS[category],
    relatedAsset: extractRelatedAsset(record),
    imageUrl,
    impact,
    impactReason: impact ? reason : null,
  };
}

function dedupeAndSort(articles: NormalizedNewsArticle[]): NormalizedNewsArticle[] {
  const byKey = new Map<string, NormalizedNewsArticle>();

  for (const article of articles) {
    const key = article.url || article.id;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, article);
      continue;
    }

    if (new Date(article.publishedAt).getTime() > new Date(existing.publishedAt).getTime()) {
      byKey.set(key, article);
    }
  }

  return Array.from(byKey.values()).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

function matchesSearch(article: NormalizedNewsArticle, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;

  const haystack = [
    article.headline,
    article.summary,
    article.source,
    article.categoryLabel,
    article.relatedAsset ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

function buildProviderParams(
  category: NewsCategory,
  userQuery: string
): URLSearchParams {
  const params = new URLSearchParams();
  // Verified parameters from Marketaux docs: api_token, language, limit, page, entity_types,
  // must_have_entities, search, industries, countries, etc.
  params.set("language", "en");

  if (category === "crypto") {
    params.set("entity_types", "cryptocurrency");
    params.set("must_have_entities", "true");
  } else if (category === "forex") {
    params.set("entity_types", "currency");
    params.set("must_have_entities", "true");
  } else if (category === "stocks") {
    params.set("entity_types", "equity");
    params.set("must_have_entities", "true");
  } else if (category === "indices") {
    params.set("entity_types", "index");
    params.set("must_have_entities", "true");
  } else if (category === "commodities") {
    params.set("search", "commodity OR commodities OR gold OR oil OR crude OR \"natural gas\" OR wheat OR copper OR silver");
  } else if (category === "macro") {
    params.set("search", "inflation OR rates OR \"interest rate\" OR \"central bank\" OR economy OR GDP OR CPI OR recession OR unemployment");
  }

  if (userQuery) {
    // User search is explicit; prefer it over category keyword bias for macro/commodities.
    params.set("search", userQuery);
  }

  return params;
}

function buildCacheKey(category: NewsCategory, query: string, page: number, pageSize: number): string {
  return JSON.stringify({ category, query: query.toLowerCase(), page, pageSize });
}

async function fetchProviderPage(args: {
  category: NewsCategory;
  query: string;
  page: number;
  pageSize: number;
}): Promise<NewsFeedResult> {
  const cacheKey = buildCacheKey(args.category, args.query, args.page, args.pageSize);
  const cached = feedCache.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.result;
  }

  const apiKey = getApiKey();
  const url = new URL(MARKETAUX_ENDPOINT);
  const params = buildProviderParams(args.category, args.query);

  for (const [key, value] of params.entries()) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("limit", String(args.pageSize));
  url.searchParams.set("page", String(args.page));
  url.searchParams.set("api_token", apiKey);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new Error("Unable to reach the market news provider. Please try again later.");
  }

  let payload: unknown = null;
  let payloadParseFailed = false;
  try {
    payload = await response.json();
  } catch {
    payloadParseFailed = true;
    payload = null;
  }

  const payloadRecord =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const errorRecord =
    payloadRecord.error && typeof payloadRecord.error === "object"
      ? (payloadRecord.error as Record<string, unknown>)
      : null;
  const errorCode = safeString(errorRecord?.code).toLowerCase();
  const errorMessage = safeString(errorRecord?.message);

  if (!response.ok) {
    if (response.status === 429 || errorCode === "rate_limit_reached" || errorCode === "usage_limit_reached") {
      throw new Error(errorMessage || "Market news rate limit reached. Please try again shortly.");
    }
    if (response.status === 401 || errorCode === "invalid_api_token") {
      throw new Error("The market news provider rejected the API token. Please check the MARKETAUX_API_TOKEN configuration.");
    }
    if (response.status === 403 || errorCode === "endpoint_access_restricted") {
      throw new Error(errorMessage || "The configured Marketaux plan does not allow this news request.");
    }
    if (response.status === 400 || errorCode === "malformed_parameters") {
      throw new Error(errorMessage || "The market news provider rejected the request parameters.");
    }
    if (response.status === 503 || errorCode === "maintenance_mode") {
      throw new Error("The market news provider is temporarily unavailable. Please try again later.");
    }

    throw new Error(errorMessage || "The market news provider returned an error. Please try again later.");
  }

  if (payloadParseFailed) {
    throw new Error("Received an invalid response from the market news provider.");
  }

  if (errorRecord) {
    if (errorCode === "rate_limit_reached" || errorCode === "usage_limit_reached") {
      throw new Error(errorMessage || "Market news rate limit reached. Please try again shortly.");
    }
    throw new Error(errorMessage || "The market news provider returned an error. Please try again later.");
  }

  const dataItems = Array.isArray(payloadRecord.data) ? payloadRecord.data : [];
  const meta =
    payloadRecord.meta && typeof payloadRecord.meta === "object"
      ? (payloadRecord.meta as Record<string, unknown>)
      : {};

  const warnings: string[] = [];
  const normalized = dedupeAndSort(
    dataItems
      .map((item) => normalizeFeedItem(item, args.category))
      .filter((item): item is NormalizedNewsArticle => item !== null)
  );

  const filtered =
    args.category === "all"
      ? normalized
      : normalized.filter((article) => article.category === args.category);

  const returned = safeNumber(meta.returned) ?? normalized.length;
  const found = safeNumber(meta.found);
  const providerPage = safeNumber(meta.page) ?? args.page;
  const providerLimit = safeNumber(meta.limit) ?? args.pageSize;

  const total =
    found !== null
      ? Math.max(found, filtered.length)
      : filtered.length === 0
        ? 0
        : (providerPage - 1) * providerLimit + returned;

  let hasMore = false;
  if (found !== null) {
    hasMore = providerPage * providerLimit < found;
  } else {
    hasMore = returned >= providerLimit && filtered.length > 0;
  }

  if (normalized.length === 0 && dataItems.length === 0) {
    warnings.push("No articles were returned by the provider at this time.");
  } else if (filtered.length === 0 && normalized.length > 0 && args.category !== "all") {
    warnings.push("No articles matched the selected market category on this page. Try another page or category.");
  }

  const result: NewsFeedResult = {
    articles: filtered,
    total,
    page: providerPage,
    pageSize: providerLimit,
    hasMore,
    provider: PROVIDER_NAME,
    attribution: PROVIDER_ATTRIBUTION,
    lastUpdated: new Date().toISOString(),
    warnings,
  };

  feedCache.set(cacheKey, {
    expiresAt: now + CACHE_TTL_MS,
    result,
  });

  return result;
}

export async function getMarketNews(params: NewsFeedParams = {}): Promise<NewsFeedResult> {
  // Require authenticated trading account context, consistent with dashboard data access.
  await getAuthenticatedAccount();

  const category = normalizeCategory(params.category);
  const query = safeString(params.query);
  const page = clampPage(params.page);
  const pageSize = clampPageSize(params.pageSize);

  return fetchProviderPage({ category, query, page, pageSize });
}

type WatchlistNewsCategory = "FOREX" | "CRYPTO" | "STOCKS" | "INDICES" | "COMMODITIES";

function normalizeMatchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildAssetMatchTokens(symbol: string, name: string): string[] {
  const tokens = new Set<string>();
  const rawSymbol = symbol.trim();
  const rawName = name.trim();

  if (rawSymbol) {
    tokens.add(rawSymbol.toLowerCase());
    const compactSymbol = rawSymbol.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    if (compactSymbol) tokens.add(compactSymbol);
    for (const part of rawSymbol.split(/[^a-zA-Z0-9]+/)) {
      const cleaned = part.toLowerCase();
      if (cleaned.length >= 2) tokens.add(cleaned);
    }
  }

  if (rawName) {
    const loweredName = rawName.toLowerCase();
    if (loweredName.length >= 3) tokens.add(loweredName);
    for (const part of normalizeMatchText(rawName).split(" ")) {
      if (part.length >= 3) tokens.add(part);
    }
  }

  return Array.from(tokens).filter((token) => token.length >= 2);
}

function articleMatchesAsset(
  article: NormalizedNewsArticle,
  tokens: string[],
  category: WatchlistNewsCategory
): boolean {
  if (tokens.length === 0) return false;

  const categoryCompatible =
    (category === "FOREX" && article.category === "forex") ||
    (category === "CRYPTO" && article.category === "crypto") ||
    (category === "STOCKS" && article.category === "stocks") ||
    (category === "INDICES" && article.category === "indices") ||
    (category === "COMMODITIES" && article.category === "commodities");

  const relatedAsset = (article.relatedAsset ?? "").toLowerCase();
  const relatedCompact = relatedAsset.replace(/[^a-z0-9]+/g, "");
  const haystack = [article.headline, article.summary, article.source, article.relatedAsset ?? ""]
    .join(" ")
    .toLowerCase();
  const haystackCompact = haystack.replace(/[^a-z0-9]+/g, " ");

  for (const token of tokens) {
    const tokenCompact = token.replace(/[^a-z0-9]+/g, "");
    const directMatch =
      (relatedAsset && (relatedAsset === token || relatedAsset.includes(token))) ||
      (tokenCompact &&
        relatedCompact &&
        (relatedCompact === tokenCompact || relatedCompact.includes(tokenCompact))) ||
      haystack.includes(token) ||
      (tokenCompact && haystackCompact.includes(tokenCompact));

    if (directMatch) {
      return categoryCompatible || directMatch;
    }
  }

  // Fallback: no direct token match.
  return false;
}

/**
 * Returns relevant news from existing in-memory provider cache only.
 * This never triggers a Marketaux/provider request.
 */
export function getRelatedCachedNews(args: {
  symbol: string;
  name: string;
  category: WatchlistNewsCategory;
  limit?: number;
}): NormalizedNewsArticle[] {
  const tokens = buildAssetMatchTokens(args.symbol, args.name);
  if (tokens.length === 0) return [];

  const matches: NormalizedNewsArticle[] = [];
  for (const entry of feedCache.values()) {
    const articles = entry.result?.articles;
    if (!Array.isArray(articles)) continue;

    for (const article of articles) {
      if (articleMatchesAsset(article, tokens, args.category)) {
        matches.push(article);
      }
    }
  }

  const limit = Number.isFinite(args.limit) ? Math.max(1, Math.floor(args.limit as number)) : 20;
  return dedupeAndSort(matches).slice(0, limit);
}

export const __newsTestUtils = {
  normalizeFeedItem,
  dedupeAndSort,
  inferCategoryFromItem,
  inferImpact,
  extractRelatedAsset,
  matchesSearch,
  normalizeCategory,
  buildProviderParams,
  toIsoDate,
  clearCache() {
    feedCache.clear();
  },
  seedCacheForTest(key: string, result: NewsFeedResult, expiresAt = Date.now() + 60_000) {
    feedCache.set(key, { result, expiresAt });
  },
};
