
import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { calculateTrade } from "./index";

describe("calculateTrade", () => {
  it("routes Forex trades to the Forex calculator", () => {
    const result = calculateTrade({
      marketType: "FOREX",
      direction: "LONG",
      asset: "EUR/USD",
      entryPrice: new Decimal("1.1000"),
      exitPrice: new Decimal("1.1100"),
      lotSize: new Decimal("1"),
      commissionPerLot: new Decimal("3.5"),
      accountCurrency: "USD",
      entryConversionRate: new Decimal("1"),
      exitConversionRate: new Decimal("1"),
      leverage: 100,
    });

    expect(result.netPnL.toNumber()).toBe(993);
  });

  it("routes Crypto Spot trades to the Spot calculator", () => {
    const result = calculateTrade({
      marketType: "CRYPTO_SPOT",
      entryPrice: new Decimal("100"),
      exitPrice: new Decimal("110"),
      positionValue: new Decimal("1000"),
      positionQuantity: new Decimal("10"),
      fees: new Decimal("2"),
      exitConversionRate: new Decimal("1"),
    });

    expect(result.netPnL.toNumber()).toBe(98);
  });

  it("routes Crypto Futures trades to the Futures calculator", () => {
    const result = calculateTrade({
      marketType: "CRYPTO_FUTURES",
      direction: "LONG",
      entryPrice: new Decimal("100"),
      exitPrice: new Decimal("110"),
      positionValue: new Decimal("1000"),
      positionQuantity: new Decimal("10"),
      tradingFeeRate: new Decimal("0.0005"),
      exitConversionRate: new Decimal("1"),
      fundingFees: new Decimal("1"),
      leverage: 10,
    });

    expect(result.netPnL.toNumber()).toBe(97.95);
  });
});
