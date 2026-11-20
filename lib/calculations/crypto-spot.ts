import Decimal from "decimal.js";
import type {
  CryptoSpotCalculationInput,
  CalculationResult,
} from "./types";

import {
  validatePositive,
  validateNonNegative,
  calculatePercentage,
} from "./utils";

export function calculateCryptoSpot(
  input: CryptoSpotCalculationInput
): CalculationResult {
  const {
    entryPrice,
    exitPrice,
    positionValue,
    positionQuantity,
    fees,
    exitConversionRate,
  } = input;

  const additionalFees = input.additionalFees ?? new Decimal(0);

  validatePositive(entryPrice, "Entry price");
  validatePositive(exitPrice, "Exit price");
  validatePositive(positionValue, "Position value");
  validatePositive(positionQuantity, "Position quantity");
  validatePositive(exitConversionRate, "Exit conversion rate");
  validateNonNegative(fees, "Trading fees");
  validateNonNegative(additionalFees, "Additional fees");

  const grossPnL = exitPrice
    .minus(entryPrice)
    .mul(positionQuantity)
    .mul(exitConversionRate);

  const totalFees = fees.plus(additionalFees);

  const netPnL = grossPnL.minus(totalFees);

  const returnPercentage = calculatePercentage(
    netPnL,
    positionValue
  );

  return {
    grossPnL,
    totalFees,
    netPnL,
    returnPercentage,
    positionQuantity,
    marginUsed: new Decimal(0),
  };
}