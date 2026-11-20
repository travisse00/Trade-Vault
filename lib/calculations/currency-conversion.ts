import Decimal from "decimal.js";

export interface CurrencyConversionResult {
  rate: Decimal;
  fromCurrency: string;
  toCurrency: string;
  fetchedAt: Date;
}

export function convertCurrency(
  amount: Decimal,
  rate: Decimal
): Decimal {
  if (!amount.isFinite()) {
    throw new Error("Amount must be a valid number.");
  }

  if (!rate.isFinite() || rate.lte(0)) {
    throw new Error("Conversion rate must be greater than zero.");
  }

  return amount.mul(rate);
}