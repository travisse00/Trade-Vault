import { describe, it, expect } from "vitest";
import { formatCurrency, formatSignedCurrency } from "./format";

describe("formatCurrency", () => {
  it.each([
    ["NGN", "₦500.00"],
    ["USD", "$500.00"],
    ["EUR", "€500.00"],
    ["GBP", "£500.00"],
  ])("formats %s values with the correct currency symbol", (currency, expected) => {
    expect(formatCurrency(500, currency)).toBe(expected);
  });

  it("formats larger NGN account balances with grouping", () => {
    expect(formatCurrency(500000, "NGN")).toBe("₦500,000.00");
  });

  it("keeps negative values negative", () => {
    expect(formatCurrency(-500, "NGN")).toBe("-₦500.00");
  });

  it("adds an explicit sign when requested", () => {
    expect(formatSignedCurrency(500, "EUR")).toBe("+€500.00");
    expect(formatSignedCurrency(-500, "EUR")).toBe("-€500.00");
  });

  it("never silently substitutes USD when the currency is missing", () => {
    expect(formatCurrency(500, "")).toBe("500.00");
  });

  it("accepts decimal strings from the database", () => {
    expect(formatCurrency("500.5", "GBP")).toBe("£500.50");
  });
});
