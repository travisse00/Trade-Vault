
import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { calculateCryptoFutures } from "./crypto-futures";

describe("calculateCryptoFutures", () => {
  it("calculates profit on a winning LONG trade", () => {
    const result = calculateCryptoFutures({
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

    expect(result.positionQuantity.toNumber()).toBe(10);
    expect(result.grossPnL.toNumber()).toBe(100);
    expect(result.totalFees.toNumber()).toBe(2.05);
    expect(result.netPnL.toNumber()).toBe(97.95);
    expect(result.marginUsed.toNumber()).toBe(100);
    expect(result.returnPercentage.toNumber()).toBe(97.95);
  });

  it("calculates profit on a winning SHORT trade", () => {
    const result = calculateCryptoFutures({
      direction: "SHORT",
      entryPrice: new Decimal("100"),
      exitPrice: new Decimal("90"),
      positionValue: new Decimal("1000"),
      positionQuantity: new Decimal("10"),
      tradingFeeRate: new Decimal("0"),
      exitConversionRate: new Decimal("1"),
      fundingFees: new Decimal("0"),
      leverage: 5,
    });

    expect(result.grossPnL.toNumber()).toBe(100);
    expect(result.netPnL.toNumber()).toBe(100);
    expect(result.marginUsed.toNumber()).toBe(200);
  });

  it("calculates a loss on a losing LONG trade", () => {
    const result = calculateCryptoFutures({
      direction: "LONG",
      entryPrice: new Decimal("100"),
      exitPrice: new Decimal("90"),
      positionValue: new Decimal("1000"),
      positionQuantity: new Decimal("10"),
      tradingFeeRate: new Decimal("0"),
      exitConversionRate: new Decimal("1"),
      fundingFees: new Decimal("0"),
      leverage: 10,
    });

    expect(result.grossPnL.toNumber()).toBe(-100);
    expect(result.netPnL.toNumber()).toBe(-100);
  });

  it("rejects invalid leverage", () => {
    expect(() =>
      calculateCryptoFutures({
        direction: "LONG",
        entryPrice: new Decimal("100"),
        exitPrice: new Decimal("110"),
        positionValue: new Decimal("1000"),
        positionQuantity: new Decimal("10"),
        tradingFeeRate: new Decimal("0"),
        exitConversionRate: new Decimal("1"),
        fundingFees: new Decimal("0"),
        leverage: 0,
      })
    ).toThrow("Leverage must be at least 1.");
  });

  it("rejects negative funding fees", () => {
    expect(() =>
      calculateCryptoFutures({
        direction: "LONG",
        entryPrice: new Decimal("100"),
        exitPrice: new Decimal("110"),
        positionValue: new Decimal("1000"),
        positionQuantity: new Decimal("10"),
        tradingFeeRate: new Decimal("0"),
        exitConversionRate: new Decimal("1"),
        fundingFees: new Decimal("-5"),
        leverage: 10,
      })
    ).toThrow("Funding fees cannot be negative.");
  });

  it("calculates P&L for an account currency other than USD", () => {
    // BTC/USDT-style futures trade converted to an NGN account at 1500 NGN/USDT.
    const result = calculateCryptoFutures({
      direction: "LONG",
      entryPrice: new Decimal("50000"),
      exitPrice: new Decimal("51000"),
      positionValue: new Decimal("1500000"),
      positionQuantity: new Decimal("0.02"),
      tradingFeeRate: new Decimal("0.0005"),
      exitConversionRate: new Decimal("1500"),
      fundingFees: new Decimal("1500"),
      leverage: 10,
    });

    expect(result.grossPnL.toNumber()).toBe(30000);
    expect(result.totalFees.toNumber()).toBe(3015);
    expect(result.netPnL.toNumber()).toBe(26985);
    expect(result.marginUsed.toNumber()).toBe(150000);
    expect(result.returnPercentage.toNumber()).toBe(17.99);
  });
});
