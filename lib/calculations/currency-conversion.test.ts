import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { convertCurrency } from "./currency-conversion";

describe("convertCurrency", () => {
  it("converts an amount using the supplied exchange rate", () => {
    const result = convertCurrency(
      new Decimal("100"),
      new Decimal("1500")
    );

    expect(result.toNumber()).toBe(150000);
  });

  it("supports fractional amounts", () => {
    const result = convertCurrency(
      new Decimal("2.5"),
      new Decimal("1500")
    );

    expect(result.toNumber()).toBe(3750);
  });

  it("rejects a zero conversion rate", () => {
    expect(() =>
      convertCurrency(
        new Decimal("100"),
        new Decimal("0")
      )
    ).toThrow("Conversion rate must be greater than zero.");
  });

  it("rejects a negative conversion rate", () => {
    expect(() =>
      convertCurrency(
        new Decimal("100"),
        new Decimal("-5")
      )
    ).toThrow("Conversion rate must be greater than zero.");
  });
});