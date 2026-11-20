import "server-only";

import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedAccount } from "@/lib/service/account.service";

export const MARKET_LABELS = {
  FOREX: "Forex",
  CRYPTO_SPOT: "Crypto Spot",
  CRYPTO_FUTURES: "Crypto Futures",
} as const;

export type MarketTypeValue = keyof typeof MARKET_LABELS;
export type DirectionValue = "LONG" | "SHORT";

export interface CalendarDayTrade {
  id: string;
  asset: string;
  marketType: MarketTypeValue;
  market: string;
  direction: DirectionValue;
  strategy: string | null;
  netPnL: string;
  exitDate: string;
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD in account timezone
  netPnL: string;
  tradeCount: number;
  trades: CalendarDayTrade[];
}

export interface CalendarMonthSummary {
  totalRealizedNetPnl: string;
  closedTrades: number;
  winningDays: number;
  losingDays: number;
  breakEvenDays: number;
}

export interface CalendarMonthData {
  year: number;
  month: number; // 1-12
  timezone: string;
  currency: string;
  today: string; // YYYY-MM-DD in account timezone
  monthStart: string;
  monthEnd: string;
  summary: CalendarMonthSummary;
  days: Record<string, CalendarDay>;
}

interface CalendarTradeRecord {
  id: string;
  asset: string;
  marketType: MarketTypeValue;
  direction: DirectionValue;
  strategy: string | null;
  netPnL: Decimal | null;
  exitDate: Date | null;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatMonthParam(year: number, month: number): string {
  return `${year}-${pad2(month)}`;
}

export function parseMonthParam(
  value?: string | null
): { year: number; month: number } | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (!Number.isInteger(year) || year < 1970 || year > 2100) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;

  return { year, month };
}

export function getMonthGridRange(year: number, month: number): {
  start: string;
  end: string;
  nextMonth: { year: number; month: number };
  prevMonth: { year: number; month: number };
} {
  const start = `${year}-${pad2(month)}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${year}-${pad2(month)}-${pad2(lastDay)}`;

  const prev =
    month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const next =
    month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  return { start, end, prevMonth: prev, nextMonth: next };
}

export function getDayKeyInTimeZone(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
}

export function getCurrentMonthInTimeZone(
  timeZone: string,
  now: Date = new Date()
): { year: number; month: number; today: string } {
  const today = getDayKeyInTimeZone(now, timeZone);
  const [yearStr, monthStr] = today.split("-");

  return {
    year: Number(yearStr),
    month: Number(monthStr),
    today,
  };
}

/**
 * Compute a UTC query window that safely covers the full target month in the
 * given timezone (including extreme UTC offsets), so we avoid scanning all
 * historical trades while still handling timezone boundaries correctly. Results
 * are filtered to the exact month by timezone day key after fetching.
 */
export function getMonthQueryBoundsUtc(
  year: number,
  month: number
): { gte: Date; lt: Date } {
  const startUtc = Date.UTC(year, month - 1, 1, 0, 0, 0, 0);
  const nextMonthUtc = Date.UTC(year, month, 1, 0, 0, 0, 0);
  const bufferMs = 14 * 60 * 60 * 1000;

  return {
    gte: new Date(startUtc - bufferMs),
    lt: new Date(nextMonthUtc + bufferMs),
  };
}

function isDayInMonth(dayKey: string, year: number, month: number): boolean {
  return dayKey.startsWith(`${year}-${pad2(month)}-`);
}

export function buildCalendarMonthDataFromTrades(params: {
  year: number;
  month: number;
  timezone: string;
  currency: string;
  trades: CalendarTradeRecord[];
  now?: Date;
}): CalendarMonthData {
  const { year, month, timezone, currency } = params;
  const now = params.now ?? new Date();
  const today = getDayKeyInTimeZone(now, timezone);
  const { start: monthStart, end: monthEnd } = getMonthGridRange(year, month);

  const grouped = new Map<string, CalendarDayTrade[]>();

  for (const trade of params.trades) {
    if (!trade.exitDate) continue;

    const dayKey = getDayKeyInTimeZone(trade.exitDate, timezone);

    if (!isDayInMonth(dayKey, year, month)) continue;

    const item: CalendarDayTrade = {
      id: trade.id,
      asset: trade.asset,
      marketType: trade.marketType,
      market: MARKET_LABELS[trade.marketType],
      direction: trade.direction,
      strategy: trade.strategy,
      netPnL: new Decimal(trade.netPnL ?? 0).toFixed(2),
      exitDate: trade.exitDate.toISOString(),
    };

    const list = grouped.get(dayKey) ?? [];
    list.push(item);
    grouped.set(dayKey, list);
  }

  const days: Record<string, CalendarDay> = {};
  let total = new Decimal(0);
  let closedTrades = 0;
  let winningDays = 0;
  let losingDays = 0;
  let breakEvenDays = 0;

  for (const [date, trades] of Array.from(grouped.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    trades.sort(
      (a, b) => new Date(a.exitDate).getTime() - new Date(b.exitDate).getTime()
    );

    const net = trades.reduce(
      (sum, trade) => sum.plus(trade.netPnL),
      new Decimal(0)
    );

    days[date] = {
      date,
      netPnL: net.toFixed(2),
      tradeCount: trades.length,
      trades,
    };

    total = total.plus(net);
    closedTrades += trades.length;

    if (net.greaterThan(0)) {
      winningDays += 1;
    } else if (net.lessThan(0)) {
      losingDays += 1;
    } else {
      breakEvenDays += 1;
    }
  }

  return {
    year,
    month,
    timezone,
    currency,
    today,
    monthStart,
    monthEnd,
    summary: {
      totalRealizedNetPnl: total.toFixed(2),
      closedTrades,
      winningDays,
      losingDays,
      breakEvenDays,
    },
    days,
  };
}

export async function getCalendarMonthData(
  year: number,
  month: number
): Promise<CalendarMonthData> {
  const { account } = await getAuthenticatedAccount();

  const bounds = getMonthQueryBoundsUtc(year, month);

  const trades = await prisma.trade.findMany({
    where: {
      accountId: account.id,
      status: "CLOSED",
      exitDate: {
        gte: bounds.gte,
        lt: bounds.lt,
      },
    },
    select: {
      id: true,
      asset: true,
      marketType: true,
      direction: true,
      strategy: true,
      netPnL: true,
      exitDate: true,
    },
    orderBy: {
      exitDate: "asc",
    },
  });

  return buildCalendarMonthDataFromTrades({
    year,
    month,
    timezone: account.timezone,
    currency: account.currency,
    trades: trades as unknown as CalendarTradeRecord[],
  });
}

export async function getCalendarPageData(
  monthParam?: string | null
): Promise<CalendarMonthData> {
  const { account } = await getAuthenticatedAccount();

  const parsed = parseMonthParam(monthParam);
  const current = getCurrentMonthInTimeZone(account.timezone);
  const year = parsed?.year ?? current.year;
  const month = parsed?.month ?? current.month;

  const bounds = getMonthQueryBoundsUtc(year, month);

  const trades = await prisma.trade.findMany({
    where: {
      accountId: account.id,
      status: "CLOSED",
      exitDate: {
        gte: bounds.gte,
        lt: bounds.lt,
      },
    },
    select: {
      id: true,
      asset: true,
      marketType: true,
      direction: true,
      strategy: true,
      netPnL: true,
      exitDate: true,
    },
    orderBy: {
      exitDate: "asc",
    },
  });

  return buildCalendarMonthDataFromTrades({
    year,
    month,
    timezone: account.timezone,
    currency: account.currency,
    trades: trades as unknown as CalendarTradeRecord[],
  });
}
