
import "server-only";

import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";

export interface CurrencyRateResult {
  rate: Decimal;
  fromCurrency: string;
  toCurrency: string;
  fetchedAt: Date;
}

interface ExchangeRateResponse {
  result: string;
  base_code: string;
  time_last_update_unix: number;
  time_next_update_unix: number;
  rates: Record<string, number>;
}

const PROVIDER = "ExchangeRate-API Open Access";

function validateCurrency(currency: string): string {
  const normalized = currency.trim().toUpperCase();

  if (!/^[A-Z0-9]{3,5}$/.test(normalized)) {
    throw new Error("Invalid currency code.");
  }

  return normalized;
}

function isUsdStableEquivalent(currency: string): boolean {
  return currency === "USD" || currency === "USDT";
}

async function fetchExchangeRate(
  fromCurrency: string,
  toCurrency: string
) {
  const response = await fetch(
    `https://open.er-api.com/v6/latest/${fromCurrency}`,
    {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Exchange rate provider returned ${response.status}.`
    );
  }

  const data = (await response.json()) as ExchangeRateResponse;

  if (
    data.result !== "success" ||
    data.base_code !== fromCurrency ||
    !data.rates
  ) {
    throw new Error("Invalid exchange rate response.");
  }

  const rawRate = data.rates[toCurrency];

  if (
    typeof rawRate !== "number" ||
    !Number.isFinite(rawRate) ||
    rawRate <= 0
  ) {
    throw new Error(
      `Exchange rate for ${fromCurrency}/${toCurrency} is unavailable.`
    );
  }

  const fetchedAt = new Date(
    data.time_last_update_unix * 1000
  );

  const expiresAt = new Date(
    data.time_next_update_unix * 1000
  );

  if (
    Number.isNaN(fetchedAt.getTime()) ||
    Number.isNaN(expiresAt.getTime()) ||
    expiresAt <= new Date()
  ) {
    throw new Error("Exchange rate data is expired or invalid.");
  }

  return {
    rate: new Decimal(String(rawRate)),
    fetchedAt,
    expiresAt,
  };
}

export async function getCurrencyRate(
  from: string,
  to: string
): Promise<CurrencyRateResult> {
  const fromCurrency = validateCurrency(from);
  const toCurrency = validateCurrency(to);

  // TradeVault accounting treats USDT and USD as equivalent (1:1) and must not
  // call the external conversion provider for these conversions.
  if (
    isUsdStableEquivalent(fromCurrency) &&
    isUsdStableEquivalent(toCurrency)
  ) {
    return {
      rate: new Decimal(1),
      fromCurrency,
      toCurrency,
      fetchedAt: new Date(),
    };
  }

  if (fromCurrency === toCurrency) {
    return {
      rate: new Decimal(1),
      fromCurrency,
      toCurrency,
      fetchedAt: new Date(),
    };
  }

  const now = new Date();

  // 1. Check the database cache.
  const cachedRate = await prisma.currencyRate.findUnique({
    where: {
      fromCurrency_toCurrency: {
        fromCurrency,
        toCurrency,
      },
    },
  });

  if (cachedRate && cachedRate.expiresAt > now) {
    return {
      rate: new Decimal(cachedRate.rate.toString()),
      fromCurrency,
      toCurrency,
      fetchedAt: cachedRate.fetchedAt,
    };
  }

  // 2. Fetch a fresh rate if the cache is missing or expired.
  const freshRate = await fetchExchangeRate(
    fromCurrency,
    toCurrency
  );

  // 3. Save the new rate.
  const savedRate = await prisma.currencyRate.upsert({
    where: {
      fromCurrency_toCurrency: {
        fromCurrency,
        toCurrency,
      },
    },
    create: {
      fromCurrency,
      toCurrency,
      rate: freshRate.rate,
      provider: PROVIDER,
      fetchedAt: freshRate.fetchedAt,
      expiresAt: freshRate.expiresAt,
    },
    update: {
      rate: freshRate.rate,
      provider: PROVIDER,
      fetchedAt: freshRate.fetchedAt,
      expiresAt: freshRate.expiresAt,
    },
  });

  return {
    rate: new Decimal(savedRate.rate.toString()),
    fromCurrency,
    toCurrency,
    fetchedAt: savedRate.fetchedAt,
  };
}
