"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ExternalLink,
  Filter,
  Globe,
  LoaderCircle,
  Newspaper,
  RefreshCw,
  Search,
  X,
  Clock3,
  Tag,
} from "lucide-react";

type NewsCategoryFilter =
  | "all"
  | "forex"
  | "crypto"
  | "stocks"
  | "indices"
  | "commodities"
  | "macro";

type NewsImpact = "High" | "Medium" | "Low" | null;

interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  category: Exclude<NewsCategoryFilter, "all">;
  categoryLabel: string;
  relatedAsset: string | null;
  imageUrl: string | null;
  impact: NewsImpact;
  impactReason: string | null;
}

interface NewsApiResponse {
  success: boolean;
  error?: string;
  articles?: NewsArticle[];
  total?: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
  provider?: string;
  attribution?: string | null;
  lastUpdated?: string;
  warnings?: string[];
}

const CATEGORY_OPTIONS: { value: NewsCategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "forex", label: "Forex" },
  { value: "crypto", label: "Crypto" },
  { value: "stocks", label: "Stocks" },
  { value: "indices", label: "Indices" },
  { value: "commodities", label: "Commodities" },
  { value: "macro", label: "Macro" },
];

const PAGE_SIZE = 12;

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatRelative(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "Just now";

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return "";
}

function ImpactBadge({ impact }: { impact: NewsImpact }) {
  if (!impact) return null;

  const classes =
    impact === "High"
      ? "border-[#4A4D52] bg-[#202225] text-[#E5E6E7]"
      : impact === "Medium"
        ? "border-[#3A3D41] bg-[#1D1F21] text-[#C4C6C8]"
        : "border-[#303236] bg-[#17191B] text-[#A7A9AC]";

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${classes}`}
      title="Inferred from provider sentiment strength/topic relevance; not a factual prediction of market impact."
    >
      {impact} impact
    </span>
  );
}

export default function MarketNewsPage() {
  const [category, setCategory] = useState<NewsCategoryFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [refreshToken, setRefreshToken] = useState(0);

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [provider, setProvider] = useState<string>("");
  const [attribution, setAttribution] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setQuery(searchInput.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchNews = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("category", category);
      if (query) params.set("q", query);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));

      const response = await fetch(`/api/news?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      const data = (await response.json()) as NewsApiResponse;

      if (requestId !== requestIdRef.current) return;

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to load market news.");
      }

      setArticles(Array.isArray(data.articles) ? data.articles : []);
      setTotal(typeof data.total === "number" ? data.total : 0);
      setHasMore(Boolean(data.hasMore));
      setProvider(data.provider || "");
      setAttribution(data.attribution ?? null);
      setLastUpdated(data.lastUpdated ?? null);
      setWarnings(Array.isArray(data.warnings) ? data.warnings : []);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (requestId !== requestIdRef.current) return;

      const message =
        err instanceof Error ? err.message : "Unable to load market news.";
      setError(message);
      setArticles([]);
      setTotal(0);
      setHasMore(false);
      setWarnings([]);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [category, query, page, refreshToken]);

  useEffect(() => {
    fetchNews();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchNews]);

  // Close detail panel on Escape
  useEffect(() => {
    if (!selectedArticle) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedArticle(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedArticle]);

  const rangeLabel = useMemo(() => {
    if (total === 0 || articles.length === 0) return "0 results";
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = start + articles.length - 1;
    return `${start}–${end} of ${total}`;
  }, [articles.length, page, total]);

  const hasFilters = category !== "all" || query.length > 0;

  function clearFilters() {
    setCategory("all");
    setSearchInput("");
    setQuery("");
    setPage(1);
  }

  function handleRefresh() {
    setRefreshToken((value) => value + 1);
  }

  return (
    <div className="min-h-screen min-w-0 p-4 text-white sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#303236] bg-[#202225] text-[#A7A9AC]">
              <Newspaper size={18} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Market News</h1>
              <p className="mt-1 text-sm text-[#77797C]">
                Latest headlines across forex, crypto, stocks, indices, commodities, and macro markets.
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-[#686A6D]">
            {provider ? `Source: ${provider}. ` : ""}
            {lastUpdated ? `Updated ${formatDateTime(lastUpdated)}.` : ""}
            {attribution ? ` ${attribution}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#303236] bg-[#17191B] px-3 text-sm text-[#A7A9AC] transition hover:bg-[#202225] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <section className="mt-6 rounded-xl border border-[#292B2E] bg-[#17191B] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex items-center gap-2 text-xs text-[#77797C]">
              <Filter size={14} />
              Market filters
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_OPTIONS.map((option) => {
                const active = option.value === category;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setCategory(option.value);
                      setPage(1);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                      active
                        ? "bg-[#F0F0F0] text-[#111213]"
                        : "border border-transparent text-[#92969A] hover:bg-[#202225] hover:text-white"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-full lg:max-w-md">
            <label htmlFor="news-search" className="mb-2 block text-xs text-[#77797C]">
              Search headlines, companies, assets, currency pairs, or topics
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-[#303236] bg-[#101112] px-3">
              <Search size={16} className="shrink-0 text-[#77797C]" />
              <input
                id="news-search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="e.g. EUR/USD, Bitcoin, inflation, NVIDIA"
                className="h-10 min-w-0 w-full bg-transparent text-sm text-white outline-none placeholder:text-[#686A6D]"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setQuery("");
                    setPage(1);
                  }}
                  aria-label="Clear search"
                  className="text-[#77797C] transition hover:text-white"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#292B2E] pt-4">
          <p className="text-xs text-[#77797C]">
            {loading ? "Loading news…" : `${rangeLabel}${hasFilters ? " (filtered)" : ""}`}
          </p>
          <div className="flex items-center gap-3">
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-medium text-[#A7A9AC] transition hover:text-white"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </section>

      {warnings.length > 0 && !error && (
        <div className="mt-4 rounded-lg border border-[#303236] bg-[#17191B] px-4 py-3 text-xs text-[#A7A9AC]">
          {warnings.join(" ")}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <p>{error}</p>
          <button
            type="button"
            onClick={handleRefresh}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-red-300 transition hover:text-white"
          >
            <RefreshCw size={13} />
            Try again
          </button>
        </div>
      )}

      <section className="mt-6">
        {loading && articles.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-[#292B2E] bg-[#17191B] px-5 py-16 text-center">
            <LoaderCircle size={22} className="animate-spin text-[#A7A9AC]" />
            <p className="mt-4 text-sm text-[#77797C]">Loading market news…</p>
          </div>
        ) : !loading && !error && articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-[#292B2E] bg-[#17191B] px-5 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#303236] bg-[#202225] text-[#A7A9AC]">
              <Newspaper size={20} />
            </div>
            <h2 className="mt-4 text-sm font-semibold text-white">
              {hasFilters ? "No matching news" : "No market news available"}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#77797C]">
              {hasFilters
                ? "We couldn't find headlines matching your selected market or search. Try a different filter or broaden your search."
                : "There are no headlines available right now. Try refreshing in a moment or check your news provider configuration."}
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 text-xs font-medium text-[#A7A9AC] transition hover:text-white"
              >
                Clear filters
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRefresh}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#A7A9AC] transition hover:text-white"
              >
                <RefreshCw size={13} />
                Refresh feed
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#292B2E] bg-[#17191B]">
            <div className="divide-y divide-[#292B2E]">
              {articles.map((article) => {
                const relative = formatRelative(article.publishedAt);
                return (
                  <article
                    key={article.id}
                    className="group p-4 transition hover:bg-[#1A1C1E] sm:p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#77797C]">
                          <span className="inline-flex items-center gap-1 rounded-md border border-[#303236] bg-[#202225] px-2 py-0.5 font-medium text-[#A7A9AC]">
                            <Tag size={11} />
                            {article.categoryLabel}
                          </span>
                          {article.relatedAsset && (
                            <span className="rounded-md border border-[#303236] bg-[#131516] px-2 py-0.5 text-[#C4C6C8]">
                              {article.relatedAsset}
                            </span>
                          )}
                          <ImpactBadge impact={article.impact} />
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedArticle(article)}
                          className="mt-2 block w-full text-left"
                        >
                          <h2 className="text-base font-semibold leading-6 text-white transition group-hover:text-[#F0F0F0] sm:text-[17px]">
                            {article.headline}
                          </h2>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#92969A]">
                            {article.summary}
                          </p>
                        </button>

                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#77797C]">
                          <span className="font-medium text-[#A7A9AC]">{article.source}</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock3 size={12} />
                            <time dateTime={article.publishedAt}>
                              {formatDateTime(article.publishedAt)}
                            </time>
                            {relative ? <span className="text-[#686A6D]">· {relative}</span> : null}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end sm:gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedArticle(article)}
                          className="inline-flex h-9 items-center rounded-lg border border-[#303236] px-3 text-xs font-medium text-[#A7A9AC] transition hover:bg-[#202225] hover:text-white"
                        >
                          Details
                        </button>
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-[#A7A9AC] transition hover:bg-[#202225] hover:text-white"
                        >
                          Read original
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 border-t border-[#292B2E] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-xs text-[#77797C]">{rangeLabel}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || loading}
                  className="inline-flex h-9 items-center rounded-lg border border-[#303236] px-3 text-xs font-medium text-[#A7A9AC] transition hover:bg-[#202225] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-2 text-xs text-[#77797C]">Page {page}</span>
                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!hasMore || loading}
                  className="inline-flex h-9 items-center rounded-lg border border-[#303236] px-3 text-xs font-medium text-[#A7A9AC] transition hover:bg-[#202225] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {selectedArticle && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedArticle(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="news-detail-title"
            className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-[#303236] bg-[#17191B] p-5 shadow-2xl sm:max-w-2xl sm:rounded-xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#77797C]">
                  <span className="inline-flex items-center gap-1 rounded-md border border-[#303236] bg-[#202225] px-2 py-0.5 font-medium text-[#A7A9AC]">
                    <Tag size={11} />
                    {selectedArticle.categoryLabel}
                  </span>
                  {selectedArticle.relatedAsset && (
                    <span className="rounded-md border border-[#303236] bg-[#131516] px-2 py-0.5 text-[#C4C6C8]">
                      {selectedArticle.relatedAsset}
                    </span>
                  )}
                  <ImpactBadge impact={selectedArticle.impact} />
                </div>
                <h2
                  id="news-detail-title"
                  className="mt-3 text-lg font-semibold leading-7 text-white sm:text-xl"
                >
                  {selectedArticle.headline}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedArticle(null)}
                aria-label="Close article details"
                className="shrink-0 rounded-lg p-2 text-[#85878A] transition hover:bg-[#252729] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#77797C]">
              <span className="inline-flex items-center gap-1.5">
                <Globe size={13} />
                <span className="font-medium text-[#A7A9AC]">{selectedArticle.source}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={13} />
                <time dateTime={selectedArticle.publishedAt}>
                  {formatDateTime(selectedArticle.publishedAt)}
                </time>
              </span>
            </div>

            <div className="mt-5 rounded-lg border border-[#292B2E] bg-[#131516] p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[#686A6D]">
                Summary
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#C4C6C8]">
                {selectedArticle.summary}
              </p>
            </div>

            {selectedArticle.impact && selectedArticle.impactReason && (
              <p className="mt-4 text-xs leading-5 text-[#77797C]">
                <span className="font-medium text-[#A7A9AC]">Impact label:</span>{" "}
                {selectedArticle.impactReason}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] leading-5 text-[#686A6D]">
                Full article content is available on the publisher&apos;s website.
              </p>
              <a
                href={selectedArticle.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#A7A9AC] px-4 text-sm font-semibold text-[#111213] transition hover:bg-[#C0C2C4]"
              >
                Read original article
                <ExternalLink size={15} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
