/**
 * Shared, deterministic formatting helpers.
 *
 * These run on both the server and the client. A fixed locale is used so the
 * server-rendered markup and the hydrated client markup always match.
 */

function toFiniteNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;

  const amount = typeof value === "number" ? value : Number(value);

  return Number.isFinite(amount) ? amount : 0;
}

/**
 * Format an account-denominated monetary value.
 *
 * `currency` must be supplied by the caller (usually from the authenticated
 * trading account). We never fall back to USD: doing so would silently relabel
 * balances and P&L for accounts in other currencies. The narrow symbol form
 * gives the expected ₦ / $ / € / £ prefixes instead of an ISO code.
 */
export function formatCurrency(
  value: unknown,
  currency: string,
  options: { signed?: boolean } = {}
): string {
  const amount = toFiniteNumber(value);
  const magnitude = Math.abs(amount);

  let formatted: string;

  try {
    formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(magnitude);
  } catch {
    // Incomplete or unsupported currency data: show the amount with its code
    // rather than inventing a currency (especially USD).
    formatted = `${magnitude.toFixed(2)}${currency ? ` ${currency}` : ""}`;
  }

  if (options.signed) {
    return `${amount < 0 ? "-" : "+"}${formatted}`;
  }

  return amount < 0 ? `-${formatted}` : formatted;
}

export function formatSignedCurrency(
  value: unknown,
  currency: string
): string {
  return formatCurrency(value, currency, { signed: true });
}

export function formatPercent(
  value: number | string | null | undefined,
  digits = 2
): string {
  if (value === null || value === undefined) return "—";

  const amount = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(amount)) return "—";

  return `${amount.toFixed(digits)}%`;
}

export function formatDate(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }
): string {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", options).format(date);
}

/** Short day label used by chart axes, e.g. "Nov 18". */
export function formatDayLabel(value: string | Date): string {
  return formatDate(value, { month: "short", day: "numeric" });
}
