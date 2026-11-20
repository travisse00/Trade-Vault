"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  Clock3,
  ExternalLink,
  Filter,
  ShieldCheck,
  Target,
  TrendingUp,
} from "lucide-react";
import type {
  InsightsData,
  InsightsPeriod,
  InsightsTradeRef,
  SessionPerformanceRow,
  DayOfWeekRow,
} from "@/lib/service/insights.service";
import { formatCurrency, formatPercent } from "@/lib/format";

const PERIOD_OPTIONS: { value: InsightsPeriod; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

function formatDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return "—";

  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const totalHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (totalHours < 24) {
    return minutes > 0 ? `${totalHours}h ${minutes}m` : `${totalHours}h`;
  }

  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

function formatWinRate(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}%`;
}

function formatSignedCurrency(value: string | null, currency: string): string {
  if (value === null) return "—";
  return formatCurrency(value, currency, { signed: true });
}

function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatDateTimeUtc(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  return (
    new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      hour12: false,
    }).format(date) + " UTC"
  );
}

function pnlClass(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "text-[#77797C]";
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount === 0) return "text-[#C4C6C8]";
  return amount > 0 ? "text-[#79B89A]" : "text-[#D17A7A]";
}

function Section({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#292B2E] bg-[#17191B] p-4 sm:p-5 lg:p-6">
      <div className="mb-5 flex items-start gap-3">
        {icon ? (
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#303236] bg-[#202225] text-[#A7A9AC]">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-white sm:text-lg">{title}</h2>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-[#77797C] sm:text-sm">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function StatItem({
  label,
  value,
  valueClassName,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-[#292B2E] bg-[#131516] p-3 sm:p-4">
      <p className="text-xs text-[#77797C]">{label}</p>
      <p
        className={`mt-2 text-lg font-semibold tabular-nums sm:text-xl ${valueClassName ?? "text-white"}`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] leading-4 text-[#686A6D]">{hint}</p> : null}
    </div>
  );
}

function TradeRefCard({
  label,
  trade,
  currency,
  kind,
}: {
  label: string;
  trade: InsightsTradeRef | null;
  currency: string;
  kind: "win" | "loss" | "return-best" | "return-worst" | "neutral";
}) {
  if (!trade) {
    return (
      <div className="rounded-lg border border-[#292B2E] bg-[#131516] p-4">
        <p className="text-xs text-[#77797C]">{label}</p>
        <p className="mt-3 text-sm text-[#686A6D]">No trade available in this period.</p>
      </div>
    );
  }

  const amount = Number(trade.netPnL);
  const isPositive = amount > 0;
  const tone =
    kind === "loss" || kind === "return-worst"
      ? "text-[#D17A7A]"
      : kind === "win" || kind === "return-best"
        ? "text-[#79B89A]"
        : isPositive
          ? "text-[#79B89A]"
          : amount < 0
            ? "text-[#D17A7A]"
            : "text-[#C4C6C8]";

  return (
    <div className="rounded-lg border border-[#292B2E] bg-[#131516] p-4">
      <p className="text-xs text-[#77797C]">{label}</p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{trade.asset}</p>
          <p className="mt-1 text-xs text-[#77797C]">
            {trade.market} · {trade.direction === "LONG" ? "Long" : "Short"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-sm font-semibold tabular-nums ${tone}`}>
            {formatSignedCurrency(trade.netPnL, currency)}
          </p>
          <p className="mt-1 text-xs tabular-nums text-[#A7A9AC]">
            {trade.returnPercentage !== null
              ? formatPercent(trade.returnPercentage)
              : "—"}
          </p>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-[#686A6D]">
        Exit: {formatDateTimeUtc(trade.exitDate)}
      </p>
      <Link
        href={`/trades/${trade.id}`}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#A7A9AC] transition hover:text-white"
      >
        View trade details
        <ExternalLink size={13} />
      </Link>
    </div>
  );
}

function SessionChartTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ payload: SessionPerformanceRow }>;
  currency: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;

  return (
    <div className="rounded-lg border border-[#303236] bg-[#17191B] px-3 py-2 shadow-xl">
      <p className="text-xs font-medium text-white">{row.label}</p>
      <p className="mt-1 text-[11px] text-[#77797C]">{row.windowUtc}</p>
      <p className="mt-2 text-xs text-[#C4C6C8]">Trades: {row.totalTrades}</p>
      <p className={`text-xs ${pnlClass(row.netPnl)}`}>
        Net P&L: {formatSignedCurrency(row.netPnl, currency)}
      </p>
      <p className="text-xs text-[#C4C6C8]">Win rate: {formatWinRate(row.winRate)}</p>
      <p className="text-xs text-[#C4C6C8]">
        Avg P&L: {formatSignedCurrency(row.averagePnl, currency)}
      </p>
    </div>
  );
}

function DayChartTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ payload: DayOfWeekRow & { shortDay: string } }>;
  currency: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;

  return (
    <div className="rounded-lg border border-[#303236] bg-[#17191B] px-3 py-2 shadow-xl">
      <p className="text-xs font-medium text-white">{row.day}</p>
      <p className="mt-2 text-xs text-[#C4C6C8]">Trades: {row.totalTrades}</p>
      <p className={`text-xs ${pnlClass(row.netPnl)}`}>
        Net P&L: {formatSignedCurrency(row.netPnl, currency)}
      </p>
      <p className="text-xs text-[#C4C6C8]">Win rate: {formatWinRate(row.winRate)}</p>
    </div>
  );
}

function TrendTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ payload: { date: string; cumulativeNetPnl: string; tradeNetPnl: string } }>;
  currency: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;

  return (
    <div className="rounded-lg border border-[#303236] bg-[#17191B] px-3 py-2 shadow-xl">
      <p className="text-xs font-medium text-white">{formatDateLabel(row.date)}</p>
      <p className={`mt-2 text-xs ${pnlClass(row.cumulativeNetPnl)}`}>
        Cumulative: {formatSignedCurrency(row.cumulativeNetPnl, currency)}
      </p>
      <p className={`text-xs ${pnlClass(row.tradeNetPnl)}`}>
        Trade P&L: {formatSignedCurrency(row.tradeNetPnl, currency)}
      </p>
    </div>
  );
}

export default function TradeInsightsView({ data }: { data: InsightsData }) {
  const { currency, period } = data;
  const hasTrades = data.closedTradesAnalyzed > 0;

  const sessionChartData = data.sessionPerformance;
  const dayChartData = data.dayOfWeekPerformance.map((day) => ({
    ...day,
    shortDay: day.day.slice(0, 3),
    netValue: Number(day.netPnl),
  }));
  const trendData = data.consistency.trend.map((point, index) => ({
    ...point,
    index: index + 1,
    cumulativeValue: Number(point.cumulativeNetPnl),
  }));

  return (
    <div className="min-h-screen min-w-0 p-4 text-white sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Trade Insights</h1>
          <p className="mt-1 max-w-3xl text-sm text-[#77797C]">
            Behavioral analysis of your closed trades to highlight patterns in timing,
            duration, risk management, and consistency.
          </p>
          <p className="mt-2 text-xs leading-5 text-[#686A6D]">{data.timezoneNote}</p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="inline-flex items-center gap-2 text-xs text-[#77797C]">
            <Filter size={14} />
            Date range (by trade exit date)
          </div>
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-[#292B2E] bg-[#17191B] p-1.5">
            {PERIOD_OPTIONS.map((option) => {
              const active = option.value === period;
              return (
                <Link
                  key={option.value}
                  href={
                    option.value === "all"
                      ? "/insights"
                      : `/insights?period=${option.value}`
                  }
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                    active
                      ? "bg-[#F0F0F0] text-[#111213]"
                      : "text-[#92969A] hover:bg-[#202225] hover:text-white"
                  }`}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatItem
          label="Period"
          value={data.periodLabel}
          hint={`Analyzed: ${data.closedTradesAnalyzed} closed trade${data.closedTradesAnalyzed === 1 ? "" : "s"}`}
        />
        <StatItem
          label="Winning Days (UTC, by exit)"
          value={String(data.consistency.winningDays)}
          valueClassName={data.consistency.winningDays > 0 ? "text-[#79B89A]" : "text-white"}
        />
        <StatItem
          label="Losing Days (UTC, by exit)"
          value={String(data.consistency.losingDays)}
          valueClassName={data.consistency.losingDays > 0 ? "text-[#D17A7A]" : "text-white"}
        />
        <StatItem
          label="Current Streak (trades)"
          value={
            data.consistency.currentStreak.type === "none"
              ? "—"
              : `${data.consistency.currentStreak.length} ${
                  data.consistency.currentStreak.type === "win"
                    ? "win"
                    : data.consistency.currentStreak.type === "loss"
                      ? "loss"
                      : "break-even"
                }`
          }
          valueClassName={
            data.consistency.currentStreak.type === "win"
              ? "text-[#79B89A]"
              : data.consistency.currentStreak.type === "loss"
                ? "text-[#D17A7A]"
                : "text-white"
          }
        />
      </div>

      {!hasTrades ? (
        <div className="mt-7 rounded-xl border border-[#292B2E] bg-[#17191B] p-10 text-center sm:p-14">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-[#303236] bg-[#202225] text-[#A7A9AC]">
            <Activity size={22} />
          </div>
          <p className="mt-5 text-base font-semibold text-white">No closed trades in this period</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#77797C]">
            Trade Insights are calculated from closed trades only. Close trades or choose a
            wider date range to see session, holding-time, risk/reward, and consistency patterns.
          </p>
        </div>
      ) : (
        <div className="mt-7 space-y-6">
          <Section
            title="Trading Session Performance"
            description="Closed trades grouped by entry time in UTC. Use this to compare when you enter trades, not when they close."
            icon={<Clock3 size={18} />}
          >
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div className="h-72 w-full rounded-lg border border-[#292B2E] bg-[#131516] p-3 sm:p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sessionChartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke="#242628" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#77797C", fontSize: 11 }}
                      axisLine={{ stroke: "#292B2E" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#77797C", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value: number) => {
                        const abs = Math.abs(value);
                        if (abs >= 1000) return `${(value / 1000).toFixed(1)}k`;
                        return `${Math.round(value)}`;
                      }}
                    />
                    <Tooltip
                      content={<SessionChartTooltip currency={currency} />}
                      cursor={{ fill: "rgba(167,169,172,0.06)" }}
                    />
                    <Bar dataKey="totalTrades" name="Trades" radius={[4, 4, 0, 0]}>
                      {sessionChartData.map((row) => (
                        <Cell
                          key={row.session}
                          fill={
                            Number(row.netPnl) > 0
                              ? "#3F6B55"
                              : Number(row.netPnl) < 0
                                ? "#6B4343"
                                : "#4A4D52"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {sessionChartData.map((row) => (
                  <div
                    key={row.session}
                    className="rounded-lg border border-[#292B2E] bg-[#131516] p-3 sm:p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{row.label}</p>
                        <p className="mt-0.5 text-[11px] text-[#686A6D]">{row.windowUtc}</p>
                      </div>
                      <p className={`text-sm font-semibold tabular-nums ${pnlClass(row.netPnl)}`}>
                        {formatSignedCurrency(row.netPnl, currency)}
                      </p>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-[#77797C]">Trades</p>
                        <p className="mt-1 font-medium text-white">{row.totalTrades}</p>
                      </div>
                      <div>
                        <p className="text-[#77797C]">Win rate</p>
                        <p className="mt-1 font-medium text-white">{formatWinRate(row.winRate)}</p>
                      </div>
                      <div>
                        <p className="text-[#77797C]">Avg P&L</p>
                        <p className={`mt-1 font-medium ${pnlClass(row.averagePnl)}`}>
                          {formatSignedCurrency(row.averagePnl, currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-4 text-xs text-[#686A6D]">
              Trades entered at 22:00–23:59 UTC are shown as outside the defined Asian, London, and
              New York windows so no closed trades are omitted.
            </p>
          </Section>

          <Section
            title="Day-of-Week Performance"
            description="Closed trades grouped by the weekday of their entry date (UTC)."
            icon={<CalendarClock size={18} />}
          >
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div className="h-72 w-full rounded-lg border border-[#292B2E] bg-[#131516] p-3 sm:p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayChartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke="#242628" vertical={false} />
                    <XAxis
                      dataKey="shortDay"
                      tick={{ fill: "#77797C", fontSize: 11 }}
                      axisLine={{ stroke: "#292B2E" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#77797C", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value: number) => {
                        const abs = Math.abs(value);
                        if (abs >= 1000) return `${(value / 1000).toFixed(1)}k`;
                        return `${Math.round(value)}`;
                      }}
                    />
                    <Tooltip
                      content={<DayChartTooltip currency={currency} />}
                      cursor={{ fill: "rgba(167,169,172,0.06)" }}
                    />
                    <Bar dataKey="netValue" name="Net P&L" radius={[4, 4, 0, 0]}>
                      {dayChartData.map((row) => (
                        <Cell
                          key={row.day}
                          fill={
                            row.netValue > 0
                              ? "#3F6B55"
                              : row.netValue < 0
                                ? "#6B4343"
                                : "#4A4D52"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <StatItem
                    label="Strongest day"
                    value={data.strongestDay ? data.strongestDay.day : "Not enough data"}
                    valueClassName={data.strongestDay ? "text-[#79B89A]" : "text-[#77797C]"}
                    hint={
                      data.strongestDay
                        ? `${formatSignedCurrency(data.strongestDay.netPnl, currency)} · ${formatWinRate(data.strongestDay.winRate)} win rate`
                        : "Shown when at least two weekdays have closed trades."
                    }
                  />
                  <StatItem
                    label="Weakest day"
                    value={data.weakestDay ? data.weakestDay.day : "Not enough data"}
                    valueClassName={data.weakestDay ? "text-[#D17A7A]" : "text-[#77797C]"}
                    hint={
                      data.weakestDay
                        ? `${formatSignedCurrency(data.weakestDay.netPnl, currency)} · ${formatWinRate(data.weakestDay.winRate)} win rate`
                        : "Shown when at least two weekdays have closed trades."
                    }
                  />
                </div>

                <div className="rounded-lg border border-[#292B2E] bg-[#131516] p-3 sm:p-4">
                  <div className="grid grid-cols-4 gap-2 text-[11px] uppercase tracking-wide text-[#686A6D]">
                    <span>Day</span>
                    <span className="text-right">Trades</span>
                    <span className="text-right">Net P&L</span>
                    <span className="text-right">Win rate</span>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {data.dayOfWeekPerformance.map((row) => {
                      const isStrongest = data.strongestDay?.day === row.day;
                      const isWeakest = data.weakestDay?.day === row.day;
                      return (
                        <div
                          key={row.day}
                          className={`grid grid-cols-4 items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
                            isStrongest
                              ? "bg-[#18241E]"
                              : isWeakest
                                ? "bg-[#241818]"
                                : ""
                          }`}
                        >
                          <span className="text-[#C4C6C8]">
                            {row.day.slice(0, 3)}
                            {isStrongest ? " · best" : isWeakest ? " · weak" : ""}
                          </span>
                          <span className="text-right tabular-nums text-white">{row.totalTrades}</span>
                          <span className={`text-right tabular-nums ${pnlClass(row.netPnl)}`}>
                            {formatSignedCurrency(row.netPnl, currency)}
                          </span>
                          <span className="text-right tabular-nums text-[#A7A9AC]">
                            {formatWinRate(row.winRate)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Section
              title="Holding Time Analysis"
              description="Calculated from entry and exit timestamps on closed trades with valid dates."
              icon={<Clock3 size={18} />}
            >
              {data.holdingTime.tradesWithValidTimestamps === 0 ? (
                <p className="text-sm text-[#77797C]">
                  No closed trades with valid entry and exit timestamps are available in this period.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <StatItem
                    label="Average holding time"
                    value={formatDuration(data.holdingTime.averageMs)}
                    hint={`${data.holdingTime.tradesWithValidTimestamps} trade${data.holdingTime.tradesWithValidTimestamps === 1 ? "" : "s"} included`}
                  />
                  <StatItem
                    label="Average (winning trades)"
                    value={formatDuration(data.holdingTime.averageWinningMs)}
                    valueClassName={
                      data.holdingTime.averageWinningMs !== null ? "text-[#79B89A]" : "text-[#77797C]"
                    }
                  />
                  <StatItem
                    label="Average (losing trades)"
                    value={formatDuration(data.holdingTime.averageLosingMs)}
                    valueClassName={
                      data.holdingTime.averageLosingMs !== null ? "text-[#D17A7A]" : "text-[#77797C]"
                    }
                  />
                  <StatItem
                    label="Longest / shortest"
                    value={`${formatDuration(data.holdingTime.longestMs)} / ${formatDuration(data.holdingTime.shortestMs)}`}
                  />
                  <div className="sm:col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <TradeRefCard
                      label="Longest holding time"
                      trade={data.holdingTime.longestTrade}
                      currency={currency}
                      kind="neutral"
                    />
                    <TradeRefCard
                      label="Shortest holding time"
                      trade={data.holdingTime.shortestTrade}
                      currency={currency}
                      kind="neutral"
                    />
                  </div>
                </div>
              )}
            </Section>

            <Section
              title="Risk/Reward Analysis"
              description="Based only on stored stop-loss, take-profit, risk, and closed-trade result fields."
              icon={<ShieldCheck size={18} />}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <StatItem
                  label="Average planned R:R"
                  value={
                    data.riskReward.averagePlannedRR !== null
                      ? `${data.riskReward.averagePlannedRR}R`
                      : "—"
                  }
                  hint={`${data.riskReward.tradesWithPlannedRR} trade${data.riskReward.tradesWithPlannedRR === 1 ? "" : "s"} with both stop-loss and take-profit`}
                />
                <StatItem
                  label="Reached/exceeded planned reward"
                  value={formatWinRate(data.riskReward.reachedOrExceededPlannedRewardRate)}
                  hint={`${data.riskReward.tradesReachedOrExceededPlannedReward} of ${data.riskReward.tradesWithTakeProfit} trades with take-profit`}
                />
                <StatItem
                  label="Actual return vs initial risk"
                  value="Not available"
                  valueClassName="text-[#A7A9AC]"
                  hint={data.riskReward.averageActualReturnRelativeToInitialRiskNote}
                />
                <StatItem
                  label="Risk data coverage"
                  value={`${data.riskReward.tradesWithBothSlAndTp}/${data.riskReward.closedTradesAnalyzed}`}
                  hint={`SL: ${data.riskReward.tradesWithStopLoss}, TP: ${data.riskReward.tradesWithTakeProfit}, Risk %: ${data.riskReward.tradesWithRiskPercentage}`}
                />
              </div>
              <div className="mt-3 rounded-lg border border-[#292B2E] bg-[#131516] p-3 sm:p-4">
                <p className="text-xs font-medium text-[#C4C6C8]">Notes</p>
                <ul className="mt-2 space-y-1.5 text-xs leading-5 text-[#77797C]">
                  <li>• {data.riskReward.consistencyNote}</li>
                  <li>• {data.riskReward.reachedOrExceededPlannedRewardNote}</li>
                  <li>• Trades missing stop-loss, take-profit, or risk data are excluded from the metrics that require them.</li>
                </ul>
              </div>
            </Section>
          </div>

          <Section
            title="Best and Worst Trades"
            description="Highlights from closed trades in the selected period. P&L and return values use stored/calculated trade results."
            icon={<TrendingUp size={18} />}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <TradeRefCard
                label="Biggest winning trade"
                trade={data.bestWorst.biggestWin}
                currency={currency}
                kind="win"
              />
              <TradeRefCard
                label="Biggest losing trade"
                trade={data.bestWorst.biggestLoss}
                currency={currency}
                kind="loss"
              />
              <TradeRefCard
                label="Best percentage return"
                trade={data.bestWorst.bestReturn}
                currency={currency}
                kind="return-best"
              />
              <TradeRefCard
                label="Worst percentage return"
                trade={data.bestWorst.worstReturn}
                currency={currency}
                kind="return-worst"
              />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <StatItem
                label="Average winning trade"
                value={formatSignedCurrency(data.bestWorst.averageWin, currency)}
                valueClassName={data.bestWorst.averageWin ? "text-[#79B89A]" : "text-[#77797C]"}
                hint={`${data.bestWorst.winningTradeCount} winning trade${data.bestWorst.winningTradeCount === 1 ? "" : "s"}`}
              />
              <StatItem
                label="Average losing trade"
                value={formatSignedCurrency(data.bestWorst.averageLoss, currency)}
                valueClassName={data.bestWorst.averageLoss ? "text-[#D17A7A]" : "text-[#77797C]"}
                hint={`${data.bestWorst.losingTradeCount} losing trade${data.bestWorst.losingTradeCount === 1 ? "" : "s"}`}
              />
            </div>
          </Section>

          <Section
            title="Consistency Analysis"
            description="Streaks and trend are based on closed trades in exit-date order. This summarizes past behavior only."
            icon={<Target size={18} />}
          >
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div className="space-y-4">
                <div className="h-64 w-full rounded-lg border border-[#292B2E] bg-[#131516] p-3 sm:p-4">
                  {trendData.length < 2 ? (
                    <div className="flex h-full items-center justify-center text-sm text-[#77797C]">
                      Not enough closed trades to display a performance trend.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                        <CartesianGrid stroke="#242628" vertical={false} />
                        <XAxis
                          dataKey="index"
                          tick={{ fill: "#77797C", fontSize: 11 }}
                          axisLine={{ stroke: "#292B2E" }}
                          tickLine={false}
                          tickFormatter={(value: number) => `#${value}`}
                        />
                        <YAxis
                          tick={{ fill: "#77797C", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(value: number) => {
                            const abs = Math.abs(value);
                            if (abs >= 1000) return `${(value / 1000).toFixed(1)}k`;
                            return `${Math.round(value)}`;
                          }}
                        />
                        <Tooltip content={<TrendTooltip currency={currency} />} />
                        <Line
                          type="monotone"
                          dataKey="cumulativeValue"
                          stroke="#A7A9AC"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, fill: "#F0F0F0", stroke: "#17191B", strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <p className="text-xs leading-5 text-[#686A6D]">{data.consistency.trendNote}</p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <StatItem label="Winning days" value={String(data.consistency.winningDays)} valueClassName="text-[#79B89A]" />
                  <StatItem label="Losing days" value={String(data.consistency.losingDays)} valueClassName="text-[#D17A7A]" />
                  <StatItem label="Break-even days" value={String(data.consistency.breakEvenDays)} />
                  <StatItem label="Active trading days" value={String(data.consistency.totalActiveDays)} />
                  <StatItem label="Longest win streak" value={`${data.consistency.longestWinningStreak} trade${data.consistency.longestWinningStreak === 1 ? "" : "s"}`} valueClassName="text-[#79B89A]" />
                  <StatItem label="Longest loss streak" value={`${data.consistency.longestLosingStreak} trade${data.consistency.longestLosingStreak === 1 ? "" : "s"}`} valueClassName="text-[#D17A7A]" />
                </div>

                <div className="rounded-lg border border-[#292B2E] bg-[#131516] p-3 sm:p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    {data.consistency.consistencyIndication.toLowerCase().includes("improved") ? (
                      <ArrowUpRight size={16} className="text-[#79B89A]" />
                    ) : data.consistency.consistencyIndication.toLowerCase().includes("declined") ? (
                      <ArrowDownRight size={16} className="text-[#D17A7A]" />
                    ) : (
                      <Activity size={16} className="text-[#A7A9AC]" />
                    )}
                    Consistency indication
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#77797C]">
                    {data.consistency.consistencyIndication}
                  </p>
                  <p className="mt-2 text-[11px] leading-4 text-[#686A6D]">
                    This is a descriptive comparison of past closed trades in the selected period, not a prediction of future profitability.
                  </p>
                </div>
              </div>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}
