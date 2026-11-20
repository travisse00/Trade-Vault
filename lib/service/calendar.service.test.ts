import { describe, it, expect, vi } from "vitest";
import Decimal from "decimal.js";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/service/account.service", () => ({
  getAuthenticatedAccount: vi.fn(),
}));

import {
  buildCalendarMonthDataFromTrades,
  getDayKeyInTimeZone,
  getMonthQueryBoundsUtc,
  getMonthGridRange,
  parseMonthParam,
} from "./calendar.service";

describe("calendar.service", () => {
  it("aggregates closed trades by day with correct daily and monthly totals", () => {
    const data = buildCalendarMonthDataFromTrades({
      year: 2026,
      month: 4,
      timezone: "UTC",
      currency: "USD",
      now: new Date("2026-04-10T12:00:00.000Z"),
      trades: [
        {
          id: "t1",
          asset: "EUR/USD",
          marketType: "FOREX",
          direction: "LONG",
          strategy: "Breakout",
          netPnL: new Decimal("120.50"),
          exitDate: new Date("2026-04-05T09:00:00.000Z"),
        },
        {
          id: "t2",
          asset: "GBP/USD",
          marketType: "FOREX",
          direction: "SHORT",
          strategy: "Reversal",
          netPnL: new Decimal("-20.50"),
          exitDate: new Date("2026-04-05T14:30:00.000Z"),
        },
        {
          id: "t3",
          asset: "BTC/USDT",
          marketType: "CRYPTO_SPOT",
          direction: "LONG",
          strategy: null,
          netPnL: new Decimal("-75.00"),
          exitDate: new Date("2026-04-06T08:00:00.000Z"),
        },
      ],
    });

    expect(data.summary.totalRealizedNetPnl).toBe("25.00");
    expect(data.summary.closedTrades).toBe(3);
    expect(data.summary.winningDays).toBe(1);
    expect(data.summary.losingDays).toBe(1);
    expect(data.summary.breakEvenDays).toBe(0);

    expect(data.days["2026-04-05"]).toMatchObject({
      date: "2026-04-05",
      netPnL: "100.00",
      tradeCount: 2,
    });
    expect(data.days["2026-04-05"].trades.map((trade) => trade.id)).toEqual([
      "t1",
      "t2",
    ]);
    expect(data.days["2026-04-05"].trades[0]).toMatchObject({
      asset: "EUR/USD",
      market: "Forex",
      direction: "LONG",
      strategy: "Breakout",
      netPnL: "120.50",
    });

    expect(data.days["2026-04-06"]).toMatchObject({
      date: "2026-04-06",
      netPnL: "-75.00",
      tradeCount: 1,
    });
  });

  it("counts break-even days separately from empty days", () => {
    const data = buildCalendarMonthDataFromTrades({
      year: 2026,
      month: 5,
      timezone: "UTC",
      currency: "USD",
      now: new Date("2026-05-02T00:00:00.000Z"),
      trades: [
        {
          id: "t1",
          asset: "EUR/USD",
          marketType: "FOREX",
          direction: "LONG",
          strategy: "Flat",
          netPnL: new Decimal("50.00"),
          exitDate: new Date("2026-05-10T10:00:00.000Z"),
        },
        {
          id: "t2",
          asset: "GBP/USD",
          marketType: "FOREX",
          direction: "SHORT",
          strategy: "Flat",
          netPnL: new Decimal("-50.00"),
          exitDate: new Date("2026-05-10T15:00:00.000Z"),
        },
      ],
    });

    expect(data.days["2026-05-10"]).toMatchObject({
      netPnL: "0.00",
      tradeCount: 2,
    });
    expect(data.summary.totalRealizedNetPnl).toBe("0.00");
    expect(data.summary.closedTrades).toBe(2);
    expect(data.summary.winningDays).toBe(0);
    expect(data.summary.losingDays).toBe(0);
    expect(data.summary.breakEvenDays).toBe(1);
    expect(data.days["2026-05-11"]).toBeUndefined();
  });

  it("returns an empty month summary when there are no closed trades", () => {
    const data = buildCalendarMonthDataFromTrades({
      year: 2026,
      month: 2,
      timezone: "Africa/Lagos",
      currency: "NGN",
      now: new Date("2026-02-15T12:00:00.000Z"),
      trades: [],
    });

    expect(data.days).toEqual({});
    expect(data.summary).toEqual({
      totalRealizedNetPnl: "0.00",
      closedTrades: 0,
      winningDays: 0,
      losingDays: 0,
      breakEvenDays: 0,
    });
    expect(data.today).toBe("2026-02-15");
    expect(data.monthStart).toBe("2026-02-01");
    expect(data.monthEnd).toBe("2026-02-28");
  });

  it("groups trades by exit date in the account timezone across UTC boundaries", () => {
    const trades = [
      {
        id: "late-utc",
        asset: "EUR/USD",
        marketType: "FOREX" as const,
        direction: "LONG" as const,
        strategy: null,
        netPnL: new Decimal("10"),
        // 2026-04-01 00:30 in Asia/Tokyo, but 2026-03-31 11:30 in America/New_York.
        exitDate: new Date("2026-03-31T15:30:00.000Z"),
      },
      {
        id: "early-utc",
        asset: "GBP/USD",
        marketType: "FOREX" as const,
        direction: "SHORT" as const,
        strategy: null,
        netPnL: new Decimal("20"),
        // 2026-04-01 09:30 in Asia/Tokyo, but 2026-03-31 20:30 in America/New_York.
        exitDate: new Date("2026-04-01T00:30:00.000Z"),
      },
    ];

    expect(getDayKeyInTimeZone(trades[0].exitDate!, "Asia/Tokyo")).toBe(
      "2026-04-01"
    );
    expect(getDayKeyInTimeZone(trades[1].exitDate!, "Asia/Tokyo")).toBe(
      "2026-04-01"
    );
    expect(getDayKeyInTimeZone(trades[0].exitDate!, "America/New_York")).toBe(
      "2026-03-31"
    );
    expect(getDayKeyInTimeZone(trades[1].exitDate!, "America/New_York")).toBe(
      "2026-03-31"
    );

    const tokyoApril = buildCalendarMonthDataFromTrades({
      year: 2026,
      month: 4,
      timezone: "Asia/Tokyo",
      currency: "USD",
      now: new Date("2026-04-10T00:00:00.000Z"),
      trades,
    });

    expect(Object.keys(tokyoApril.days)).toEqual(["2026-04-01"]);
    expect(tokyoApril.days["2026-04-01"].trades.map((t) => t.id)).toEqual([
      "late-utc",
      "early-utc",
    ]);
    expect(tokyoApril.summary.closedTrades).toBe(2);
    expect(tokyoApril.summary.totalRealizedNetPnl).toBe("30.00");

    const tokyoMarch = buildCalendarMonthDataFromTrades({
      year: 2026,
      month: 3,
      timezone: "Asia/Tokyo",
      currency: "USD",
      now: new Date("2026-03-15T00:00:00.000Z"),
      trades,
    });

    expect(tokyoMarch.days).toEqual({});
    expect(tokyoMarch.summary.closedTrades).toBe(0);

    const newYorkMarch = buildCalendarMonthDataFromTrades({
      year: 2026,
      month: 3,
      timezone: "America/New_York",
      currency: "USD",
      now: new Date("2026-03-15T00:00:00.000Z"),
      trades,
    });

    expect(Object.keys(newYorkMarch.days)).toEqual(["2026-03-31"]);
    expect(newYorkMarch.days["2026-03-31"].trades.map((t) => t.id)).toEqual([
      "late-utc",
      "early-utc",
    ]);
    expect(newYorkMarch.summary.closedTrades).toBe(2);

    const newYorkApril = buildCalendarMonthDataFromTrades({
      year: 2026,
      month: 4,
      timezone: "America/New_York",
      currency: "USD",
      now: new Date("2026-04-10T00:00:00.000Z"),
      trades,
    });

    expect(newYorkApril.days).toEqual({});
    expect(newYorkApril.summary.closedTrades).toBe(0);
  });

  it("computes a buffered UTC query window for month boundaries", () => {
    const bounds = getMonthQueryBoundsUtc(2026, 4);

    expect(bounds.gte.toISOString()).toBe("2026-03-31T10:00:00.000Z");
    expect(bounds.lt.toISOString()).toBe("2026-05-01T14:00:00.000Z");
  });

  it("parses month params and derives month grid metadata", () => {
    expect(parseMonthParam("2026-11")).toEqual({ year: 2026, month: 11 });
    expect(parseMonthParam("2026-00")).toBeNull();
    expect(parseMonthParam("2026-13")).toBeNull();
    expect(parseMonthParam("bad")).toBeNull();

    expect(getMonthGridRange(2026, 2)).toMatchObject({
      start: "2026-02-01",
      end: "2026-02-28",
      prevMonth: { year: 2026, month: 1 },
      nextMonth: { year: 2026, month: 3 },
    });

    expect(getMonthGridRange(2026, 1).prevMonth).toEqual({
      year: 2025,
      month: 12,
    });
  });
});
