import Decimal from "decimal.js";

export type TradeDirection = "LONG" | "SHORT";

export type MarketType =
  | "FOREX"
  | "CRYPTO_SPOT"
  | "CRYPTO_FUTURES";

export interface CalculationResult {
  grossPnL: Decimal;
  totalFees: Decimal;
  netPnL: Decimal;
  returnPercentage: Decimal;
  positionQuantity: Decimal;
  marginUsed: Decimal;
}

export interface ForexCalculationInput {
  direction: TradeDirection;
  asset: string;
  entryPrice: Decimal;
  exitPrice: Decimal;
  lotSize: Decimal;
  commissionPerLot: Decimal;
  accountCurrency: string;
  entryConversionRate: Decimal;
  exitConversionRate: Decimal;
  leverage: number;
  /**
   * Extra fees charged on top of the commission (for example closing fees
   * entered when an open trade is closed). Defaults to zero.
   */
  additionalFees?: Decimal;
}

export interface CryptoSpotCalculationInput {
  entryPrice: Decimal;
  exitPrice: Decimal;
  positionValue: Decimal;
  positionQuantity: Decimal;
  fees: Decimal;
  exitConversionRate: Decimal;
  /** Extra fees charged on top of the recorded trading fees. Defaults to zero. */
  additionalFees?: Decimal;
}

export interface CryptoFuturesCalculationInput {
  entryPrice: Decimal;
  exitPrice: Decimal;
  positionValue: Decimal;
  positionQuantity: Decimal;
  tradingFeeRate: Decimal;
  exitConversionRate: Decimal;
  fundingFees: Decimal;
  leverage: number;
  direction: TradeDirection;
  /** Extra fees charged on top of the trading and funding fees. Defaults to zero. */
  additionalFees?: Decimal;
}