import Decimal from "decimal.js";
import type {
  CryptoFuturesCalculationInput,
  CalculationResult,
} from "./types";

import {
  validatePositive,
  validateNonNegative,
  calculatePercentage,
} from "./utils";

export function calculateCryptoFutures(
  input: CryptoFuturesCalculationInput
): CalculationResult {
  const {
    direction,
    entryPrice,
    exitPrice,
    positionValue,
    positionQuantity,
    tradingFeeRate,
    exitConversionRate,
    fundingFees,
    leverage,
  } = input;

  const additionalFees = input.additionalFees ?? new Decimal(0);

  validatePositive(entryPrice, "Entry price");
  validatePositive(exitPrice, "Exit price");
  validatePositive(positionValue, "Position value");
  validatePositive(positionQuantity, "Position quantity");
  validatePositive(exitConversionRate, "Exit conversion rate");
  validateNonNegative(tradingFeeRate, "Trading fee rate");
  validateNonNegative(fundingFees, "Funding fees");
  validateNonNegative(additionalFees, "Additional fees");

  if (!Number.isInteger(leverage) || leverage < 1) {
    throw new Error("Leverage must be at least 1.");
  }

  const priceDifference =
    direction === "LONG"
      ? exitPrice.minus(entryPrice)
      : entryPrice.minus(exitPrice);

  const grossPnL = priceDifference
    .mul(positionQuantity)
    .mul(exitConversionRate);

  // Entry fee uses the original position value.
  const entryFee = positionValue.mul(tradingFeeRate);

  // Exit fee uses the position's value at closing.
  const exitValue = positionQuantity
    .mul(exitPrice)
    .mul(exitConversionRate);

  const exitFee = exitValue.mul(tradingFeeRate);

  const totalFees = entryFee
    .plus(exitFee)
    .plus(fundingFees)
    .plus(additionalFees);

  const netPnL = grossPnL.minus(totalFees);

  const marginUsed = positionValue.div(leverage);

  const returnPercentage = calculatePercentage(
    netPnL,
    marginUsed
  );

  return {
    grossPnL,
    totalFees,
    netPnL,
    returnPercentage,
    positionQuantity,
    marginUsed,
  };
}