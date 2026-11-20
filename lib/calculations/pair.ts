import Decimal from "decimal.js";

const KNOWN_QUOTE_SUFFIXES = [
  "USDT",
  "USDC",
  "FDUSD",
  "BUSD",
  "DAI",
  "TUSD",
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "CAD",
  "CHF",
  "NZD",
  "BTC",
  "ETH",
  "BNB",
] as const;

/**
 * Normalise a trading pair/asset symbol by removing common separators and
 * uppercasing it (e.g. "btc/usdt" -> "BTCUSDT").
 */
export function normalizePair(asset: string): string {
  return asset.replace(/[\s/_-]+/g, "").toUpperCase();
}

function cleanSymbolPart(value: string): string {
  return value.replace(/[^A-Z0-9]/g, "");
}

/**
 * Identify the base and quote currencies/assets for a trading pair.
 *
 * Prefers an explicit separator (e.g. "BTC/USDT" -> BTC/USDT). For unseparated
 * symbols, matches known quote suffixes longest-first so crypto quotes like
 * USDT are parsed correctly (never by assuming a 3-character quote). As a final
 * fallback for standard 6-character FX-style pairs, splits into 3/3.
 */
export function parsePair(asset: string): { base: string; quote: string } {
  const trimmed = asset.trim().toUpperCase();

  if (trimmed.includes("/")) {
    const parts = trimmed.split("/").map(cleanSymbolPart).filter(Boolean);

    if (parts.length >= 2) {
      return {
        base: parts[0],
        quote: parts[parts.length - 1],
      };
    }

    if (parts.length === 1) {
      return { base: parts[0], quote: "" };
    }
  }

  const normalized = normalizePair(asset);

  for (const suffix of KNOWN_QUOTE_SUFFIXES) {
    if (normalized.endsWith(suffix) && normalized.length > suffix.length) {
      return {
        base: normalized.slice(0, normalized.length - suffix.length),
        quote: suffix,
      };
    }
  }

  if (normalized.length === 6) {
    return {
      base: normalized.slice(0, 3),
      quote: normalized.slice(3),
    };
  }

  return {
    base: normalized.slice(0, -3),
    quote: normalized.slice(-3),
  };
}

/**
 * Derive the base currency/asset from a trading pair.
 */
export function getBaseCurrency(asset: string): string {
  return parsePair(asset).base;
}

/**
 * Derive the quote currency/asset from a trading pair.
 */
export function getQuoteCurrency(asset: string): string {
  return parsePair(asset).quote;
}

/**
 * Contract size (units per standard lot) for a forex instrument.
 *
 * Most FX pairs use 100,000 units per lot. Metals are quoted differently, so
 * common CFD-style pairs use instrument-specific contract sizes.
 */
export function getForexContractSize(pair: string): Decimal {
  const normalized = normalizePair(pair);
  const base = normalized.slice(0, 3);

  switch (base) {
    case "XAU":
      return new Decimal(100);
    case "XAG":
      return new Decimal(5000);
    default:
      return new Decimal(100000);
  }
}
