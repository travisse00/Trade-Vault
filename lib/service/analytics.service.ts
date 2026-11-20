
import "server-only";

import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedAccount,
  buildAccountOverview,
  type AccountOverview,
} from "@/lib/service/account.service";
import { formatDayLabel } from "@/lib/format";

/**
 * Server-side analytics for the dashboard.
 *
 * Every figure is derived from the signed-in user's actual records using
 * Decimal arithmetic. The payload is serializable for client components.
 */

type MarketTypeValue = "FOREX" | "CRYPTO_SPOT" | "CRYPTO_FUTURES";
type DirectionValue = "LONG" | "SHORT";
type TradeStatusValue = "OPEN" | "CLOSED";

const MARKET_LABELS: Record<MarketTypeValue, string> = {
  FOREX: "Forex",
  CRYPTO_SPOT: "Crypto Spot",
  CRYPTO_FUTURES: "Crypto Futures",
};

const MARKET_ORDER: MarketTypeValue[] = [
  "FOREX",
  "CRYPTO_SPOT",
  "CRYPTO_FUTURES",
];

const DAY_MS = 24 * 60 * 60 * 1000;

interface AnalyticsTrade {
  id: string;
  asset: string;
  marketType: MarketTypeValue;
  direction: DirectionValue;
  status: TradeStatusValue;
  strategy: string | null;
  netPnL: Decimal | null;
  grossPnL: Decimal | null;
  totalFees: Decimal | null;
  entryDate: Date;
  exitDate: Date | null;
}

interface AnalyticsTransaction {
  type: "DEPOSIT" | "WITHDRAWAL";
  amount: Decimal;
  createdAt: Date;
}

export type PerformancePeriod = "7D" | "30D" | "90D" | "All time";

export interface PerformancePoint {
  label: string;
  value: number;
}

export interface PerformanceHighlight {
  asset: string;
  pnl: string;
}

export interface AnalyticsSummary {
  realizedPnl: string;
  grossPnl: string;
  totalFees: string;
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number;
  profitFactor: number | null;
  averageWin: string;
  averageLoss: string;
  bestTrade: PerformanceHighlight | null;
  worstTrade: PerformanceHighlight | null;
}

export interface StrategyTrade {
  id: string;
  asset: string;
  market: string;
  direction: DirectionValue;
  status: TradeStatusValue;
  pnl: string;
  entryDate: string;
}

export interface StrategyBreakdown {
  name: string;
  totalTrades: number;
  closedCount: number;
  openCount: number;
  wins: number;
  losses: number;
  winRate: number;
  netPnl: string;
  grossProfit: string;
  grossLoss: string;
  profitFactor: number | null;
  trades: StrategyTrade[];
}

export interface MarketBreakdown {
  name: string;
  trades: number;
  pnl: string;
  percentage: number;
}

export interface RecentTradeItem {
  id: string;
  asset: string;
  market: string;
  direction: DirectionValue;
  status: TradeStatusValue;
  pnl: string | null;
  date: string;
}

export interface EquityPoint {
  label: string;
  balance: number;
}

export interface DrawdownPoint {
  label: string;
  drawdown: number;
  drawdownPercent: number;
}

export interface DrawdownSummary {
  chartData: DrawdownPoint[];
  currentDrawdown: number;
  currentDrawdownPercent: number | null;
  maxDrawdown: number;
  maxDrawdownPercent: number | null;
  currentEquity: number;
  isRecovered: boolean;
  hasDrawdown: boolean;
}

export interface AnalyticsData {
  currency: string;
  overview: AccountOverview;
  summary: AnalyticsSummary;
  performance: Record<PerformancePeriod, PerformancePoint[]>;
  strategies: StrategyBreakdown[];
  markets: MarketBreakdown[];
  recentTrades: RecentTradeItem[];
  equity: EquityPoint[];
  drawdown: DrawdownSummary;
}

function tradeDate(trade: AnalyticsTrade): Date {
  return trade.exitDate ?? trade.entryDate;
}

function sumDecimals(values: Decimal[]): Decimal {
  return values.reduce(
    (total, value) => total.plus(value),
    new Decimal(0)
  );
}

function buildPerformance(
  closedTrades: AnalyticsTrade[],
  now: Date
): Record<PerformancePeriod, PerformancePoint[]> {
  const sorted = [...closedTrades].sort(
    (a, b) => tradeDate(a).getTime() - tradeDate(b).getTime()
  );

  const windows: { period: PerformancePeriod; days: number | null }[] = [
    { period: "7D", days: 7 },
    { period: "30D", days: 30 },
    { period: "90D", days: 90 },
    { period: "All time", days: null },
  ];

  const result = {} as Record<PerformancePeriod, PerformancePoint[]>;

  for (const { period, days } of windows) {
    const from =
      days === null ? null : new Date(now.getTime() - days * DAY_MS);

    let running = new Decimal(0);
    const points: PerformancePoint[] = [];

    for (const trade of sorted) {
      const date = tradeDate(trade);

      if (from && date.getTime() < from.getTime()) continue;

      running = running.plus(trade.netPnL ?? 0);

      points.push({
        label: formatDayLabel(date),
        value: Number(running.toFixed(2)),
      });
    }

    points.unshift({
      label: from ? formatDayLabel(from) : "Start",
      value: 0,
    });

    result[period] = points;
  }

  return result;
}

function buildEquity(
  initialBalance: Decimal,
  transactions: AnalyticsTransaction[],
  closedTrades: AnalyticsTrade[]
): EquityPoint[] {
  const events = [
    ...transactions.map((transaction) => ({
      date: transaction.createdAt,
      delta:
        transaction.type === "DEPOSIT"
          ? new Decimal(transaction.amount)
          : new Decimal(transaction.amount).neg(),
    })),
    ...closedTrades.map((trade) => ({
      date: tradeDate(trade),
      delta: new Decimal(trade.netPnL ?? 0),
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const points: EquityPoint[] = [
    {
      label: "Start",
      balance: Number(initialBalance.toFixed(2)),
    },
  ];

  let running = initialBalance;

  for (const event of events) {
    running = running.plus(event.delta);

    points.push({
      label: formatDayLabel(event.date),
      balance: Number(running.toFixed(2)),
    });
  }

  return points;
}

function buildDrawdown(equity: EquityPoint[]): DrawdownSummary {
  let peak = equity[0]?.balance ?? 0;
  let maxDrawdown = 0;
  let maxDrawdownPercent: number | null = null;

  const chartData: DrawdownPoint[] = [];

  for (const point of equity) {
    peak = Math.max(peak, point.balance);

    const drawdown = peak - point.balance;
    const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : null;

    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownPercent = drawdownPercent;
    }

    chartData.push({
      label: point.label,
      drawdown: Number(drawdown.toFixed(2)),
      drawdownPercent:
        drawdownPercent === null
          ? 0
          : Number(drawdownPercent.toFixed(2)),
    });
  }

  const currentEquity = equity[equity.length - 1]?.balance ?? 0;
  const currentDrawdown = peak - currentEquity;
  const currentDrawdownPercent =
    peak > 0 ? (currentDrawdown / peak) * 100 : null;

  return {
    chartData,
    currentDrawdown: Number(currentDrawdown.toFixed(2)),
    currentDrawdownPercent:
      currentDrawdownPercent === null
        ? null
        : Number(currentDrawdownPercent.toFixed(2)),
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    maxDrawdownPercent:
      maxDrawdownPercent === null
        ? null
        : Number(maxDrawdownPercent.toFixed(2)),
    currentEquity: Number(currentEquity.toFixed(2)),
    isRecovered: currentDrawdown <= 0,
    hasDrawdown: maxDrawdown > 0,
  };
}

function buildSummary(trades: AnalyticsTrade[]): AnalyticsSummary {
  const closedTrades = trades.filter(
    (trade) => trade.status === "CLOSED"
  );

  const openTrades = trades.filter(
    (trade) => trade.status === "OPEN"
  );

  const wins = closedTrades.filter((trade) =>
    new Decimal(trade.netPnL ?? 0).greaterThan(0)
  );

  const losses = closedTrades.filter((trade) =>
    new Decimal(trade.netPnL ?? 0).lessThan(0)
  );

  const breakEven = closedTrades.length - wins.length - losses.length;

  const realizedPnl = sumDecimals(
    closedTrades.map((trade) => new Decimal(trade.netPnL ?? 0))
  );

  const grossPnl = sumDecimals(
    closedTrades.map((trade) => new Decimal(trade.grossPnL ?? 0))
  );

  const totalFees = sumDecimals(
    closedTrades.map((trade) => new Decimal(trade.totalFees ?? 0))
  );

  const grossProfit = sumDecimals(
    wins.map((trade) => new Decimal(trade.netPnL ?? 0))
  );

  const grossLoss = sumDecimals(
    losses.map((trade) => new Decimal(trade.netPnL ?? 0))
  ).abs();

  const averageWin = wins.length
    ? grossProfit.div(wins.length)
    : new Decimal(0);

  const averageLoss = losses.length
    ? grossLoss.div(losses.length)
    : new Decimal(0);

  const profitFactor = grossLoss.greaterThan(0)
    ? grossProfit.div(grossLoss).toNumber()
    : null;

  const best = closedTrades.reduce<AnalyticsTrade | null>(
    (current, trade) => {
      if (!current) return trade;

      return new Decimal(trade.netPnL ?? 0).greaterThan(
        current.netPnL ?? 0
      )
        ? trade
        : current;
    },
    null
  );

  const worst = closedTrades.reduce<AnalyticsTrade | null>(
    (current, trade) => {
      if (!current) return trade;

      return new Decimal(trade.netPnL ?? 0).lessThan(
        current.netPnL ?? 0
      )
        ? trade
        : current;
    },
    null
  );

  return {
    realizedPnl: realizedPnl.toFixed(2),
    grossPnl: grossPnl.toFixed(2),
    totalFees: totalFees.toFixed(2),
    totalTrades: trades.length,
    openTrades: openTrades.length,
    closedTrades: closedTrades.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    breakEvenTrades: breakEven,
    winRate: closedTrades.length
      ? (wins.length / closedTrades.length) * 100
      : 0,
    profitFactor,
    averageWin: averageWin.toFixed(2),
    averageLoss: averageLoss.toFixed(2),
    bestTrade: best
      ? {
          asset: best.asset,
          pnl: new Decimal(best.netPnL ?? 0).toFixed(2),
        }
      : null,
    worstTrade: worst
      ? {
          asset: worst.asset,
          pnl: new Decimal(worst.netPnL ?? 0).toFixed(2),
        }
      : null,
  };
}

function buildStrategies(trades: AnalyticsTrade[]): StrategyBreakdown[] {
  const groups = new Map<
    string,
    { name: string; trades: AnalyticsTrade[] }
  >();

  for (const trade of trades) {
    const name = trade.strategy?.trim();

    if (!name) continue;

    const key = name.toLowerCase();

    if (!groups.has(key)) {
      groups.set(key, { name, trades: [] });
    }

    groups.get(key)!.trades.push(trade);
  }

  return Array.from(groups.values())
    .map((group) => {
      const closed = group.trades.filter(
        (trade) => trade.status === "CLOSED"
      );

      const open = group.trades.filter(
        (trade) => trade.status === "OPEN"
      );

      const wins = closed.filter((trade) =>
        new Decimal(trade.netPnL ?? 0).greaterThan(0)
      );

      const losses = closed.filter((trade) =>
        new Decimal(trade.netPnL ?? 0).lessThan(0)
      );

      const grossProfit = sumDecimals(
        wins.map((trade) => new Decimal(trade.netPnL ?? 0))
      );

      const grossLoss = sumDecimals(
        losses.map((trade) => new Decimal(trade.netPnL ?? 0))
      ).abs();

      const netPnl = sumDecimals(
        closed.map((trade) => new Decimal(trade.netPnL ?? 0))
      );

      return {
        name: group.name,
        totalTrades: group.trades.length,
        closedCount: closed.length,
        openCount: open.length,
        wins: wins.length,
        losses: losses.length,
        winRate: closed.length
          ? (wins.length / closed.length) * 100
          : 0,
        netPnl: netPnl.toFixed(2),
        grossProfit: grossProfit.toFixed(2),
        grossLoss: grossLoss.toFixed(2),
        profitFactor: grossLoss.greaterThan(0)
          ? grossProfit.div(grossLoss).toNumber()
          : null,
        trades: group.trades.map((trade) => ({
          id: trade.id,
          asset: trade.asset,
          market: MARKET_LABELS[trade.marketType],
          direction: trade.direction,
          status: trade.status,
          pnl: new Decimal(trade.netPnL ?? 0).toFixed(2),
          entryDate: trade.entryDate.toISOString(),
        })),
      } satisfies StrategyBreakdown;
    })
    .sort((a, b) => Number(b.netPnl) - Number(a.netPnl));
}

function buildMarkets(trades: AnalyticsTrade[]): MarketBreakdown[] {
  const total = trades.length;

  return MARKET_ORDER.flatMap((marketType) => {
    const group = trades.filter(
      (trade) => trade.marketType === marketType
    );

    if (group.length === 0) return [];

    const pnl = sumDecimals(
      group
        .filter((trade) => trade.status === "CLOSED")
        .map((trade) => new Decimal(trade.netPnL ?? 0))
    );

    return [
      {
        name: MARKET_LABELS[marketType],
        trades: group.length,
        pnl: pnl.toFixed(2),
        percentage: total
          ? (group.length / total) * 100
          : 0,
      },
    ];
  });
}

async function loadAnalytics(): Promise<AnalyticsData> {
  const { account } = await getAuthenticatedAccount();

  const [trades, transactions, overview] = await Promise.all([
    prisma.trade.findMany({
      where: { accountId: account.id },
      select: {
        id: true,
        asset: true,
        marketType: true,
        direction: true,
        status: true,
        strategy: true,
        netPnL: true,
        grossPnL: true,
        totalFees: true,
        entryDate: true,
        exitDate: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),

    prisma.accountTransaction.findMany({
      where: { accountId: account.id },
      select: {
        type: true,
        amount: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),

    buildAccountOverview(account),
  ]);

  const typedTrades = trades as unknown as AnalyticsTrade[];

  const closedTrades = typedTrades.filter(
    (trade) => trade.status === "CLOSED"
  );

  const equity = buildEquity(
    new Decimal(account.initialBalance),
    transactions as unknown as AnalyticsTransaction[],
    closedTrades
  );

  return {
    currency: account.currency,
    overview,
    summary: buildSummary(typedTrades),
    performance: buildPerformance(closedTrades, new Date()),
    strategies: buildStrategies(typedTrades),
    markets: buildMarkets(typedTrades),

    recentTrades: typedTrades.map((trade) => ({
      id: trade.id,
      asset: trade.asset,
      market: MARKET_LABELS[trade.marketType],
      direction: trade.direction,
      status: trade.status,
      pnl:
        trade.netPnL === null
          ? null
          : new Decimal(trade.netPnL).toFixed(2),
      date: (trade.exitDate ?? trade.entryDate).toISOString(),
    })),

    equity,
    drawdown: buildDrawdown(equity),
  };
}

/** Everything the dashboard, analytics and strategies pages need. */
export async function getAnalyticsData(): Promise<AnalyticsData> {
  return loadAnalytics();
}