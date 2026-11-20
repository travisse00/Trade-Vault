import Decimal from "decimal.js";
import type {
  ForexCalculationInput,
  CalculationResult,
} from "./types";

import {
  validatePositive,
  validateNonNegative,
  calculatePercentage,
} from "./utils";
import { getForexContractSize, normalizePair } from "./pair";

export function calculateForex(
  input: ForexCalculationInput
): CalculationResult {
  const {
    direction,
    asset,
    entryPrice,
    exitPrice,
    lotSize,
    commissionPerLot,
    entryConversionRate,
    exitConversionRate,
    leverage,
  } = input;

  const additionalFees = input.additionalFees ?? new Decimal(0);

  validatePositive(entryPrice, "Entry price");
  validatePositive(exitPrice, "Exit price");
  validatePositive(lotSize, "Lot size");
  validatePositive(entryConversionRate, "Entry conversion rate");
  validatePositive(exitConversionRate, "Exit conversion rate");
  validateNonNegative(commissionPerLot, "Commission per lot");
  validateNonNegative(additionalFees, "Additional fees");

  if (!Number.isInteger(leverage) || leverage < 1) {
    throw new Error("Leverage must be at least 1.");
  }

  const pair = normalizePair(asset);

  if (!/^[A-Z]{6}$/.test(pair)) {
    throw new Error("Invalid Forex pair.");
  }

  const contractSize = getForexContractSize(pair);
  const positionQuantity = lotSize.mul(contractSize);

  const priceDifference =
    direction === "LONG"
      ? exitPrice.minus(entryPrice)
      : entryPrice.minus(exitPrice);

  const grossPnL = priceDifference
    .mul(positionQuantity)
    .mul(exitConversionRate);

  const totalFees = commissionPerLot
    .mul(lotSize)
    .mul(2)
    .plus(additionalFees);

  const netPnL = grossPnL.minus(totalFees);

  const entryNotional = positionQuantity
    .mul(entryPrice)
    .mul(entryConversionRate);

  const marginUsed = entryNotional.div(leverage);

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