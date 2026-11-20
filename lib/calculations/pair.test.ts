import { describe, it, expect } from "vitest";
import { getBaseCurrency, getQuoteCurrency, parsePair } from "./pair";

describe("parsePair", () => {
  it("parses BTC/USDT", () => {
    expect(parsePair("BTC/USDT")).toEqual({ base: "BTC", quote: "USDT" });
    expect(getBaseCurrency("BTC/USDT")).toBe("BTC");
    expect(getQuoteCurrency("BTC/USDT")).toBe("USDT");
  });

  it("parses ETH/USDT", () => {
    expect(parsePair("ETH/USDT")).toEqual({ base: "ETH", quote: "USDT" });
    expect(getBaseCurrency("ETH/USDT")).toBe("ETH");
    expect(getQuoteCurrency("ETH/USDT")).toBe("USDT");
  });

  it("parses BTC/USD", () => {
    expect(parsePair("BTC/USD")).toEqual({ base: "BTC", quote: "USD" });
    expect(getBaseCurrency("BTC/USD")).toBe("BTC");
    expect(getQuoteCurrency("BTC/USD")).toBe("USD");
  });

  it("parses ETH/BTC", () => {
    expect(parsePair("ETH/BTC")).toEqual({ base: "ETH", quote: "BTC" });
    expect(getBaseCurrency("ETH/BTC")).toBe("ETH");
    expect(getQuoteCurrency("ETH/BTC")).toBe("BTC");
  });

  it("parses unseparated symbols with multi-character quote currencies", () => {
    expect(parsePair("BTCUSDT")).toEqual({ base: "BTC", quote: "USDT" });
    expect(parsePair("ETHBTC")).toEqual({ base: "ETH", quote: "BTC" });
  });

  it("is case-insensitive and trims input", () => {
    expect(parsePair(" btc/usdt ")).toEqual({ base: "BTC", quote: "USDT" });
  });
});
