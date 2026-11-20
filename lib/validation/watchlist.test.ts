import { describe, expect, it } from "vitest";
import {
  createWatchlistItemSchema,
  normalizeWatchlistSymbol,
  updateWatchlistItemSchema,
} from "./watchlist";

describe("watchlist validation", () => {
  it("normalizes symbols consistently for duplicate checks", () => {
    expect(normalizeWatchlistSymbol(" eurusd ")).toBe("EURUSD");
    expect(normalizeWatchlistSymbol("btc/usd")).toBe("BTC/USD");
    expect(normalizeWatchlistSymbol("Aapl")).toBe("AAPL");
  });

  it("accepts valid create payloads and trims fields", () => {
    const parsed = createWatchlistItemSchema.safeParse({
      name: "  Euro / US Dollar  ",
      symbol: "  eurusd  ",
      category: "FOREX",
      notes: "  Watch for CPI  ",
      isFavorite: true,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe("Euro / US Dollar");
      expect(parsed.data.symbol).toBe("eurusd");
      expect(parsed.data.notes).toBe("Watch for CPI");
      expect(parsed.data.isFavorite).toBe(true);
    }
  });

  it("rejects missing/invalid required fields and unsupported categories", () => {
    expect(
      createWatchlistItemSchema.safeParse({
        name: "",
        symbol: "EURUSD",
        category: "FOREX",
      }).success
    ).toBe(false);

    expect(
      createWatchlistItemSchema.safeParse({
        name: "Euro",
        symbol: "",
        category: "FOREX",
      }).success
    ).toBe(false);

    expect(
      createWatchlistItemSchema.safeParse({
        name: "Euro",
        symbol: "EURUSD",
        category: "BONDS",
      }).success
    ).toBe(false);
  });

  it("requires at least one field for updates and accepts partial/favourite toggles", () => {
    expect(updateWatchlistItemSchema.safeParse({}).success).toBe(false);

    const fav = updateWatchlistItemSchema.safeParse({ isFavorite: true });
    expect(fav.success).toBe(true);

    const partial = updateWatchlistItemSchema.safeParse({
      category: "CRYPTO",
      notes: "Updated note",
    });
    expect(partial.success).toBe(true);
  });
});
