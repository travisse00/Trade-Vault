import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Decimal from "decimal.js";

const { mockFindUnique, mockUpsert } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpsert: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    currencyRate: {
      findUnique: mockFindUnique,
      upsert: mockUpsert,
    },
  },
}));

import { getCurrencyRate } from "./currency-rate.service";

describe("getCurrencyRate", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("treats USDT to USD as 1 without calling the external API", async () => {
    const result = await getCurrencyRate("USDT", "USD");

    expect(result.rate).toBeInstanceOf(Decimal);
    expect(result.rate.toString()).toBe("1");
    expect(result.fromCurrency).toBe("USDT");
    expect(result.toCurrency).toBe("USD");
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("treats USD to USDT as 1 without calling the external API", async () => {
    const result = await getCurrencyRate("USD", "USDT");

    expect(result.rate).toBeInstanceOf(Decimal);
    expect(result.rate.toString()).toBe("1");
    expect(result.fromCurrency).toBe("USD");
    expect(result.toCurrency).toBe("USDT");
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns 1 for identical currencies without calling the external API", async () => {
    const result = await getCurrencyRate("EUR", "EUR");

    expect(result.rate.toString()).toBe("1");
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});
