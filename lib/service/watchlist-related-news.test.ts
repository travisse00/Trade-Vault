import { afterEach, describe, expect, it } from "vitest";
import { __newsTestUtils, getRelatedCachedNews, type NewsFeedResult } from "./news.service";

function makeFeedResult(articles: NewsFeedResult["articles"]): NewsFeedResult {
  return {
    articles,
    total: articles.length,
    page: 1,
    pageSize: articles.length || 3,
    hasMore: false,
    provider: "Marketaux",
    attribution: "Market news provided by Marketaux.",
    lastUpdated: new Date().toISOString(),
    warnings: [],
  };
}

describe("watchlist related cached news matching (cached data only)", () => {
  afterEach(() => {
    __newsTestUtils.clearCache();
  });

  it("returns empty array when cache is empty or no article matches (empty state)", () => {
    expect(
      getRelatedCachedNews({ symbol: "EURUSD", name: "Euro / US Dollar", category: "FOREX" })
    ).toEqual([]);

    __newsTestUtils.seedCacheForTest(
      "seed-1",
      makeFeedResult([
        {
          id: "n1",
          headline: "Gold rallies on inflation data",
          summary: "Commodities move higher.",
          source: "Example",
          url: "https://example.com/gold",
          publishedAt: "2026-04-20T10:00:00.000Z",
          category: "commodities",
          categoryLabel: "Commodities",
          relatedAsset: "XAUUSD",
          imageUrl: null,
          impact: "Medium",
          impactReason: "inferred",
        },
      ])
    );

    expect(
      getRelatedCachedNews({ symbol: "EURUSD", name: "Euro / US Dollar", category: "FOREX" })
    ).toEqual([]);
  });

  it("matches cached articles by symbol/name/related asset metadata and dedupes newest-first", () => {
    __newsTestUtils.seedCacheForTest(
      "feed-forex",
      makeFeedResult([
        {
          id: "fx-old",
          headline: "EURUSD slips in early trade",
          summary: "Dollar firms.",
          source: "FX Wire",
          url: "https://example.com/eurusd",
          publishedAt: "2026-04-20T08:00:00.000Z",
          category: "forex",
          categoryLabel: "Forex",
          relatedAsset: "EURUSD",
          imageUrl: null,
          impact: "Low",
          impactReason: "inferred",
        },
        {
          id: "fx-new",
          headline: "Euro / US Dollar rebounds after CPI",
          summary: "EURUSD recovers losses.",
          source: "FX Wire",
          url: "https://example.com/eurusd",
          publishedAt: "2026-04-20T12:00:00.000Z",
          category: "forex",
          categoryLabel: "Forex",
          relatedAsset: "EURUSD",
          imageUrl: null,
          impact: "High",
          impactReason: "inferred",
        },
        {
          id: "crypto",
          headline: "Bitcoin surges above key level",
          summary: "BTC momentum builds.",
          source: "Crypto Desk",
          url: "https://example.com/btc",
          publishedAt: "2026-04-20T11:00:00.000Z",
          category: "crypto",
          categoryLabel: "Crypto",
          relatedAsset: "BTCUSD",
          imageUrl: null,
          impact: "High",
          impactReason: "inferred",
        },
      ])
    );

    const matches = getRelatedCachedNews({
      symbol: "eurusd",
      name: "Euro / US Dollar",
      category: "FOREX",
    });

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      id: "fx-new",
      url: "https://example.com/eurusd",
      relatedAsset: "EURUSD",
    });

    const btc = getRelatedCachedNews({ symbol: "BTC", name: "Bitcoin", category: "CRYPTO" });
    expect(btc).toHaveLength(1);
    expect(btc[0].id).toBe("crypto");
  });

  it("aggregates matches across multiple cached feed entries without provider access", () => {
    __newsTestUtils.seedCacheForTest(
      "feed-a",
      makeFeedResult([
        {
          id: "aapl-1",
          headline: "Apple shares gain after earnings",
          summary: "AAPL beats expectations.",
          source: "Market Desk",
          url: "https://example.com/aapl-1",
          publishedAt: "2026-04-20T09:00:00.000Z",
          category: "stocks",
          categoryLabel: "Stocks",
          relatedAsset: "AAPL",
          imageUrl: null,
          impact: "Medium",
          impactReason: "inferred",
        },
      ])
    );
    __newsTestUtils.seedCacheForTest(
      "feed-b",
      makeFeedResult([
        {
          id: "aapl-2",
          headline: "Apple announces new product line",
          summary: "Investors react positively.",
          source: "Tech Wire",
          url: "https://example.com/aapl-2",
          publishedAt: "2026-04-20T13:00:00.000Z",
          category: "stocks",
          categoryLabel: "Stocks",
          relatedAsset: "AAPL",
          imageUrl: null,
          impact: "High",
          impactReason: "inferred",
        },
      ])
    );

    const matches = getRelatedCachedNews({ symbol: "AAPL", name: "Apple Inc.", category: "STOCKS" });
    expect(matches.map((m) => m.id)).toEqual(["aapl-2", "aapl-1"]);
  });
});
