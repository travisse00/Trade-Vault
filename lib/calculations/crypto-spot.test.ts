
import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { calculateCryptoSpot } from "./crypto-spot";

describe("calculateCryptoSpot", () => {
  it("calculates profit on a winning spot trade", () => {
    const result = calculateCryptoSpot({
      entryPrice: new Decimal("100"),
      exitPrice: new Decimal("110"),
      positionValue: new Decimal("1000"),
      positionQuantity: new Decimal("10"),
      fees: new Decimal("2"),
      exitConversionRate: new Decimal("1"),
    });

    expect(result.positionQuantity.toNumber()).toBe(10);
    expect(result.grossPnL.toNumber()).toBe(100);
    expect(result.totalFees.toNumber()).toBe(2);
    expect(result.netPnL.toNumber()).toBe(98);
    expect(result.returnPercentage.toNumber()).toBe(9.8);
  });

  it("calculates a loss on a losing spot trade", () => {
    const result = calculateCryptoSpot({
      entryPrice: new Decimal("100"),
      exitPrice: new Decimal("90"),
      positionValue: new Decimal("1000"),
      positionQuantity: new Decimal("10"),
      fees: new Decimal("2"),
      exitConversionRate: new Decimal("1"),
    });

    expect(result.grossPnL.toNumber()).toBe(-100);
    expect(result.netPnL.toNumber()).toBe(-102);
  });

  it("rejects a negative trading fee", () => {
    expect(() =>
      calculateCryptoSpot({
        entryPrice: new Decimal("100"),
        exitPrice: new Decimal("110"),
        positionValue: new Decimal("1000"),
        positionQuantity: new Decimal("10"),
        fees: new Decimal("-2"),
        exitConversionRate: new Decimal("1"),
      })
    ).toThrow("Trading fees cannot be negative.");
  });

  it("rejects a zero entry price", () => {
    expect(() =>
      calculateCryptoSpot({
        entryPrice: new Decimal("0"),
        exitPrice: new Decimal("110"),
        positionValue: new Decimal("1000"),
        positionQuantity: new Decimal("10"),
        fees: new Decimal("2"),
        exitConversionRate: new Decimal("1"),
      })
    ).toThrow("Entry price must be greater than zero.");
  });

  it("calculates P&L for an account currency other than USD", () => {
    // BTC/USDT-style trade values converted to an NGN account at 1500 NGN/USDT.
    const result = calculateCryptoSpot({
      entryPrice: new Decimal("50000"),
      exitPrice: new Decimal("51000"),
      positionValue: new Decimal("1500000"),
      positionQuantity: new Decimal("0.02"),
      fees: new Decimal("1500"),
      exitConversionRate: new Decimal("1500"),
    });

    expect(result.positionQuantity.toNumber()).toBe(0.02);
    expect(result.grossPnL.toNumber()).toBe(30000);
    expect(result.totalFees.toNumber()).toBe(1500);
    expect(result.netPnL.toNumber()).toBe(28500);
    expect(result.returnPercentage.toNumber()).toBe(1.9);
  });
});
