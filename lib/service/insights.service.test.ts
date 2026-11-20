import { describe, it, expect, vi, beforeEach } from "vitest";
import Decimal from "decimal.js";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const mockFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trade: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

const mockGetAuthenticatedAccount = vi.fn();

vi.mock("@/lib/service/account.service", () => ({
  getAuthenticatedAccount: (...args: unknown[]) => mockGetAuthenticatedAccount(...args),
}));

import {
  buildInsightsFromTrades,
  classifySessionByUtcHour,
  getInsightsData,
  getPeriodWindow,
  getUtcDayOfWeekIndex,
  normalizeInsightsPeriod,
} from "./insights.service";

function makeTrade(overrides: Record<string, unknown> = {}) {
  return {
    id: "t1",
    asset: "EUR/USD",
    marketType: "FOREX" as const,
    direction: "LONG" as const,
    strategy: "Breakout",
    entryDate: new Date("2026-04-10T10:00:00.000Z"),
    exitDate: new Date("2026-04-10T12:00:00.000Z"),
    netPnL: new Decimal("100"),
    returnPercentage: new Decimal("10"),
    stopLoss: new Decimal("1.1000"),
    takeProfit: new Decimal("1.1200"),
    riskPercentage: new Decimal("1"),
    entryPrice: new Decimal("1.1100"),
    exitPrice: new Decimal("1.1150"),
    ...overrides,
  };
}

describe("insights.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("classifies sessions with UTC boundaries correctly", () => {
    expect(classifySessionByUtcHour(0)).toBe("asian");
    expect(classifySessionByUtcHour(7)).toBe("asian");
    expect(classifySessionByUtcHour(8)).toBe("london");
    expect(classifySessionByUtcHour(12)).toBe("london");
    expect(classifySessionByUtcHour(13)).toBe("newYork");
    expect(classifySessionByUtcHour(21)).toBe("newYork");
    expect(classifySessionByUtcHour(22)).toBe("other");
    expect(classifySessionByUtcHour(23)).toBe("other");
  });

  it("computes day-of-week grouping from entry date in UTC", () => {
    // 2026-04-13 is a Monday
    expect(getUtcDayOfWeekIndex(new Date("2026-04-13T00:00:00.000Z"))).toBe(0);
    expect(getUtcDayOfWeekIndex(new Date("2026-04-14T23:59:59.000Z"))).toBe(1);
    expect(getUtcDayOfWeekIndex(new Date("2026-04-19T12:00:00.000Z"))).toBe(6); // Sunday

    const data = buildInsightsFromTrades({
      currency: "USD",
      period: "all",
      now: new Date("2026-04-20T00:00:00.000Z"),
      trades: [
        makeTrade({
          id: "mon",
          entryDate: new Date("2026-04-13T07:00:00.000Z"), // Monday UTC
          exitDate: new Date("2026-04-13T09:00:00.000Z"),
          netPnL: new Decimal("50"),
        }),
        makeTrade({
          id: "sun",
          entryDate: new Date("2026-04-19T15:00:00.000Z"), // Sunday UTC
          exitDate: new Date("2026-04-19T16:00:00.000Z"),
          netPnL: new Decimal("-20"),
        }),
      ],
    });

    const monday = data.dayOfWeekPerformance.find((day) => day.day === "Monday");
    const sunday = data.dayOfWeekPerformance.find((day) => day.day === "Sunday");
    const tuesday = data.dayOfWeekPerformance.find((day) => day.day === "Tuesday");

    expect(monday).toMatchObject({ totalTrades: 1, netPnl: "50.00" });
    expect(sunday).toMatchObject({ totalTrades: 1, netPnl: "-20.00" });
    expect(tuesday).toMatchObject({ totalTrades: 0, netPnl: "0.00" });
  });

  it("calculates holding time stats for trades with valid timestamps", () => {
    const data = buildInsightsFromTrades({
      currency: "USD",
      period: "all",
      now: new Date("2026-04-20T00:00:00.000Z"),
      trades: [
        makeTrade({
          id: "win-short",
          entryDate: new Date("2026-04-10T10:00:00.000Z"),
          exitDate: new Date("2026-04-10T11:00:00.000Z"), // 1h
          netPnL: new Decimal("100"),
          returnPercentage: new Decimal("5"),
        }),
        makeTrade({
          id: "loss-long",
          entryDate: new Date("2026-04-11T10:00:00.000Z"),
          exitDate: new Date("2026-04-11T13:30:00.000Z"), // 3.5h
          netPnL: new Decimal("-40"),
          returnPercentage: new Decimal("-2"),
        }),
        makeTrade({
          id: "invalid",
          entryDate: new Date("2026-04-12T10:00:00.000Z"),
          exitDate: null,
          netPnL: new Decimal("0"),
          returnPercentage: null,
        }),
      ],
    });

    expect(data.holdingTime.tradesWithValidTimestamps).toBe(2);
    expect(data.holdingTime.averageMs).toBe(Math.round(((60 + 210) / 2) * 60 * 1000));
    expect(data.holdingTime.averageWinningMs).toBe(60 * 60 * 1000);
    expect(data.holdingTime.averageLosingMs).toBe(210 * 60 * 1000);
    expect(data.holdingTime.longestMs).toBe(210 * 60 * 1000);
    expect(data.holdingTime.shortestMs).toBe(60 * 60 * 1000);
    expect(data.holdingTime.longestTrade?.id).toBe("loss-long");
    expect(data.holdingTime.shortestTrade?.id).toBe("win-short");
  });

  it("computes risk/reward metrics and safely handles missing data", () => {
    const data = buildInsightsFromTrades({
      currency: "USD",
      period: "all",
      now: new Date("2026-04-20T00:00:00.000Z"),
      trades: [
        makeTrade({
          id: "rr-hit",
          direction: "LONG",
          entryPrice: new Decimal("100"),
          stopLoss: new Decimal("95"),
          takeProfit: new Decimal("110"),
          exitPrice: new Decimal("110"), // reached TP
          netPnL: new Decimal("100"),
          riskPercentage: new Decimal("1"),
        }),
        makeTrade({
          id: "rr-miss",
          direction: "SHORT",
          entryPrice: new Decimal("100"),
          stopLoss: new Decimal("104"),
          takeProfit: new Decimal("94"),
          exitPrice: new Decimal("96"), // did not reach TP (needs <= 94)
          netPnL: new Decimal("40"),
          riskPercentage: null,
        }),
        makeTrade({
          id: "missing-plan",
          stopLoss: null,
          takeProfit: null,
          riskPercentage: null,
          exitPrice: new Decimal("101"),
          netPnL: new Decimal("-10"),
        }),
      ],
    });

    expect(data.riskReward.tradesWithPlannedRR).toBe(2);
    // (10/5 + 6/4) / 2 = (2 + 1.5) / 2 = 1.75
    expect(data.riskReward.averagePlannedRR).toBe("1.75");
    expect(data.riskReward.tradesWithTakeProfit).toBe(2);
    expect(data.riskReward.tradesReachedOrExceededPlannedReward).toBe(1);
    expect(data.riskReward.reachedOrExceededPlannedRewardRate).toBe(50);
    expect(data.riskReward.tradesWithStopLoss).toBe(2);
    expect(data.riskReward.tradesWithRiskPercentage).toBe(1);
    expect(data.riskReward.tradesWithBothSlAndTp).toBe(2);
    expect(data.riskReward.averageActualReturnRelativeToInitialRisk).toBeNull();
    expect(data.riskReward.averageActualReturnRelativeToInitialRiskNote).toContain(
      "not stored"
    );
  });

  it("selects best and worst trades and computes win/loss averages", () => {
    const data = buildInsightsFromTrades({
      currency: "USD",
      period: "all",
      now: new Date("2026-04-20T00:00:00.000Z"),
      trades: [
        makeTrade({
          id: "big-win",
          asset: "BTC/USDT",
          marketType: "CRYPTO_SPOT",
          netPnL: new Decimal("300"),
          returnPercentage: new Decimal("12.5"),
        }),
        makeTrade({
          id: "small-win",
          asset: "ETH/USDT",
          marketType: "CRYPTO_SPOT",
          netPnL: new Decimal("100"),
          returnPercentage: new Decimal("20"),
        }),
        makeTrade({
          id: "big-loss",
          asset: "EUR/USD",
          netPnL: new Decimal("-250"),
          returnPercentage: new Decimal("-15"),
        }),
        makeTrade({
          id: "small-loss",
          asset: "GBP/USD",
          netPnL: new Decimal("-50"),
          returnPercentage: new Decimal("-1"),
        }),
      ],
    });

    expect(data.bestWorst.biggestWin?.id).toBe("big-win");
    expect(data.bestWorst.biggestLoss?.id).toBe("big-loss");
    expect(data.bestWorst.bestReturn?.id).toBe("small-win");
    expect(data.bestWorst.worstReturn?.id).toBe("big-loss");
    expect(data.bestWorst.averageWin).toBe("200.00");
    expect(data.bestWorst.averageLoss).toBe("-150.00");
    expect(data.bestWorst.winningTradeCount).toBe(2);
    expect(data.bestWorst.losingTradeCount).toBe(2);
    expect(data.bestWorst.biggestWin?.market).toBe("Crypto Spot");
  });

  it("computes winning/losing streaks and consistency summaries", () => {
    const data = buildInsightsFromTrades({
      currency: "USD",
      period: "all",
      now: new Date("2026-04-20T00:00:00.000Z"),
      trades: [
        makeTrade({ id: "t1", exitDate: new Date("2026-04-01T10:00:00.000Z"), netPnL: new Decimal("10") }),
        makeTrade({ id: "t2", exitDate: new Date("2026-04-02T10:00:00.000Z"), netPnL: new Decimal("20") }),
        makeTrade({ id: "t3", exitDate: new Date("2026-04-03T10:00:00.000Z"), netPnL: new Decimal("5") }),
        makeTrade({ id: "t4", exitDate: new Date("2026-04-04T10:00:00.000Z"), netPnL: new Decimal("-7") }),
        makeTrade({ id: "t5", exitDate: new Date("2026-04-05T10:00:00.000Z"), netPnL: new Decimal("-3") }),
      ],
    });

    expect(data.consistency.longestWinningStreak).toBe(3);
    expect(data.consistency.longestLosingStreak).toBe(2);
    expect(data.consistency.currentStreak).toEqual({ type: "loss", length: 2 });
    expect(data.consistency.trend).toHaveLength(5);
    expect(data.consistency.trend[4].cumulativeNetPnl).toBe("25.00");
  });

  it("handles empty datasets safely", () => {
    const data = buildInsightsFromTrades({
      currency: "USD",
      period: "30d",
      now: new Date("2026-04-20T00:00:00.000Z"),
      trades: [],
    });

    expect(data.closedTradesAnalyzed).toBe(0);
    expect(data.sessionPerformance.every((row) => row.totalTrades === 0)).toBe(true);
    expect(data.dayOfWeekPerformance.every((row) => row.totalTrades === 0)).toBe(true);
    expect(data.strongestDay).toBeNull();
    expect(data.weakestDay).toBeNull();
    expect(data.holdingTime.averageMs).toBeNull();
    expect(data.riskReward.averagePlannedRR).toBeNull();
    expect(data.bestWorst.biggestWin).toBeNull();
    expect(data.bestWorst.averageWin).toBeNull();
    expect(data.consistency.totalActiveDays).toBe(0);
    expect(data.consistency.trend).toEqual([]);
  });

  it("normalizes periods and computes period windows for date-range filtering", () => {
    expect(normalizeInsightsPeriod("7d")).toBe("7d");
    expect(normalizeInsightsPeriod("30")).toBe("30d");
    expect(normalizeInsightsPeriod("90")).toBe("90d");
    expect(normalizeInsightsPeriod("all")).toBe("all");
    expect(normalizeInsightsPeriod("unknown")).toBe("all");

    const now = new Date("2026-04-20T12:00:00.000Z");
    expect(getPeriodWindow("all", now).from).toBeNull();
    expect(getPeriodWindow("7d", now).from?.toISOString()).toBe("2026-04-13T12:00:00.000Z");
    expect(getPeriodWindow("30d", now).from?.toISOString()).toBe("2026-03-21T12:00:00.000Z");
    expect(getPeriodWindow("90d", now).from?.toISOString()).toBe("2026-01-20T12:00:00.000Z");
  });

  it("scopes insights queries to the authenticated account and period and enforces closed trades", async () => {
    mockGetAuthenticatedAccount.mockResolvedValue({
      account: { id: "acct-123", currency: "EUR" },
      userId: "user-1",
    });
    mockFindMany.mockResolvedValue([]);

    const nowBefore = Date.now();
    await getInsightsData("30d");

    expect(mockGetAuthenticatedAccount).toHaveBeenCalledTimes(1);
    expect(mockFindMany).toHaveBeenCalledTimes(1);

    const call = mockFindMany.mock.calls[0][0];
    expect(call.where.accountId).toBe("acct-123");
    expect(call.where.status).toBe("CLOSED");
    expect(call.where.exitDate.gte).toBeInstanceOf(Date);
    expect(call.where.exitDate.lte).toBeInstanceOf(Date);

    const gteMs = call.where.exitDate.gte.getTime();
    const lteMs = call.where.exitDate.lte.getTime();
    const approx30dMs = 30 * 24 * 60 * 60 * 1000;
    expect(lteMs).toBeGreaterThanOrEqual(nowBefore);
    expect(lteMs - gteMs).toBeGreaterThanOrEqual(approx30dMs - 2000);
    expect(lteMs - gteMs).toBeLessThanOrEqual(approx30dMs + 5000);
  });

  it("does not apply an exitDate range filter for all-time queries", async () => {
    mockGetAuthenticatedAccount.mockResolvedValue({
      account: { id: "acct-999", currency: "USD" },
      userId: "user-2",
    });
    mockFindMany.mockResolvedValue([]);

    await getInsightsData("all");

    const call = mockFindMany.mock.calls[0][0];
    expect(call.where).toEqual({
      accountId: "acct-999",
      status: "CLOSED",
    });
  });
});
