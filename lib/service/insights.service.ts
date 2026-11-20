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
export type InsightsPeriod = "all" | "7d" | "30d" | "90d";

export type SessionName = "asian" | "london" | "newYork" | "other";

export interface InsightsTradeRef {
  id: string;
  asset: string;
  marketType: MarketTypeValue;
  market: string;
  direction: DirectionValue;
  strategy: string | null;
  entryDate: string;
  exitDate: string;
  netPnL: string;
  returnPercentage: string | null;
}

export interface SessionPerformanceRow {
  session: SessionName;
  label: string;
  windowUtc: string;
  totalTrades: number;
  netPnl: string;
  winRate: number | null;
  averagePnl: string | null;
}

export interface DayOfWeekRow {
  day: string;
  dayIndex: number; // 0=Mon ... 6=Sun
  totalTrades: number;
  netPnl: string;
  winRate: number | null;
}

export interface HoldingTimeStats {
  tradesWithValidTimestamps: number;
  averageMs: number | null;
  averageWinningMs: number | null;
  averageLosingMs: number | null;
  longestMs: number | null;
  shortestMs: number | null;
  longestTrade: InsightsTradeRef | null;
  shortestTrade: InsightsTradeRef | null;
}

export interface RiskRewardAnalysis {
  tradesWithPlannedRR: number;
  averagePlannedRR: string | null;
  averageActualReturnRelativeToInitialRisk: string | null;
  averageActualReturnRelativeToInitialRiskNote: string;
  tradesWithTakeProfit: number;
  tradesReachedOrExceededPlannedReward: number;
  reachedOrExceededPlannedRewardRate: number | null;
  reachedOrExceededPlannedRewardNote: string;
  tradesWithStopLoss: number;
  tradesWithRiskPercentage: number;
  tradesWithBothSlAndTp: number;
  closedTradesAnalyzed: number;
  consistencyNote: string;
}

export interface BestWorstTrades {
  biggestWin: InsightsTradeRef | null;
  biggestLoss: InsightsTradeRef | null;
  bestReturn: InsightsTradeRef | null;
  worstReturn: InsightsTradeRef | null;
  averageWin: string | null;
  averageLoss: string | null;
  winningTradeCount: number;
  losingTradeCount: number;
}

export interface ConsistencyAnalysis {
  winningDays: number;
  losingDays: number;
  breakEvenDays: number;
  totalActiveDays: number;
  longestWinningStreak: number;
  longestLosingStreak: number;
  currentStreak: { type: "win" | "loss" | "breakEven" | "none"; length: number };
  trend: { date: string; cumulativeNetPnl: string; tradeNetPnl: string; tradeId: string }[];
  trendNote: string;
  consistencyIndication: string;
}

export interface InsightsData {
  period: InsightsPeriod;
  periodLabel: string;
  timezoneNote: string;
  currency: string;
  generatedAt: string;
  range: { from: string | null; to: string };
  closedTradesAnalyzed: number;
  sessionPerformance: SessionPerformanceRow[];
  dayOfWeekPerformance: DayOfWeekRow[];
  strongestDay: DayOfWeekRow | null;
  weakestDay: DayOfWeekRow | null;
  holdingTime: HoldingTimeStats;
  riskReward: RiskRewardAnalysis;
  bestWorst: BestWorstTrades;
  consistency: ConsistencyAnalysis;
}

interface ClosedTradeRecord {
  id: string;
  asset: string;
  marketType: MarketTypeValue;
  direction: DirectionValue;
  strategy: string | null;
  entryDate: Date;
  exitDate: Date | null;
  netPnL: Decimal | null;
  returnPercentage: Decimal | null;
  stopLoss: Decimal | null;
  takeProfit: Decimal | null;
  riskPercentage: Decimal | null;
  entryPrice: Decimal;
  exitPrice: Decimal | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const PERIODS: { value: InsightsPeriod; label: string; days: number | null }[] = [
  { value: "all", label: "All time", days: null },
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
];

export function normalizeInsightsPeriod(value?: string | null): InsightsPeriod {
  switch ((value ?? "").toLowerCase()) {
    case "7d":
    case "7":
      return "7d";
    case "30d":
    case "30":
      return "30d";
    case "90d":
    case "90":
      return "90d";
    case "all":
    case "alltime":
    case "all-time":
    default:
      return "all";
  }
}

export function getPeriodWindow(
  period: InsightsPeriod,
  now: Date = new Date()
): { from: Date | null; to: Date; label: string } {
  const config = PERIODS.find((item) => item.value === period) ?? PERIODS[0];
  const to = now;
  const from = config.days === null ? null : new Date(now.getTime() - config.days * DAY_MS);

  return { from, to, label: config.label };
}

export function classifySessionByUtcHour(hour: number): SessionName {
  if (hour >= 0 && hour < 8) return "asian";
  if (hour >= 8 && hour < 13) return "london";
  if (hour >= 13 && hour < 22) return "newYork";
  return "other";
}

export function getUtcDayOfWeekIndex(date: Date): number {
  // 0=Mon ... 6=Sun
  const day = date.getUTCDay(); // 0=Sun
  return (day + 6) % 7;
}

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

function toTradeRef(trade: ClosedTradeRecord): InsightsTradeRef {
  return {
    id: trade.id,
    asset: trade.asset,
    marketType: trade.marketType,
    market: MARKET_LABELS[trade.marketType],
    direction: trade.direction,
    strategy: trade.strategy,
    entryDate: trade.entryDate.toISOString(),
    exitDate: (trade.exitDate ?? trade.entryDate).toISOString(),
    netPnL: new Decimal(trade.netPnL ?? 0).toFixed(2),
    returnPercentage:
      trade.returnPercentage === null || trade.returnPercentage === undefined
        ? null
        : new Decimal(trade.returnPercentage).toFixed(4),
  };
}

function decimalOrZero(value: Decimal | null | undefined): Decimal {
  return value ?? new Decimal(0);
}

function winRateFromCounts(wins: number, total: number): number | null {
  if (total === 0) return null;
  return Number(new Decimal(wins).div(total).mul(100).toDecimalPlaces(2));
}

function averageDecimal(sum: Decimal, count: number): string | null {
  if (count === 0) return null;
  return sum.div(count).toFixed(2);
}

function compareTradeByNetPnlDesc(a: ClosedTradeRecord, b: ClosedTradeRecord): number {
  const diff = decimalOrZero(b.netPnL).comparedTo(decimalOrZero(a.netPnL));
  if (diff !== 0) return diff;
  return a.id.localeCompare(b.id);
}

function compareTradeByReturnDesc(a: ClosedTradeRecord, b: ClosedTradeRecord): number {
  const aReturn = a.returnPercentage;
  const bReturn = b.returnPercentage;

  if (aReturn === null && bReturn === null) return a.id.localeCompare(b.id);
  if (aReturn === null) return 1;
  if (bReturn === null) return -1;

  const diff = bReturn.comparedTo(aReturn);
  if (diff !== 0) return diff;
  return a.id.localeCompare(b.id);
}

export function buildInsightsFromTrades(params: {
  trades: ClosedTradeRecord[];
  currency: string;
  period: InsightsPeriod;
  now?: Date;
}): InsightsData {
  const { trades, currency, period } = params;
  const now = params.now ?? new Date();
  const window = getPeriodWindow(period, now);

  const sortedByExit = [...trades].sort((a, b) => {
    const aExit = a.exitDate?.getTime() ?? 0;
    const bExit = b.exitDate?.getTime() ?? 0;
    if (aExit !== bExit) return aExit - bExit;
    return a.id.localeCompare(b.id);
  });

  // --- Session performance (entry time, UTC) ---
  const sessionDefs: Array<{ session: SessionName; label: string; windowUtc: string }> = [
    { session: "asian", label: "Asian", windowUtc: "00:00–08:00 UTC" },
    { session: "london", label: "London", windowUtc: "08:00–13:00 UTC" },
    { session: "newYork", label: "New York", windowUtc: "13:00–22:00 UTC" },
    { session: "other", label: "Outside defined sessions", windowUtc: "22:00–00:00 UTC" },
  ];

  const sessionAgg = new Map<
    SessionName,
    { trades: number; net: Decimal; wins: number }
  >();

  for (const def of sessionDefs) {
    sessionAgg.set(def.session, { trades: 0, net: new Decimal(0), wins: 0 });
  }

  // --- Day of week (entry date, UTC) ---
  const dayAgg = Array.from({ length: 7 }, (_, index) => ({
    day: DAY_NAMES[index],
    dayIndex: index,
    trades: 0,
    net: new Decimal(0),
    wins: 0,
  }));

  // --- Holding time ---
  let holdingCount = 0;
  let holdingSumMs = 0;
  let holdingWinCount = 0;
  let holdingWinSumMs = 0;
  let holdingLossCount = 0;
  let holdingLossSumMs = 0;
  let longest: { ms: number; trade: ClosedTradeRecord } | null = null;
  let shortest: { ms: number; trade: ClosedTradeRecord } | null = null;

  // --- Risk/reward ---
  let tradesWithPlannedRR = 0;
  let plannedRRSum = new Decimal(0);
  let tradesWithTakeProfit = 0;
  let tradesReachedOrExceededPlannedReward = 0;
  let tradesWithStopLoss = 0;
  let tradesWithRiskPercentage = 0;
  let tradesWithBothSlAndTp = 0;

  // --- Best/worst ---
  let winSum = new Decimal(0);
  let winCount = 0;
  let lossSum = new Decimal(0);
  let lossCount = 0;

  // --- Consistency / daily ---
  const dailyNet = new Map<string, Decimal>();

  for (const trade of trades) {
    const pnl = decimalOrZero(trade.netPnL);

    // Session
    const session = classifySessionByUtcHour(trade.entryDate.getUTCHours());
    const s = sessionAgg.get(session)!;
    s.trades += 1;
    s.net = s.net.plus(pnl);
    if (pnl.greaterThan(0)) s.wins += 1;

    // Day of week
    const dayIndex = getUtcDayOfWeekIndex(trade.entryDate);
    const d = dayAgg[dayIndex];
    d.trades += 1;
    d.net = d.net.plus(pnl);
    if (pnl.greaterThan(0)) d.wins += 1;

    // Holding time
    if (trade.exitDate) {
      const durationMs = trade.exitDate.getTime() - trade.entryDate.getTime();
      if (Number.isFinite(durationMs) && durationMs >= 0) {
        holdingCount += 1;
        holdingSumMs += durationMs;

        if (pnl.greaterThan(0)) {
          holdingWinCount += 1;
          holdingWinSumMs += durationMs;
        } else if (pnl.lessThan(0)) {
          holdingLossCount += 1;
          holdingLossSumMs += durationMs;
        }

        if (!longest || durationMs > longest.ms) {
          longest = { ms: durationMs, trade };
        }
        if (!shortest || durationMs < shortest.ms) {
          shortest = { ms: durationMs, trade };
        }
      }
    }

    // Risk/reward
    const hasSL = trade.stopLoss !== null && trade.stopLoss !== undefined;
    const hasTP = trade.takeProfit !== null && trade.takeProfit !== undefined;
    const hasRiskPct =
      trade.riskPercentage !== null && trade.riskPercentage !== undefined;

    if (hasSL) tradesWithStopLoss += 1;
    if (hasTP) tradesWithTakeProfit += 1;
    if (hasRiskPct) tradesWithRiskPercentage += 1;
    if (hasSL && hasTP) tradesWithBothSlAndTp += 1;

    if (hasSL && hasTP) {
      const riskDist = trade.entryPrice.minus(trade.stopLoss as Decimal).abs();
      const rewardDist = (trade.takeProfit as Decimal).minus(trade.entryPrice).abs();
      if (riskDist.greaterThan(0)) {
        tradesWithPlannedRR += 1;
        plannedRRSum = plannedRRSum.plus(rewardDist.div(riskDist));
      }
    }

    if (hasTP && trade.exitPrice !== null && trade.exitPrice !== undefined) {
      const reached =
        trade.direction === "LONG"
          ? trade.exitPrice.greaterThanOrEqualTo(trade.takeProfit as Decimal)
          : trade.exitPrice.lessThanOrEqualTo(trade.takeProfit as Decimal);
      if (reached) tradesReachedOrExceededPlannedReward += 1;
    }

    // Best/worst aggregates
    if (pnl.greaterThan(0)) {
      winCount += 1;
      winSum = winSum.plus(pnl);
    } else if (pnl.lessThan(0)) {
      lossCount += 1;
      lossSum = lossSum.plus(pnl);
    }

    // Daily realized (by exit date UTC for consistency)
    if (trade.exitDate) {
      const dayKey = trade.exitDate.toISOString().slice(0, 10);
      dailyNet.set(dayKey, (dailyNet.get(dayKey) ?? new Decimal(0)).plus(pnl));
    }
  }

  const sessionPerformance: SessionPerformanceRow[] = sessionDefs.map((def) => {
    const agg = sessionAgg.get(def.session)!;
    return {
      session: def.session,
      label: def.label,
      windowUtc: def.windowUtc,
      totalTrades: agg.trades,
      netPnl: agg.net.toFixed(2),
      winRate: winRateFromCounts(agg.wins, agg.trades),
      averagePnl: averageDecimal(agg.net, agg.trades),
    };
  });

  const dayOfWeekPerformance: DayOfWeekRow[] = dayAgg.map((day) => ({
    day: day.day,
    dayIndex: day.dayIndex,
    totalTrades: day.trades,
    netPnl: day.net.toFixed(2),
    winRate: winRateFromCounts(day.wins, day.trades),
  }));

  const daysWithTrades = dayOfWeekPerformance.filter((day) => day.totalTrades > 0);
  let strongestDay: DayOfWeekRow | null = null;
  let weakestDay: DayOfWeekRow | null = null;

  if (daysWithTrades.length >= 2) {
    strongestDay = [...daysWithTrades].sort((a, b) => {
      const pnlDiff = new Decimal(b.netPnl).comparedTo(new Decimal(a.netPnl));
      if (pnlDiff !== 0) return pnlDiff;
      return a.dayIndex - b.dayIndex;
    })[0];

    weakestDay = [...daysWithTrades].sort((a, b) => {
      const pnlDiff = new Decimal(a.netPnl).comparedTo(new Decimal(b.netPnl));
      if (pnlDiff !== 0) return pnlDiff;
      return a.dayIndex - b.dayIndex;
    })[0];
  }

  const holdingTime: HoldingTimeStats = {
    tradesWithValidTimestamps: holdingCount,
    averageMs: holdingCount > 0 ? Math.round(holdingSumMs / holdingCount) : null,
    averageWinningMs:
      holdingWinCount > 0 ? Math.round(holdingWinSumMs / holdingWinCount) : null,
    averageLosingMs:
      holdingLossCount > 0 ? Math.round(holdingLossSumMs / holdingLossCount) : null,
    longestMs: longest ? longest.ms : null,
    shortestMs: shortest ? shortest.ms : null,
    longestTrade: longest ? toTradeRef(longest.trade) : null,
    shortestTrade: shortest ? toTradeRef(shortest.trade) : null,
  };

  const riskReward: RiskRewardAnalysis = {
    tradesWithPlannedRR,
    averagePlannedRR:
      tradesWithPlannedRR > 0 ? plannedRRSum.div(tradesWithPlannedRR).toFixed(2) : null,
    averageActualReturnRelativeToInitialRisk: null,
    averageActualReturnRelativeToInitialRiskNote:
      "Actual return relative to initial planned monetary risk (R-multiple) is not shown because the initial risk amount in account currency is not stored.",
    tradesWithTakeProfit,
    tradesReachedOrExceededPlannedReward,
    reachedOrExceededPlannedRewardRate: winRateFromCounts(
      tradesReachedOrExceededPlannedReward,
      tradesWithTakeProfit
    ),
    reachedOrExceededPlannedRewardNote:
      "Based on exit price compared with the stored take-profit level for closed trades. Intra-trade price excursions are not tracked.",
    tradesWithStopLoss,
    tradesWithRiskPercentage,
    tradesWithBothSlAndTp,
    closedTradesAnalyzed: trades.length,
    consistencyNote:
      trades.length === 0
        ? "No closed trades in the selected period."
        : "Summary reflects how often stop-loss, take-profit, and risk-percentage values are recorded on closed trades.",
  };

  const sortedByPnlDesc = [...trades].sort(compareTradeByNetPnlDesc);
  const biggestWinTrade = sortedByPnlDesc.find((trade) => decimalOrZero(trade.netPnL).greaterThan(0)) ?? null;
  const biggestLossTrade =
    [...sortedByPnlDesc].reverse().find((trade) => decimalOrZero(trade.netPnL).lessThan(0)) ?? null;

  const tradesWithReturn = trades.filter((trade) => trade.returnPercentage !== null && trade.returnPercentage !== undefined);
  const sortedByReturnDesc = [...tradesWithReturn].sort(compareTradeByReturnDesc);
  const bestReturnTrade = sortedByReturnDesc[0] ?? null;
  const worstReturnTrade =
    sortedByReturnDesc.length > 0 ? sortedByReturnDesc[sortedByReturnDesc.length - 1] : null;

  const bestWorst: BestWorstTrades = {
    biggestWin: biggestWinTrade ? toTradeRef(biggestWinTrade) : null,
    biggestLoss: biggestLossTrade ? toTradeRef(biggestLossTrade) : null,
    bestReturn: bestReturnTrade ? toTradeRef(bestReturnTrade) : null,
    worstReturn: worstReturnTrade ? toTradeRef(worstReturnTrade) : null,
    averageWin: averageDecimal(winSum, winCount),
    averageLoss: averageDecimal(lossSum, lossCount),
    winningTradeCount: winCount,
    losingTradeCount: lossCount,
  };

  // Consistency: winning/losing days by exit date (UTC)
  let winningDays = 0;
  let losingDays = 0;
  let breakEvenDays = 0;

  for (const net of dailyNet.values()) {
    if (net.greaterThan(0)) winningDays += 1;
    else if (net.lessThan(0)) losingDays += 1;
    else breakEvenDays += 1;
  }

  // Trade streaks in chronological (exit) order
  let longestWinningStreak = 0;
  let longestLosingStreak = 0;
  let currentWin = 0;
  let currentLoss = 0;

  for (const trade of sortedByExit) {
    const pnl = decimalOrZero(trade.netPnL);
    if (pnl.greaterThan(0)) {
      currentWin += 1;
      currentLoss = 0;
      if (currentWin > longestWinningStreak) longestWinningStreak = currentWin;
    } else if (pnl.lessThan(0)) {
      currentLoss += 1;
      currentWin = 0;
      if (currentLoss > longestLosingStreak) longestLosingStreak = currentLoss;
    } else {
      currentWin = 0;
      currentLoss = 0;
    }
  }

  let currentStreak: ConsistencyAnalysis["currentStreak"] = { type: "none", length: 0 };
  if (sortedByExit.length > 0) {
    // Walk backwards to compute current streak (including break-even as its own type)
    const lastPnl = decimalOrZero(sortedByExit[sortedByExit.length - 1].netPnL);
    const lastType: "win" | "loss" | "breakEven" = lastPnl.greaterThan(0)
      ? "win"
      : lastPnl.lessThan(0)
        ? "loss"
        : "breakEven";
    let length = 0;
    for (let i = sortedByExit.length - 1; i >= 0; i -= 1) {
      const pnl = decimalOrZero(sortedByExit[i].netPnL);
      const type: "win" | "loss" | "breakEven" = pnl.greaterThan(0)
        ? "win"
        : pnl.lessThan(0)
          ? "loss"
          : "breakEven";
      if (type !== lastType) break;
      length += 1;
    }
    currentStreak = { type: lastType, length };
  }

  // Trend: cumulative net P&L by trade close order
  let cumulative = new Decimal(0);
  const trend = sortedByExit.map((trade) => {
    const pnl = decimalOrZero(trade.netPnL);
    cumulative = cumulative.plus(pnl);
    return {
      date: (trade.exitDate ?? trade.entryDate).toISOString(),
      cumulativeNetPnl: cumulative.toFixed(2),
      tradeNetPnl: pnl.toFixed(2),
      tradeId: trade.id,
    };
  });

  // Consistency indication (descriptive, no prediction)
  let consistencyIndication = "Not enough closed trades in this period to assess consistency.";
  if (sortedByExit.length >= 4) {
    const mid = Math.ceil(sortedByExit.length / 2);
    const firstHalf = sortedByExit.slice(0, mid);
    const secondHalf = sortedByExit.slice(mid);

    const halfStats = (half: ClosedTradeRecord[]) => {
      let wins = 0;
      let net = new Decimal(0);
      for (const t of half) {
        const pnl = decimalOrZero(t.netPnL);
        net = net.plus(pnl);
        if (pnl.greaterThan(0)) wins += 1;
      }
      return {
        winRate: half.length > 0 ? wins / half.length : 0,
        avg: half.length > 0 ? net.div(half.length) : new Decimal(0),
        net,
        count: half.length,
      };
    };

    const first = halfStats(firstHalf);
    const second = halfStats(secondHalf);
    const winRateDiff = Math.abs(second.winRate - first.winRate);

    if (winRateDiff <= 0.15) {
      consistencyIndication = `Win rate is relatively stable across the period (${Math.round(first.winRate * 100)}% earlier vs ${Math.round(second.winRate * 100)}% later, by trade order).`;
    } else if (second.winRate > first.winRate) {
      consistencyIndication = `Win rate improved from ${Math.round(first.winRate * 100)}% (earlier) to ${Math.round(second.winRate * 100)}% (later) over the selected period.`;
    } else {
      consistencyIndication = `Win rate declined from ${Math.round(first.winRate * 100)}% (earlier) to ${Math.round(second.winRate * 100)}% (later) over the selected period.`;
    }
  } else if (sortedByExit.length > 0) {
    consistencyIndication =
      "Some closed trades are available, but more data is needed for a reliable consistency comparison.";
  }

  return {
    period,
    periodLabel: window.label,
    timezoneNote:
      "Trading sessions and day-of-week insights are classified by trade entry time in UTC. Session windows: Asian 00:00–08:00, London 08:00–13:00, New York 13:00–22:00 (UTC).",
    currency,
    generatedAt: now.toISOString(),
    range: {
      from: window.from ? window.from.toISOString() : null,
      to: window.to.toISOString(),
    },
    closedTradesAnalyzed: trades.length,
    sessionPerformance,
    dayOfWeekPerformance,
    strongestDay,
    weakestDay,
    holdingTime,
    riskReward,
    bestWorst,
    consistency: {
      winningDays,
      losingDays,
      breakEvenDays,
      totalActiveDays: dailyNet.size,
      longestWinningStreak,
      longestLosingStreak,
      currentStreak,
      trend,
      trendNote:
        "Cumulative net P&L is plotted in trade close (exit) order for closed trades in the selected period. This describes past performance only.",
      consistencyIndication,
    },
  };
}

export async function getInsightsData(
  periodInput?: string | InsightsPeriod | null
): Promise<InsightsData> {
  const period = normalizeInsightsPeriod(
    typeof periodInput === "string" ? periodInput : periodInput ?? null
  );

  const { account } = await getAuthenticatedAccount();
  const window = getPeriodWindow(period);

  const trades = await prisma.trade.findMany({
    where: {
      accountId: account.id,
      status: "CLOSED",
      ...(window.from
        ? {
            exitDate: {
              gte: window.from,
              lte: window.to,
            },
          }
        : {}),
    },
    select: {
      id: true,
      asset: true,
      marketType: true,
      direction: true,
      strategy: true,
      entryDate: true,
      exitDate: true,
      netPnL: true,
      returnPercentage: true,
      stopLoss: true,
      takeProfit: true,
      riskPercentage: true,
      entryPrice: true,
      exitPrice: true,
    },
    orderBy: {
      exitDate: "asc",
    },
  });

  const records: ClosedTradeRecord[] = trades.map((trade) => ({
    id: trade.id,
    asset: trade.asset,
    marketType: trade.marketType as MarketTypeValue,
    direction: trade.direction as DirectionValue,
    strategy: trade.strategy,
    entryDate: trade.entryDate,
    exitDate: trade.exitDate,
    netPnL: trade.netPnL,
    returnPercentage: trade.returnPercentage,
    stopLoss: trade.stopLoss,
    takeProfit: trade.takeProfit,
    riskPercentage: trade.riskPercentage,
    entryPrice: trade.entryPrice,
    exitPrice: trade.exitPrice,
  }));

  return buildInsightsFromTrades({
    trades: records,
    currency: account.currency,
    period,
  });
}
