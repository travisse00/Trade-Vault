import { describe, it, expect } from "vitest";
import { tradeSchema } from "./trade";

const baseTrade = {
  asset: "EUR/USD",
  entryPrice: 1.085,
  entryDate: "2026-11-14",
  leverage: 100,
  strategy: "SMC",
};

describe("Trade Validation", () => {
  it("accepts an OPEN Forex trade without exit details", () => {
    const result = tradeSchema.safeParse({
      ...baseTrade,
      marketType: "FOREX",
      direction: "LONG",
      status: "OPEN",
      lotSize: 0.1,
    });

    expect(result.success).toBe(true);
  });

  it("accepts a CLOSED Forex trade with exit details", () => {
    const result = tradeSchema.safeParse({
      ...baseTrade,
      marketType: "FOREX",
      direction: "LONG",
      status: "CLOSED",
      lotSize: 0.1,
      exitPrice: 1.09,
      exitDate: "2026-11-14",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a CLOSED trade without an exit price", () => {
    const result = tradeSchema.safeParse({
      ...baseTrade,
      marketType: "FOREX",
      direction: "LONG",
      status: "CLOSED",
      lotSize: 0.1,
      exitDate: "2026-11-14",
    });

    expect(result.success).toBe(false);
  });

  it("accepts a Crypto Spot LONG trade", () => {
    const result = tradeSchema.safeParse({
      ...baseTrade,
      asset: "BTC/USDT",
      marketType: "CRYPTO_SPOT",
      direction: "LONG",
      status: "OPEN",
      positionValue: 500,
    });

    expect(result.success).toBe(true);
  });

  it("rejects a Crypto Spot SHORT trade", () => {
    const result = tradeSchema.safeParse({
      ...baseTrade,
      asset: "BTC/USDT",
      marketType: "CRYPTO_SPOT",
      direction: "SHORT",
      status: "OPEN",
      positionValue: 500,
    });

    expect(result.success).toBe(false);
  });

  it.each(["LONG", "SHORT"] as const)(
    "accepts a Crypto Futures %s trade",
    (direction) => {
      const result = tradeSchema.safeParse({
        ...baseTrade,
        asset: "BTC/USDT",
        marketType: "CRYPTO_FUTURES",
        direction,
        status: "OPEN",
        positionValue: 500,
      });

      expect(result.success).toBe(true);
    }
  );
});