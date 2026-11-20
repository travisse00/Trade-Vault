import Decimal from "decimal.js";

export function validatePositive(
  value: Decimal,
  fieldName: string
): void {
  if (!value.isFinite() || value.lte(0)) {
    throw new Error(`${fieldName} must be greater than zero.`);
  }
}

export function validateNonNegative(
  value: Decimal,
  fieldName: string
): void {
  if (!value.isFinite() || value.lt(0)) {
    throw new Error(`${fieldName} cannot be negative.`);
  }
}

export function calculatePercentage(
  value: Decimal,
  base: Decimal
): Decimal {
  validatePositive(base, "Base value");

  return value.div(base).mul(100);
}