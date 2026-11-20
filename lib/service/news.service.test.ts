import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockGetAuthenticatedAccount = vi.fn();
vi.mock("@/lib/service/account.service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/service/account.service")>(
    "@/lib/service/account.service"
  );
  return {
    ...actual,
    getAuthenticatedAccount: (...args: unknown[]) => mockGetAuthenticatedAccount(...args),
  };
});

import {
  AccountSetupRequiredError,
  UnauthenticatedError,
} from "@/lib/service/account.service";
import { __newsTestUtils, getMarketNews } from "./news.service";

const ORIGINAL_API_TOKEN = process.env.MARKETAUX_API_TOKEN;
const ORIGINAL_ALT_API_TOKEN = process.env.MARKETAUX_API_KEY;

function makeMarketauxItem(overrides: Record<string, unknown> = {}) {
  return {
    uuid: "uuid-1",
    title: "Fed signals steady rates as inflation cools",
    description: "Central bank commentary moved macro markets.",
    snippet: "Snippet text",
    url: "https://example.com/article-1",
    image_url: "https://example.com/image.jpg",
    published_at: "2026-04-20T10:30:00.000Z",
    source: "example.com",
    entities: [
      {
        symbol: "USD",
        name: "US Dollar",
        type: "currency",
        industry: "N/A",
        match_score: 32.1,
        sentiment_score: 0.18,
      },
    ],
    ...overrides,
  };
}

function mockFetchResponse(body: unknown, init?: { ok?: boolean; status?: number }) {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe("news.service (Marketaux)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __newsTestUtils.clearCache();
    process.env.MARKETAUX_API_TOKEN = "test-marketaux-token";
    delete process.env.MARKETAUX_API_KEY;
    mockGetAuthenticatedAccount.mockResolvedValue({
      account: { id: "acct-1", currency: "USD" },
      userId: "user-1",
    });
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (ORIGINAL_API_TOKEN === undefined) {
      delete process.env.MARKETAUX_API_TOKEN;
    } else {
      process.env.MARKETAUX_API_TOKEN = ORIGINAL_API_TOKEN;
    }
    if (ORIGINAL_ALT_API_TOKEN === undefined) {
      delete process.env.MARKETAUX_API_KEY;
    } else {
      process.env.MARKETAUX_API_KEY = ORIGINAL_ALT_API_TOKEN;
    }
    __newsTestUtils.clearCache();
  });

  it("normalizes a Marketaux item and handles missing optional metadata", () => {
    const normalized = __newsTestUtils.normalizeFeedItem(
      makeMarketauxItem({
        description: "",
        snippet: "",
        source: "",
        image_url: "",
        entities: [],
        uuid: "",
      }),
      "all"
    );

    expect(normalized).not.toBeNull();
    expect(normalized).toMatchObject({
      headline: "Fed signals steady rates as inflation cools",
      url: "https://example.com/article-1",
      publishedAt: "2026-04-20T10:30:00.000Z",
      summary: "No summary available from the news provider.",
      source: "Unknown source",
      imageUrl: null,
      relatedAsset: null,
      impact: null,
      impactReason: null,
    });
    expect(normalized?.id).toMatch(/^news_/);
  });

  it("drops items missing required headline, url, or publish time", () => {
    expect(__newsTestUtils.normalizeFeedItem(makeMarketauxItem({ title: "" }), "all")).toBeNull();
    expect(__newsTestUtils.normalizeFeedItem(makeMarketauxItem({ url: "" }), "all")).toBeNull();
    expect(
      __newsTestUtils.normalizeFeedItem(makeMarketauxItem({ published_at: "not-a-time" }), "all")
    ).toBeNull();
  });

  it("parses ISO dates and normalizes categories", () => {
    expect(__newsTestUtils.toIsoDate("2026-04-20T10:30:00.000Z")).toBe("2026-04-20T10:30:00.000Z");
    expect(__newsTestUtils.toIsoDate("bad")).toBeNull();

    expect(__newsTestUtils.normalizeCategory("FOREX")).toBe("forex");
    expect(__newsTestUtils.normalizeCategory("crypto")).toBe("crypto");
    expect(__newsTestUtils.normalizeCategory("stocks")).toBe("stocks");
    expect(__newsTestUtils.normalizeCategory("indices")).toBe("indices");
    expect(__newsTestUtils.normalizeCategory("commodities")).toBe("commodities");
    expect(__newsTestUtils.normalizeCategory("macro")).toBe("macro");
    expect(__newsTestUtils.normalizeCategory("unknown")).toBe("all");
  });

  it("infers supported market categories from Marketaux metadata and text", () => {
    expect(
      __newsTestUtils.inferCategoryFromItem(
        makeMarketauxItem({ entities: [{ symbol: "BTCUSD", type: "cryptocurrency", sentiment_score: 0.2 }] }),
        "all"
      )
    ).toBe("crypto");

    expect(
      __newsTestUtils.inferCategoryFromItem(
        makeMarketauxItem({ entities: [{ symbol: "EURUSD", type: "currency", sentiment_score: 0.1 }] }),
        "all"
      )
    ).toBe("forex");

    expect(
      __newsTestUtils.inferCategoryFromItem(
        makeMarketauxItem({ title: "Gold and oil climb as commodities rally", entities: [] }),
        "all"
      )
    ).toBe("commodities");

    expect(
      __newsTestUtils.inferCategoryFromItem(
        makeMarketauxItem({ entities: [{ symbol: "SPX", type: "index", sentiment_score: 0.1 }] }),
        "all"
      )
    ).toBe("indices");

    expect(
      __newsTestUtils.inferCategoryFromItem(
        makeMarketauxItem({ entities: [{ symbol: "AAPL", type: "equity", sentiment_score: 0.3 }] }),
        "all"
      )
    ).toBe("stocks");

    expect(
      __newsTestUtils.inferCategoryFromItem(
        makeMarketauxItem({ title: "Inflation cools as central bank holds rates", entities: [] }),
        "all"
      )
    ).toBe("macro");
  });

  it("infers defensible impact labels from provider sentiment scores", () => {
    expect(
      __newsTestUtils.inferImpact(
        makeMarketauxItem({ entities: [{ symbol: "AAPL", sentiment_score: 0.6 }] })
      ).impact
    ).toBe("High");

    expect(
      __newsTestUtils.inferImpact(
        makeMarketauxItem({ entities: [{ symbol: "AAPL", sentiment_score: 0.25 }] })
      ).impact
    ).toBe("Medium");

    expect(
      __newsTestUtils.inferImpact(
        makeMarketauxItem({ entities: [{ symbol: "AAPL", sentiment_score: 0.05 }] })
      ).impact
    ).toBe("Low");

    expect(__newsTestUtils.inferImpact(makeMarketauxItem({ entities: [] }))).toEqual({
      impact: null,
      reason: null,
    });

    const inferred = __newsTestUtils.inferImpact(
      makeMarketauxItem({ entities: [{ symbol: "AAPL", sentiment_score: 0.3 }] })
    );
    expect(inferred.reason).toContain("not a factual prediction");
  });

  it("deduplicates by URL keeping newest and sorts newest-first", () => {
    const older = __newsTestUtils.normalizeFeedItem(
      makeMarketauxItem({
        uuid: "old",
        title: "Older",
        url: "https://example.com/same",
        published_at: "2026-04-20T09:00:00.000Z",
      }),
      "all"
    )!;
    const newer = __newsTestUtils.normalizeFeedItem(
      makeMarketauxItem({
        uuid: "new",
        title: "Newer",
        url: "https://example.com/same",
        published_at: "2026-04-20T11:00:00.000Z",
      }),
      "all"
    )!;
    const other = __newsTestUtils.normalizeFeedItem(
      makeMarketauxItem({
        uuid: "other",
        title: "Other",
        url: "https://example.com/other",
        published_at: "2026-04-20T10:00:00.000Z",
      }),
      "all"
    )!;

    const result = __newsTestUtils.dedupeAndSort([older, other, newer]);

    expect(result).toHaveLength(2);
    expect(result[0].headline).toBe("Newer");
    expect(result[1].headline).toBe("Other");
  });

  it("matches search across headline, summary, source, category and related asset", () => {
    const article = __newsTestUtils.normalizeFeedItem(
      makeMarketauxItem({
        title: "EUR/USD rebounds",
        description: "Dollar weakens after inflation print",
        source: "fxdaily.com",
        entities: [{ symbol: "EURUSD", type: "currency", sentiment_score: 0.2 }],
      }),
      "forex"
    )!;

    expect(__newsTestUtils.matchesSearch(article, "eur/usd")).toBe(true);
    expect(__newsTestUtils.matchesSearch(article, "inflation")).toBe(true);
    expect(__newsTestUtils.matchesSearch(article, "fxdaily")).toBe(true);
    expect(__newsTestUtils.matchesSearch(article, "forex")).toBe(true);
    expect(__newsTestUtils.matchesSearch(article, "eurusd")).toBe(true);
    expect(__newsTestUtils.matchesSearch(article, "unrelated")).toBe(false);
  });

  it("builds Marketaux provider params using documented filters", () => {
    expect(__newsTestUtils.buildProviderParams("crypto", "").get("entity_types")).toBe("cryptocurrency");
    expect(__newsTestUtils.buildProviderParams("forex", "").get("entity_types")).toBe("currency");
    expect(__newsTestUtils.buildProviderParams("stocks", "").get("entity_types")).toBe("equity");
    expect(__newsTestUtils.buildProviderParams("indices", "").get("entity_types")).toBe("index");
    expect(__newsTestUtils.buildProviderParams("commodities", "").get("search")).toContain("gold");
    expect(__newsTestUtils.buildProviderParams("macro", "").get("search")).toContain("inflation");
    expect(__newsTestUtils.buildProviderParams("all", "").get("entity_types")).toBeNull();

    // Explicit user search takes precedence in the request query.
    expect(__newsTestUtils.buildProviderParams("macro", "bitcoin etf").get("search")).toBe("bitcoin etf");
  });

  it("integrates Marketaux response, normalizes feed, and uses server-side API token", async () => {
    const data = [
      makeMarketauxItem({
        uuid: "crypto-1",
        title: "BTC surges",
        url: "https://example.com/crypto",
        published_at: "2026-04-20T12:00:00.000Z",
        entities: [{ symbol: "BTCUSD", name: "Bitcoin USD", type: "cryptocurrency", sentiment_score: 0.5, match_score: 30 }],
      }),
      makeMarketauxItem({
        uuid: "missing-url",
        title: "Missing url",
        url: "",
        published_at: "2026-04-20T11:00:00.000Z",
      }),
    ];

    vi.mocked(fetch).mockResolvedValue(
      mockFetchResponse({ meta: { found: 10, returned: 2, limit: 3, page: 1 }, data })
    );

    const result = await getMarketNews({ category: "all", page: 1, pageSize: 12 });

    expect(mockGetAuthenticatedAccount).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(1);

    const calledUrl = new URL(vi.mocked(fetch).mock.calls[0][0] as string);
    expect(calledUrl.origin + calledUrl.pathname).toBe("https://api.marketaux.com/v1/news/all");
    expect(calledUrl.searchParams.get("api_token")).toBe("test-marketaux-token");
    expect(calledUrl.searchParams.get("language")).toBe("en");
    expect(calledUrl.searchParams.get("limit")).toBe("3");
    expect(calledUrl.searchParams.get("page")).toBe("1");

    expect(result.provider).toBe("Marketaux");
    expect(result.attribution).toContain("Marketaux");
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(3);
    expect(result.total).toBe(10);
    expect(result.hasMore).toBe(true);
    expect(result.articles).toHaveLength(1);
    expect(result.articles[0]).toMatchObject({
      id: "crypto-1",
      headline: "BTC surges",
      category: "crypto",
      source: "example.com",
      url: "https://example.com/crypto",
      relatedAsset: "BTCUSD",
    });
  });

  it("applies category filters/provider params and paginates with provider meta", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockFetchResponse({
        meta: { found: 4, returned: 1, limit: 3, page: 2 },
        data: [
          makeMarketauxItem({
            uuid: "fx-2",
            title: "GBP/USD update",
            url: "https://example.com/fx-2",
            published_at: "2026-04-20T11:00:00.000Z",
            entities: [{ symbol: "GBPUSD", type: "currency", sentiment_score: 0.2 }],
          }),
        ],
      })
    );

    const result = await getMarketNews({ category: "forex", page: 2, pageSize: 3 });

    const calledUrl = new URL(vi.mocked(fetch).mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get("entity_types")).toBe("currency");
    expect(calledUrl.searchParams.get("must_have_entities")).toBe("true");
    expect(calledUrl.searchParams.get("page")).toBe("2");

    expect(result.page).toBe(2);
    expect(result.total).toBe(4);
    expect(result.hasMore).toBe(false);
    expect(result.articles[0].category).toBe("forex");
  });

  it("passes user search to provider and reports empty results", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockFetchResponse({ meta: { found: 0, returned: 0, limit: 3, page: 1 }, data: [] })
    );

    const result = await getMarketNews({ category: "all", query: "nvidia earnings", page: 1, pageSize: 3 });

    const calledUrl = new URL(vi.mocked(fetch).mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get("search")).toBe("nvidia earnings");
    expect(result.total).toBe(0);
    expect(result.articles).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("handles Marketaux API errors, rate/usage limits, invalid JSON, and outages", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockFetchResponse({ error: { code: "usage_limit_reached", message: "Usage limit reached" } }, { ok: false, status: 402 })
    );
    await expect(getMarketNews()).rejects.toThrow(/usage limit/i);

    __newsTestUtils.clearCache();
    vi.mocked(fetch).mockResolvedValue(
      mockFetchResponse({ error: { code: "rate_limit_reached", message: "Rate limit reached" } }, { ok: false, status: 429 })
    );
    await expect(getMarketNews()).rejects.toThrow(/rate limit/i);

    __newsTestUtils.clearCache();
    vi.mocked(fetch).mockResolvedValue(
      mockFetchResponse({ error: { code: "invalid_api_token", message: "Invalid API token" } }, { ok: false, status: 401 })
    );
    await expect(getMarketNews()).rejects.toThrow(/rejected the api token/i);

    __newsTestUtils.clearCache();
    vi.mocked(fetch).mockResolvedValue(
      mockFetchResponse({ error: { code: "endpoint_access_restricted", message: "Restricted" } }, { ok: false, status: 403 })
    );
    await expect(getMarketNews()).rejects.toThrow(/restricted/i);

    __newsTestUtils.clearCache();
    vi.mocked(fetch).mockResolvedValue(
      mockFetchResponse({ error: { code: "malformed_parameters", message: "Bad params" } }, { ok: false, status: 400 })
    );
    await expect(getMarketNews()).rejects.toThrow(/bad params/i);

    __newsTestUtils.clearCache();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockRejectedValue(new Error("bad json")),
    } as unknown as Response);
    await expect(getMarketNews()).rejects.toThrow(/invalid response|returned an error/i);

    __newsTestUtils.clearCache();
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse({}, { ok: false, status: 503 }));
    await expect(getMarketNews()).rejects.toThrow(/temporarily unavailable|returned an error/i);

    __newsTestUtils.clearCache();
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));
    await expect(getMarketNews()).rejects.toThrow(/unable to reach/i);
  });

  it("requires authentication/account setup and server-side Marketaux API token configuration", async () => {
    mockGetAuthenticatedAccount.mockRejectedValueOnce(new UnauthenticatedError());
    await expect(getMarketNews()).rejects.toBeInstanceOf(UnauthenticatedError);

    mockGetAuthenticatedAccount.mockRejectedValueOnce(new AccountSetupRequiredError());
    await expect(getMarketNews()).rejects.toBeInstanceOf(AccountSetupRequiredError);

    mockGetAuthenticatedAccount.mockResolvedValueOnce({
      account: { id: "acct-1", currency: "USD" },
      userId: "user-1",
    });
    delete process.env.MARKETAUX_API_TOKEN;
    delete process.env.MARKETAUX_API_KEY;

    await expect(getMarketNews()).rejects.toThrow(/MARKETAUX_API_TOKEN/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses cached responses per request to avoid unnecessary repeated provider requests", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockFetchResponse({
        meta: { found: 1, returned: 1, limit: 3, page: 1 },
        data: [makeMarketauxItem({ uuid: "cached-1", url: "https://example.com/cached" })],
      })
    );

    const first = await getMarketNews({ category: "all", page: 1, pageSize: 3 });
    const second = await getMarketNews({ category: "all", page: 1, pageSize: 3 });

    expect(first.total).toBe(1);
    expect(second.total).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
