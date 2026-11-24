"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
} from "lucide-react";
import type { CalendarMonthData, CalendarDay } from "@/lib/service/calendar.service";
import { formatSignedCurrency } from "@/lib/format";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatMonthParam(year: number, month: number): string {
  return `${year}-${pad2(month)}`;
}

function getMonthNav(year: number, month: number) {
  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  return { prev, next };
}

function dayOfWeekMondayFirst(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return (day + 6) % 7;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function formatMonthTitle(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatDayHeading(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function getDayState(day: CalendarDay | undefined): "empty" | "profit" | "loss" | "break_even" {
  if (!day || day.tradeCount === 0) return "empty";
  const amount = Number(day.netPnL);
  if (amount > 0) return "profit";
  if (amount < 0) return "loss";
  return "break_even";
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "profit" | "loss" | "neutral";
}) {
  const toneClass =
    tone === "profit"
      ? "text-[#79B89A]"
      : tone === "loss"
        ? "text-[#D17A7A]"
        : "text-white";

  return (
    <div className="rounded-xl border border-[#292B2E] bg-[#17191B] p-4 sm:p-5">
      <p className="text-xs text-[#77797C]">{label}</p>
      <p className={`mt-3 text-xl font-semibold tabular-nums sm:text-2xl ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

export default function TradingCalendar({ data }: { data: CalendarMonthData }) {
  const { year, month, currency, days, today, summary, timezone } = data;
  const { prev, next } = getMonthNav(year, month);

  const [selectedDate, setSelectedDate] = useState<string | null>(() => {
    if (today >= data.monthStart && today <= data.monthEnd) return today;
    const firstWithTrades = Object.keys(days).sort()[0];
    return firstWithTrades ?? null;
  });

  const gridCells = useMemo(() => {
    const totalDays = daysInMonth(year, month);
    const firstKey = `${year}-${pad2(month)}-01`;
    const leading = dayOfWeekMondayFirst(firstKey);
    const cells: Array<{ key: string; dateKey: string | null; dayNumber: number | null }> = [];

    for (let i = 0; i < leading; i += 1) {
      cells.push({ key: `lead-${i}`, dateKey: null, dayNumber: null });
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const dateKey = `${year}-${pad2(month)}-${pad2(day)}`;
      cells.push({ key: dateKey, dateKey, dayNumber: day });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ key: `trail-${cells.length}`, dateKey: null, dayNumber: null });
    }

    return cells;
  }, [year, month]);

  const selectedDay = selectedDate ? days[selectedDate] : undefined;

  const totalTone =
    Number(summary.totalRealizedNetPnl) > 0
      ? "profit"
      : Number(summary.totalRealizedNetPnl) < 0
        ? "loss"
        : "neutral";

  return (
    <div className="min-h-screen min-w-0 p-4 text-white sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trading Calendar</h1>
          <p className="mt-1 text-sm text-[#77797C]">
            Review closed trades and realized performance by day.
          </p>
          <p className="mt-1 text-xs text-[#686A6D]">
            Grouped by trade exit date in {timezone}.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start rounded-xl border border-[#292B2E] bg-[#17191B] p-1.5">
          <Link
            href={`/calendar?month=${formatMonthParam(prev.year, prev.month)}`}
            aria-label="Previous month"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#A7A9AC] transition hover:bg-[#202225] hover:text-white"
          >
            <ChevronLeft size={18} />
          </Link>

          <div className="min-w-[10rem] px-2 text-center text-sm font-medium text-white sm:min-w-[12rem]">
            {formatMonthTitle(year, month)}
          </div>

          <Link
            href={`/calendar?month=${formatMonthParam(next.year, next.month)}`}
            aria-label="Next month"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#A7A9AC] transition hover:bg-[#202225] hover:text-white"
          >
            <ChevronRight size={18} />
          </Link>
        </div>
      </div>

      <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Total Realized Net P&L"
          value={formatSignedCurrency(summary.totalRealizedNetPnl, currency)}
          tone={totalTone}
        />
        <SummaryCard
          label="Closed Trades"
          value={String(summary.closedTrades)}
          tone="neutral"
        />
        <SummaryCard
          label="Winning Days"
          value={String(summary.winningDays)}
          tone={summary.winningDays > 0 ? "profit" : "neutral"}
        />
        <SummaryCard
          label="Losing Days"
          value={String(summary.losingDays)}
          tone={summary.losingDays > 0 ? "loss" : "neutral"}
        />
        <SummaryCard
          label="Break-even Days"
          value={String(summary.breakEvenDays)}
          tone="neutral"
        />
      </div>

      <div className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-xl border border-[#292B2E] bg-[#17191B]">
          <div className="border-b border-[#292B2E] px-4 py-4 sm:px-5">
            <h2 className="text-base font-semibold text-white">Monthly Calendar</h2>
            <p className="mt-1 text-xs text-[#77797C]">
              Only closed trades contribute to daily realized performance.
            </p>
          </div>

          <div className="p-3 sm:p-4">
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[#686A6D] sm:text-xs"
                >
                  {day}
                </div>
              ))}

              {gridCells.map((cell) => {
                if (!cell.dateKey || cell.dayNumber === null) {
                  return (
                    <div
                      key={cell.key}
                      className="min-h-[72px] rounded-lg border border-transparent bg-transparent sm:min-h-[96px]"
                      aria-hidden="true"
                    />
                  );
                }

                const dateKey = cell.dateKey;
                const day = days[dateKey];
                const state = getDayState(day);
                const isToday = dateKey === today;
                const isSelected = dateKey === selectedDate;

                const stateClasses =
                  state === "profit"
                    ? "border-[#315341] bg-[#18241E] hover:border-[#3E6A52]"
                    : state === "loss"
                      ? "border-[#4A3131] bg-[#241818] hover:border-[#6A4343]"
                      : state === "break_even"
                        ? "border-[#474A4E] bg-[#202225] hover:border-[#5C6066]"
                        : "border-[#292B2E] bg-[#131516] hover:border-[#3A3D41]";

                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => setSelectedDate(dateKey)}
                    className={`flex min-h-[72px] flex-col rounded-lg border p-2 text-left transition sm:min-h-[96px] sm:p-2.5 ${stateClasses} ${
                      isSelected ? "ring-1 ring-[#A7A9AC]" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span
                        className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1 text-xs font-medium sm:text-sm ${
                          isToday
                            ? "bg-[#A7A9AC] text-[#101112]"
                            : "text-[#C4C6C8]"
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {day && day.tradeCount > 0 && (
                        <span className="rounded bg-[#101112]/60 px-1.5 py-0.5 text-[10px] text-[#A7A9AC]">
                          {day.tradeCount}
                        </span>
                      )}
                    </div>

                    <div className="mt-auto pt-2">
                      {day && day.tradeCount > 0 ? (
                        <>
                          <p
                            className={`truncate text-[11px] font-semibold tabular-nums sm:text-xs ${
                              state === "profit"
                                ? "text-[#79B89A]"
                                : state === "loss"
                                  ? "text-[#D17A7A]"
                                  : "text-[#C4C6C8]"
                            }`}
                          >
                            {formatSignedCurrency(day.netPnL, currency)}
                          </p>
                          <p className="mt-0.5 text-[10px] text-[#77797C]">
                            {day.tradeCount} closed
                          </p>
                        </>
                      ) : (
                        <p className="text-[10px] text-[#55585C]">No trades</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[#77797C]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm border border-[#315341] bg-[#18241E]" />
                Profitable day
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm border border-[#4A3131] bg-[#241818]" />
                Losing day
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm border border-[#474A4E] bg-[#202225]" />
                Break-even day
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm border border-[#292B2E] bg-[#131516]" />
                No closed trades
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#292B2E] bg-[#17191B]">
          <div className="border-b border-[#292B2E] px-4 py-4 sm:px-5">
            <h2 className="text-base font-semibold text-white">Daily Details</h2>
            <p className="mt-1 text-xs text-[#77797C]">
              {selectedDate ? formatDayHeading(selectedDate) : "Select a day to view closed trades."}
            </p>
          </div>

          <div className="p-4 sm:p-5">
            {!selectedDate ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#303236] bg-[#202225] text-[#A7A9AC]">
                  <CalendarDays size={20} />
                </div>
                <p className="mt-4 text-sm font-medium text-white">Select a day</p>
                <p className="mt-2 max-w-xs text-xs leading-5 text-[#77797C]">
                  Click any date on the calendar to review the trades closed on that day.
                </p>
              </div>
            ) : !selectedDay || selectedDay.tradeCount === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#303236] bg-[#202225] text-[#A7A9AC]">
                  <CalendarDays size={20} />
                </div>
                <p className="mt-4 text-sm font-medium text-white">
                  No closed trades
                </p>
                <p className="mt-2 max-w-xs text-xs leading-5 text-[#77797C]">
                  No trades were closed on this date. Open trades do not appear in the calendar.
                </p>
              </div>
            ) : (
              <div>
                <div className="rounded-lg border border-[#292B2E] bg-[#131516] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-[#77797C]">Net realized P&L</p>
                    <p
                      className={`text-sm font-semibold tabular-nums ${
                        Number(selectedDay.netPnL) > 0
                          ? "text-[#79B89A]"
                          : Number(selectedDay.netPnL) < 0
                            ? "text-[#D17A7A]"
                            : "text-[#C4C6C8]"
                      }`}
                    >
                      {formatSignedCurrency(selectedDay.netPnL, currency)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-[#686A6D]">
                    {selectedDay.tradeCount} closed trade
                    {selectedDay.tradeCount === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  {selectedDay.trades.map((trade) => {
                    const pnl = Number(trade.netPnL);
                    const pnlClass =
                      pnl > 0
                        ? "text-[#79B89A]"
                        : pnl < 0
                          ? "text-[#D17A7A]"
                          : "text-[#C4C6C8]";

                    return (
                      <div
                        key={trade.id}
                        className="rounded-lg border border-[#292B2E] bg-[#131516] p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {trade.asset}
                            </p>
                            <p className="mt-1 text-xs text-[#77797C]">
                              {trade.market}
                            </p>
                          </div>

                          <p className={`shrink-0 text-sm font-semibold tabular-nums ${pnlClass}`}>
                            {formatSignedCurrency(trade.netPnL, currency)}
                          </p>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-medium ${
                              trade.direction === "LONG"
                                ? "border-[#315341] bg-[#1B2921] text-[#79B89A]"
                                : "border-[#4A3131] bg-[#291B1B] text-[#D17A7A]"
                            }`}
                          >
                            {trade.direction === "LONG" ? (
                              <ArrowUpRight size={12} />
                            ) : (
                              <ArrowDownRight size={12} />
                            )}
                            {trade.direction === "LONG" ? "Long" : "Short"}
                          </span>

                          <span className="rounded-md border border-[#303236] bg-[#202225] px-2 py-0.5 text-[#A7A9AC]">
                            {trade.strategy?.trim() ? trade.strategy : "No strategy"}
                          </span>
                        </div>

                        <Link
                          href={`/trades/${trade.id}`}
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#A7A9AC] transition hover:text-white"
                        >
                          View trade details
                          <ExternalLink size={13} />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
