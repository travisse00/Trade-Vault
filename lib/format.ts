/**
 * Shared, deterministic formatting helpers.
 *
 * These run on both the server and the client. A fixed locale is used so the
 * server-rendered markup and the hydrated client markup always match.
 */

function toFiniteNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;

  const amount = typeof value === "number" ? value : Number(value);

  return Number.isFinite(amount) ? amount : 0;
}

export function formatCurrency(
  value: number | string | null | undefined,
  currency: string,
  options: { signed?: boolean } = {}
): string {
  const amount = toFiniteNumber(value);

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  if (options.signed) {
    return `${amount < 0 ? "-" : "+"}${formatted}`;
  }

  return amount < 0 ? `-${formatted}` : formatted;
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
