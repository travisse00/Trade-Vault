
import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { calculateForex } from "./forex";

describe("calculateForex", () => {
  it("calculates profit on a winning LONG trade", () => {
    const result = calculateForex({
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

    expect(result.grossPnL.toNumber()).toBe(1000);
    expect(result.totalFees.toNumber()).toBe(7);
    expect(result.netPnL.toNumber()).toBe(993);
  });

  it("calculates loss on a losing SHORT trade", () => {
    const result = calculateForex({
      direction: "SHORT",
      asset: "EUR/USD",
      entryPrice: new Decimal("1.1000"),
      exitPrice: new Decimal("1.1050"),
      lotSize: new Decimal("1"),
      commissionPerLot: new Decimal("3.5"),
      accountCurrency: "USD",
      entryConversionRate: new Decimal("1"),
      exitConversionRate: new Decimal("1"),
      leverage: 100,
    });

    expect(result.grossPnL.toNumber()).toBe(-500);
    expect(result.totalFees.toNumber()).toBe(7);
    expect(result.netPnL.toNumber()).toBe(-507);
  });

  it("rejects an invalid lot size", () => {
    expect(() =>
      calculateForex({
        direction: "LONG",
        asset: "EUR/USD",
        entryPrice: new Decimal("1.1000"),
        exitPrice: new Decimal("1.1100"),
        lotSize: new Decimal("0"),
        commissionPerLot: new Decimal("3.5"),
        accountCurrency: "USD",
        entryConversionRate: new Decimal("1"),
        exitConversionRate: new Decimal("1"),
        leverage: 100,
      })
    ).toThrow("Lot size must be greater than zero.");
  });

  it("converts Forex P&L into a non-USD account currency", () => {
    // EUR/USD prices stay in USD; the result is converted at 1500 NGN/USD.
    const result = calculateForex({
      direction: "LONG",
      asset: "EUR/USD",
      entryPrice: new Decimal("1.1000"),
      exitPrice: new Decimal("1.1100"),
      lotSize: new Decimal("1"),
      commissionPerLot: new Decimal("3.5"),
      accountCurrency: "NGN",
      entryConversionRate: new Decimal("1500"),
      exitConversionRate: new Decimal("1500"),
      leverage: 100,
    });

    expect(result.grossPnL.toNumber()).toBe(1500000);
    expect(result.totalFees.toNumber()).toBe(7);
    expect(result.netPnL.toNumber()).toBe(1499993);
  });

  it("handles JPY pairs with the correct pip size", () => {
    const result = calculateForex({
      direction: "LONG",
      asset: "USD/JPY",
      entryPrice: new Decimal("150.00"),
      exitPrice: new Decimal("150.50"),
      lotSize: new Decimal("1"),
      commissionPerLot: new Decimal("0"),
      accountCurrency: "JPY",
      entryConversionRate: new Decimal("1"),
      exitConversionRate: new Decimal("1"),
      leverage: 100,
    });

    expect(result.grossPnL.toNumber()).toBe(50000);
  });
});
