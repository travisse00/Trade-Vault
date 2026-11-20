import Link from "next/link";
import {
  Plus,
  Newspaper,
  TrendingUp,
  Target,
  ArrowLeftRight,
  ChartNoAxesCombined,
  Wallet,
} from "lucide-react";
import PerformanceChart from "../components/PerformanceChart";
import TradingBreakdown from "../components/TradingBreakdown";
import RecentTrades from "../components/RecentTrades";
import { getAnalyticsData } from "@/lib/service/analytics.service";
import { loadWithAccountGuard } from "@/lib/service/account-guard";
import { formatCurrency, formatPercent } from "@/lib/format";

export default async function DashboardPage() {
  const data = await loadWithAccountGuard(getAnalyticsData);

  const { summary, overview, currency } = data;

  const profitFactorValue =
    summary.profitFactor !== null
      ? summary.profitFactor.toFixed(2)
      : Number(summary.grossPnl) > 0
        ? "∞"
        : "—";

  const stats = [
    {
      title: "Net P&L",
      value: formatCurrency(summary.realizedPnl, currency, { signed: true }),
      description: "Realised profit/loss from closed trades",
      icon: TrendingUp,
    },
    {
      title: "Win Rate",
      value: formatPercent(summary.winRate, 1),
      description: "Percentage of winning closed trades",
      icon: Target,
    },
    {
      title: "Total Trades",
      value: String(summary.totalTrades),
      description: "All recorded trades",
      icon: ArrowLeftRight,
    },
    {
      title: "Profit Factor",
      value: profitFactorValue,
      description: "Gross profit ÷ gross loss",
      icon: ChartNoAxesCombined,
    },
  ];

  const balanceMetrics = [
    {
      label: "Initial Balance",
      value: formatCurrency(overview.initialBalance, currency),
      description: "Locked at account setup",
    },
    {
      label: "Current Balance",
      value: formatCurrency(overview.currentBalance, currency),
      description: "Initial + cash flow + realised P&L",
    },
    {
      label: "Total Deposits",
      value: formatCurrency(overview.totalDeposits, currency),
      description: "All recorded deposits",
    },
    {
      label: "Total Withdrawals",
      value: formatCurrency(overview.totalWithdrawals, currency),
      description: "All recorded withdrawals",
    },
    {
      label: "Realized P&L",
      value: formatCurrency(overview.realizedPnl, currency, {
        signed: true,
      }),
      description: "Net profit/loss from closed trades",
    },
  ];

  return (
    <main className="min-h-screen min-w-0 bg-[#101112] px-4 py-6 text-white sm:px-6 sm:py-8 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Overview
          </h1>
          <p className="mt-1 text-sm text-[#85878A]">
            Your trading performance at a glance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/market-news"
            className="flex h-10 items-center gap-2 rounded-lg border border-[#292B2E] px-3 text-sm text-[#A7A9AC] transition hover:bg-[#1D1F21] hover:text-white sm:px-4"
          >
            <Newspaper size={17} />
            Market News
          </Link>

          <Link
            href="/trades/new"
            className="flex h-10 items-center gap-2 rounded-lg bg-[#A7A9AC] px-3 text-sm font-semibold text-[#101112] transition hover:bg-[#C1C3C5] sm:px-4"
          >
            <Plus size={17} />
            New Trade
          </Link>
        </div>
      </div>

      {/* Account Balance */}
      <section className="mt-8 sm:mt-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">
              Account Balance
            </h2>
            <p className="mt-1 text-xs text-[#77797C]">
              Derived from your deposits, withdrawals and closed trades
            </p>
          </div>

          <Link
            href="/account"
            className="flex items-center gap-2 text-xs font-medium text-[#A7A9AC] transition hover:text-white"
          >
            <Wallet size={14} />
            Manage account
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5 sm:gap-4">
          {balanceMetrics.map((metric) => (
            <div
              key={metric.label}
              className="min-w-0 rounded-xl border border-[#292B2E] bg-[#17191B] p-4 sm:p-5"
            >
              <p className="text-sm text-[#929497]">{metric.label}</p>
              <h3 className="mt-4 break-words text-xl font-semibold tracking-tight text-white">
                {metric.value}
              </h3>
              <p className="mt-2 text-xs leading-5 text-[#77797C]">
                {metric.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Performance Overview */}
      <section className="mt-8 sm:mt-10">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-white">
            Performance Overview
          </h2>
          <p className="mt-1 text-xs text-[#77797C]">
            Your trading statistics so far
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.title}
                className="min-w-0 rounded-xl border border-[#292B2E] bg-[#17191B] p-4 transition hover:border-[#414448] sm:p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-[#929497]">
                    {stat.title}
                  </p>

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#303236] bg-[#202225]">
                    <Icon size={17} className="text-[#A7A9AC]" />
                  </div>
                </div>

                <h3 className="mt-5 break-words text-2xl font-semibold tracking-tight text-white">
                  {stat.value}
                </h3>

                <p className="mt-2 text-xs leading-5 text-[#77797C]">
                  {stat.description}
                </p>
              </div>
            );
          })}
        </div>

        <PerformanceChart performance={data.performance} currency={currency} />

        <TradingBreakdown
          strategies={data.strategies}
          markets={data.markets}
          currency={currency}
        />

        <RecentTrades trades={data.recentTrades} currency={currency} />
      </section>
    </main>
  );
}
