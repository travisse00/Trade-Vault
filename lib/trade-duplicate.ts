/**
 * Shared logic for the "Duplicate Trade" flow.
 *
 * Only reusable trade details are carried over to the Add Trade form. Status,
 * exit details, P&L and conversion snapshots are deliberately absent so an
 * original trade can never leak into a new one. Server-side validation and
 * calculation stay authoritative when the form is submitted.
 */

export type MarketType = "FOREX" | "CRYPTO_SPOT" | "CRYPTO_FUTURES";
export type TradeDirection = "LONG" | "SHORT";

export type DuplicateTradeSource = {
  id: string;
  marketType: MarketType;
  asset: string;
  direction: TradeDirection;
  entryPrice: string;
  lotSize: string | null;
  positionValue: string | null;
  leverage: string;
  fees: string;
  fundingFees: string;
  stopLoss: string | null;
  takeProfit: string | null;
  riskPercentage: string | null;
  strategy: string | null;
  notes: string | null;
};

/** Values that map directly onto the Add Trade form fields. */
export type DuplicateTradePrefill = {
  marketType: MarketType;
  asset: string;
  direction: TradeDirection;
  status: "OPEN";
  entryDate: string;
  entryPrice: string;
  lotSize: string;
  positionValue: string;
  leverage: string;
  exitPrice: "";
  exitDate: "";
  stopLoss: string;
  takeProfit: string;
  riskPercentage: string;
  fees: string;
  fundingFees: string;
  strategy: string;
  notes: string;
};

export type CreateTradeFormValues = {
  marketType: MarketType;
  asset: string;
  direction: TradeDirection;
  status: "OPEN" | "CLOSED";
  entryDate: string;
  entryPrice: string;
  lotSize: string;
  positionValue: string;
  leverage: string;
  defaultLeverage: number;
  exitPrice: string;
  exitDate: string;
  stopLoss: string;
  takeProfit: string;
  riskPercentage: string;
  fees: string;
  fundingFees: string;
  strategy: string;
  notes: string;
};

export type StorageLike = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export const DUPLICATE_DRAFT_STORAGE_KEY =
  "tradevault:duplicate-trade-draft";

const MARKET_TYPES: MarketType[] = [
  "FOREX",
  "CRYPTO_SPOT",
  "CRYPTO_FUTURES",
];

function numberText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";

  const text = String(value).trim();

  return Number.isFinite(Number(text)) ? text : "";
}

function optionalString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";

  return value.slice(0, maxLength);
}

function validNumberText(value: unknown): boolean {
  if (typeof value !== "string") return false;
  if (value === "") return true;

  const amount = Number(value);

  return Number.isFinite(amount) && amount >= 0;
}

/** Format a Date for a `datetime-local` input in the user's local time. */
export function toLocalDateTimeValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Build the form prefill from a trade's reusable details.
 *
 * Margin is intentionally not copied: it is derived by the existing opening
 * calculation from entry price, lot size / position value and leverage.
 */
export function buildDuplicatePrefill(
  source: DuplicateTradeSource,
  now: Date = new Date()
): DuplicateTradePrefill {
  return {
    marketType: source.marketType,
    asset: source.asset,
    direction:
      source.marketType === "CRYPTO_SPOT" ? "LONG" : source.direction,
    status: "OPEN",
    entryDate: toLocalDateTimeValue(now),
    entryPrice: numberText(source.entryPrice),
    lotSize: numberText(source.lotSize),
    positionValue: numberText(source.positionValue),
    leverage: numberText(source.leverage) || "1",
    // Exit details are always reset; an OPEN trade cannot carry them.
    exitPrice: "",
    exitDate: "",
    stopLoss: numberText(source.stopLoss),
    takeProfit: numberText(source.takeProfit),
    riskPercentage: numberText(source.riskPercentage),
    fees: numberText(source.fees) || "0",
    fundingFees: numberText(source.fundingFees) || "0",
    strategy: source.strategy ?? "",
    notes: source.notes ?? "",
  };
}

function normalizePrefill(value: unknown): DuplicateTradePrefill | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;

  if (!MARKET_TYPES.includes(raw.marketType as MarketType)) return null;
  if (raw.direction !== "LONG" && raw.direction !== "SHORT") return null;
  if (raw.status !== "OPEN") return null;

  const date = optionalString(raw.entryDate, 16);

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(date)) return null;
  if (Number.isNaN(new Date(date).getTime())) return null;

  const numericFields = [
    "entryPrice",
    "lotSize",
    "positionValue",
    "leverage",
    "stopLoss",
    "takeProfit",
    "riskPercentage",
    "fees",
    "fundingFees",
  ] as const;

  for (const field of numericFields) {
    if (!validNumberText(raw[field])) return null;
  }

  return {
    marketType: raw.marketType as MarketType,
    asset: optionalString(raw.asset, 120),
    direction: raw.direction,
    status: "OPEN",
    entryDate: date,
    entryPrice: String(raw.entryPrice),
    lotSize: String(raw.lotSize),
    positionValue: String(raw.positionValue),
    leverage: String(raw.leverage),
    exitPrice: "",
    exitDate: "",
    stopLoss: String(raw.stopLoss),
    takeProfit: String(raw.takeProfit),
    riskPercentage: String(raw.riskPercentage),
    fees: String(raw.fees),
    fundingFees: String(raw.fundingFees),
    strategy: optionalString(raw.strategy, 100),
    notes: optionalString(raw.notes, 2000),
  };
}

function getStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  if (typeof window === "undefined") return null;

  return window.sessionStorage;
}

/** Store a prefill for the next visit to the Add Trade page. */
export function saveDuplicateDraft(
  prefill: DuplicateTradePrefill,
  sourceTradeId: string,
  storage?: StorageLike
): void {
  const target = getStorage(storage);

  if (!target) return;

  try {
    target.setItem(
      DUPLICATE_DRAFT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        sourceTradeId,
        prefill,
      })
    );
  } catch {
    // Storage can be unavailable (private mode / quota); duplication still
    // navigates to the Add Trade page with an empty form in that case.
  }
}

/**
 * Read and immediately clear a stored prefill. Single-use consumption stops a
 * stale duplicate from reappearing on later visits to the Add Trade page.
 */
export function consumeDuplicateDraft(
  storage?: StorageLike
): DuplicateTradePrefill | null {
  const target = getStorage(storage);

  if (!target) return null;

  let raw: string | null = null;

  try {
    raw = target.getItem(DUPLICATE_DRAFT_STORAGE_KEY);
    target.removeItem(DUPLICATE_DRAFT_STORAGE_KEY);
  } catch {
    return null;
  }

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (parsed.version !== 1) return null;

    return normalizePrefill(parsed.prefill);
  } catch {
    return null;
  }
}

/**
 * Build the POST payload from Add Trade form values. Shared with the
 * duplication tests so they exercise the exact payload the form submits.
 */
export function buildCreateTradePayload(
  values: CreateTradeFormValues
): Record<string, unknown> {
  return {
    marketType: values.marketType,
    asset: values.asset.trim(),
    direction: values.direction,
    status: values.status,
    entryPrice: Number(values.entryPrice),
    entryDate: new Date(values.entryDate).toISOString(),
    leverage: Number(values.leverage) || values.defaultLeverage,

    ...(values.status === "CLOSED"
      ? {
          exitPrice: Number(values.exitPrice),
          exitDate: new Date(values.exitDate).toISOString(),
        }
      : {}),

    ...(values.marketType === "FOREX"
      ? { lotSize: Number(values.lotSize) }
      : { positionValue: Number(values.positionValue) }),

    ...(values.marketType === "CRYPTO_SPOT"
      ? { fees: Number(values.fees) }
      : {}),

    ...(values.marketType === "CRYPTO_FUTURES"
      ? { fundingFees: Number(values.fundingFees) }
      : {}),

    ...(values.stopLoss ? { stopLoss: Number(values.stopLoss) } : {}),
    ...(values.takeProfit ? { takeProfit: Number(values.takeProfit) } : {}),
    ...(values.riskPercentage
      ? { riskPercentage: Number(values.riskPercentage) }
      : {}),
    ...(values.strategy.trim() ? { strategy: values.strategy.trim() } : {}),
    ...(values.notes.trim() ? { notes: values.notes.trim() } : {}),
  };
}
