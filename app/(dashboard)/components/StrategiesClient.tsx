"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  TrendingUp,
  Target,
  Layers3,
  ArrowUpRight,
} from "lucide-react";
import type { StrategyBreakdown } from "@/lib/service/analytics.service";

function formatCurrency(value: string, currency: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "—";

  return `${amount < 0 ? "-" : ""}${Math.abs(amount).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )} ${currency}`;
}

function formatProfitFactor(strategy: StrategyBreakdown) {
  if (strategy.profitFactor !== null) {
    return strategy.profitFactor.toFixed(2);
  }

  return Number(strategy.grossProfit) > 0 ? "∞" : "—";
}

export default function StrategiesClient({
  strategies,
  currency,
}: {
  strategies: StrategyBreakdown[];
  currency: string;
}) {
  const [search, setSearch] = useState("");
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);

  const filteredStrategies = strategies.filter((strategy) =>
    strategy.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalTrades = strategies.reduce(
    (total, strategy) => total + strategy.totalTrades,
    0
  );

  const totalClosed = strategies.reduce(
    (total, strategy) => total + strategy.closedCount,
    0
  );

  const totalWins = strategies.reduce(
    (total, strategy) => total + strategy.wins,
    0
  );

  const totalNetPnl = strategies.reduce(
    (total, strategy) => total + Number(strategy.netPnl),
    0
  );

  const overallWinRate = totalClosed ? (totalWins / totalClosed) * 100 : 0;

  const selected = strategies.find(
    (strategy) => strategy.name.toLowerCase() === selectedStrategy
  );

  return (
    <div className="min-h-screen space-y-7 bg-[#101112] px-4 py-6 text-white sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Strategies</h1>
          <p className="mt-1 text-sm text-[#85888B]">
            Understand which trading strategies are performing best.
          </p>
        </div>

        <Link
          href="/trades/new"
          className="rounded-lg bg-[#A7A9AC] px-4 py-2.5 text-sm font-medium text-[#101112] transition hover:bg-white"
        >
          Add Trade
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Strategies"
          value={strategies.length.toString()}
          icon={<Layers3 size={18} />}
        />

        <SummaryCard
          label="Total Trades"
          value={totalTrades.toString()}
          icon={<Target size={18} />}
        />

        <SummaryCard
          label="Overall Win Rate"
          value={`${overallWinRate.toFixed(1)}%`}
          icon={<TrendingUp size={18} />}
        />

        <SummaryCard
          label="Realised P&L"
          value={formatCurrency(totalNetPnl.toFixed(2), currency)}
          icon={<ArrowUpRight size={18} />}
          positive={totalNetPnl >= 0}
        />
      </div>

      {/* Strategy list */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Your Strategies</h2>
            <p className="mt-1 text-xs text-[#777A7D]">
              Strategies are automatically created from your trade entries.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#777A7D]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search strategies..."
              className="w-full rounded-lg border border-[#292B2D] bg-[#171819] py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-[#66696C] focus:border-[#777A7D]"
            />
          </div>
        </div>

        {filteredStrategies.length === 0 ? (
          <div className="rounded-xl border border-[#292B2D] bg-[#171819] px-5 py-14 text-center">
            <Layers3 className="mx-auto mb-3 text-[#777A7D]" size={28} />
            <h3 className="text-sm font-medium text-white">
              {search ? "No strategies found" : "No strategies yet"}
            </h3>
            <p className="mt-2 text-sm text-[#85888B]">
              {search
                ? "Try searching for another strategy."
                : "Add a strategy when recording your next trade."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {filteredStrategies.map((strategy) => {
              const isSelected =
                selectedStrategy === strategy.name.toLowerCase();

              return (
                <button
                  key={strategy.name.toLowerCase()}
                  onClick={() =>
                    setSelectedStrategy(
                      isSelected ? null : strategy.name.toLowerCase()
                    )
                  }
                  className={`rounded-xl border bg-[#171819] p-5 text-left transition ${
                    isSelected
                      ? "border-[#A7A9AC]"
                      : "border-[#292B2D] hover:border-[#55585B]"
                  }`}
                >
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-white">
                        {strategy.name}
                      </h3>
                      <p className="mt-1 text-xs text-[#85888B]">
                        {strategy.totalTrades} total trades ·{" "}
                        {strategy.closedCount} closed · {strategy.openCount} open
                      </p>
                    </div>

                    <span className="rounded-md border border-[#383A3D] px-2 py-1 text-xs text-[#A7A9AC]">
                      {isSelected ? "Selected" : "View details"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <StrategyMetric
                      label="Realised P&L"
                      value={formatCurrency(strategy.netPnl, currency)}
                      positive={Number(strategy.netPnl) >= 0}
                    />

                    <StrategyMetric
                      label="Win Rate"
                      value={`${strategy.winRate.toFixed(1)}%`}
                    />

                    <StrategyMetric
                      label="Profit Factor"
                      value={formatProfitFactor(strategy)}
                    />

                    <StrategyMetric
                      label="Closed Trades"
                      value={strategy.closedCount.toString()}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Selected strategy details */}
      {selected && (
        <section className="rounded-xl border border-[#292B2D] bg-[#171819] p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                {selected.name} Performance
              </h2>
              <p className="mt-1 text-sm text-[#85888B]">
                Trades recorded using this strategy.
              </p>
            </div>

            <button
              onClick={() => setSelectedStrategy(null)}
              className="text-sm text-[#85888B] hover:text-white"
            >
              Close details
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#292B2D] text-xs text-[#85888B]">
                  <th className="pb-3 font-medium">Asset</th>
                  <th className="pb-3 font-medium">Market</th>
                  <th className="pb-3 font-medium">Direction</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 text-right font-medium">P&L</th>
                </tr>
              </thead>

              <tbody>
                {selected.trades.map((trade) => (
                  <tr
                    key={trade.id}
                    className="border-b border-[#292B2D] last:border-0"
                  >
                    <td className="py-4 font-medium text-white">
                      <Link
                        href={`/trades/${trade.id}`}
                        className="transition hover:text-[#A7A9AC]"
                      >
                        {trade.asset}
                      </Link>
                    </td>
                    <td className="py-4 text-[#A7A9AC]">
                      {trade.market}
                    </td>
                    <td className="py-4 text-[#A7A9AC]">
                      {trade.direction === "LONG" ? "Long" : "Short"}
                    </td>
                    <td className="py-4">
                      <span className="text-xs text-[#A7A9AC]">
                        {trade.status}
                      </span>
                    </td>
                    <td
                      className={`py-4 text-right font-medium ${
                        trade.status === "OPEN"
                          ? "text-[#777A7D]"
                          : Number(trade.pnl) >= 0
                            ? "text-[#79B89A]"
                            : "text-[#D17A7A]"
                      }`}
                    >
                      {trade.status === "OPEN"
                        ? "—"
                        : formatCurrency(trade.pnl, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="text-xs text-[#66696C]">
        Win rate and profit factor use closed trades only.
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  positive,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#292B2D] bg-[#171819] p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-[#85888B]">{label}</p>
        <span className="text-[#A7A9AC]">{icon}</span>
      </div>
      <p
        className={`text-2xl font-semibold ${
          positive === undefined
            ? "text-white"
            : positive
              ? "text-[#79B89A]"
              : "text-[#D17A7A]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StrategyMetric({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-[#777A7D]">{label}</p>
      <p
        className={`mt-1 text-sm font-semibold ${
          positive === undefined
            ? "text-white"
            : positive
              ? "text-[#79B89A]"
              : "text-[#D17A7A]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
