import { describe, expect, it } from "vitest";
import { filterWatchlistItems, matchesWatchlistSearch } from "./filter";

const items = [
  { id: "1", name: "Euro / US Dollar", symbol: "EURUSD", category: "FOREX", notes: "Major pair", isFavorite: false },
  { id: "2", name: "Bitcoin", symbol: "BTC", category: "CRYPTO", notes: "Halving cycle", isFavorite: true },
  { id: "3", name: "Apple Inc.", symbol: "AAPL", category: "STOCKS", notes: null, isFavorite: false },
  { id: "4", name: "Gold", symbol: "XAUUSD", category: "COMMODITIES", notes: "Inflation hedge", isFavorite: true },
  { id: "5", name: "S&P 500", symbol: "SPX", category: "INDICES", notes: null, isFavorite: false },
] as const;

describe("watchlist filtering and search", () => {
  it("filters by category", () => {
    expect(filterWatchlistItems([...items], { category: "CRYPTO", search: "" }).map((i) => i.id)).toEqual(["2"]);
    expect(filterWatchlistItems([...items], { category: "STOCKS", search: "" }).map((i) => i.id)).toEqual(["3"]);
    expect(filterWatchlistItems([...items], { category: "ALL", search: "" })).toHaveLength(5);
  });

  it("searches by name or symbol (case-insensitive) and notes", () => {
    expect(filterWatchlistItems([...items], { category: "ALL", search: "eur" }).map((i) => i.id)).toEqual(["1"]);
    expect(filterWatchlistItems([...items], { category: "ALL", search: "aapl" }).map((i) => i.id)).toEqual(["3"]);
    expect(filterWatchlistItems([...items], { category: "ALL", search: "inflation" }).map((i) => i.id)).toEqual(["4"]);
    expect(matchesWatchlistSearch(items[0], "USD")).toBe(true);
    expect(matchesWatchlistSearch(items[2], "btc")).toBe(false);
  });

  it("combines category filter and search", () => {
    expect(filterWatchlistItems([...items], { category: "FOREX", search: "btc" })).toEqual([]);
    expect(filterWatchlistItems([...items], { category: "COMMODITIES", search: "gold" }).map((i) => i.id)).toEqual(["4"]);
  });
});
