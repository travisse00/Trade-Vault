import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetMarketNews = vi.fn();

vi.mock("@/lib/service/news.service", () => ({
  getMarketNews: (...args: unknown[]) => mockGetMarketNews(...args),
}));

vi.mock("@/lib/service/account.service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/service/account.service")>(
    "@/lib/service/account.service"
  );
  return {
    ...actual,
  };
});

import {
  AccountSetupRequiredError,
  UnauthenticatedError,
} from "@/lib/service/account.service";
import { GET } from "./route";

function makeRequest(path: string) {
  return new Request(`http://localhost${path}`);
}

describe("GET /api/news", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns normalized news payload with query params", async () => {
    mockGetMarketNews.mockResolvedValue({
      articles: [],
      total: 0,
      page: 2,
      pageSize: 3,
      hasMore: false,
      provider: "Marketaux",
      attribution: "Market news provided by Marketaux.",
      lastUpdated: "2026-04-20T10:30:00.000Z",
      warnings: [],
    });

    const response = await GET(makeRequest("/api/news?category=forex&q=usd&page=2&pageSize=10"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.page).toBe(2);
    expect(mockGetMarketNews).toHaveBeenCalledWith({
      category: "forex",
      query: "usd",
      page: "2",
      pageSize: "10",
    });
  });

  it("maps auth, account setup, configuration, and rate limit errors", async () => {
    mockGetMarketNews.mockRejectedValueOnce(new UnauthenticatedError());
    let response = await GET(makeRequest("/api/news"));
    expect(response.status).toBe(401);

    mockGetMarketNews.mockRejectedValueOnce(new AccountSetupRequiredError());
    response = await GET(makeRequest("/api/news"));
    expect(response.status).toBe(403);

    mockGetMarketNews.mockRejectedValueOnce(
      new Error("Market news is not configured. Set the MARKETAUX_API_TOKEN environment variable on the server.")
    );
    response = await GET(makeRequest("/api/news"));
    expect(response.status).toBe(503);

    mockGetMarketNews.mockRejectedValueOnce(new Error("Market news rate limit reached. Please try again shortly."));
    response = await GET(makeRequest("/api/news"));
    let data = await response.json();
    expect(response.status).toBe(429);
    expect(data.error).toMatch(/rate limit/i);

    mockGetMarketNews.mockRejectedValueOnce(
      new Error("The market news provider rejected the API token. Please check the MARKETAUX_API_TOKEN configuration.")
    );
    response = await GET(makeRequest("/api/news"));
    data = await response.json();
    expect(response.status).toBe(503);
    expect(data.error).toMatch(/api token/i);

    mockGetMarketNews.mockRejectedValueOnce(new Error("Unexpected failure"));
    response = await GET(makeRequest("/api/news"));
    data = await response.json();
    expect(response.status).toBe(500);
    expect(data.error).toBe("Unable to load market news.");
  });
});
