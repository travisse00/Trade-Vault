
import type {
  CalculationResult,
  ForexCalculationInput,
  CryptoSpotCalculationInput,
  CryptoFuturesCalculationInput,
} from "./types";

import { calculateForex } from "./forex";
import { calculateCryptoSpot } from "./crypto-spot";
import { calculateCryptoFutures } from "./crypto-futures";

type CalculateTradeInput =
  | ({
      marketType: "FOREX";
    } & ForexCalculationInput)
  | ({
      marketType: "CRYPTO_SPOT";
    } & CryptoSpotCalculationInput)
  | ({
      marketType: "CRYPTO_FUTURES";
    } & CryptoFuturesCalculationInput);

export function calculateTrade(
  input: CalculateTradeInput
): CalculationResult {
  switch (input.marketType) {
    case "FOREX":
      return calculateForex(input);

    case "CRYPTO_SPOT":
      return calculateCryptoSpot(input);

    case "CRYPTO_FUTURES":
      return calculateCryptoFutures(input);

    default: {
      const exhaustiveCheck: never = input;
      throw new Error(`Unsupported market type: ${exhaustiveCheck}`);
    }
  }
}
