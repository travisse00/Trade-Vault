import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Wallet,
  BarChart3,
  Receipt,
} from "lucide-react";

import DrawdownAnalysis from "../components/DrawdownAnalysis";
import EquityCurve from "../components/EquityCurve";
import { getAnalyticsData } from "@/lib/service/analytics.service";
import { loadWithAccountGuard } from "@/lib/service/account-guard";
import { formatCurrency, formatPercent } from "@/lib/format";

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  positive,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ElementType;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#292B2E] bg-[#17191B] p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#85878A]">{label}</p>
        <Icon size={18} className="text-[#A7A9AC]" />
      </div>

      <p
        className={`mt-4 text-2xl font-semibold tracking-tight ${
          positive === undefined
            ? "text-white"
            : positive
              ? "text-[#79B89A]"
              : "text-[#D17A7A]"
        }`}
      >
        {value}
      </p>

      <p className="mt-2 text-xs text-[#686A6D]">{description}</p>
    </div>
  );
}

export default async function AnalyticsPage() {
  const data = await loadWithAccountGuard(getAnalyticsData);

  const { summary, strategies, markets, currency } = data;

  const profitFactorValue =
    summary.profitFactor !== null
      ? summary.profitFactor.toFixed(2)
      : Number(summary.grossPnl) > 0
        ? "∞"
        : "—";

  const mostProfitableStrategy = strategies[0];
  const hasClosedTrades = summary.closedTrades > 0;

  return (
    <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-[#A7A9AC]" />
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Analytics
          </h1>
        </div>

        <p className="mt-2 text-sm text-[#85878A]">
          Understand your trading performance and identify areas for
          improvement.
        </p>
      </div>

      {/* Performance Summary */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            Performance Summary
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Realised P&L"
            value={formatCurrency(summary.realizedPnl, currency, {
              signed: true,
            })}
            description={`${summary.closedTrades} closed trades`}
            icon={Wallet}
            positive={Number(summary.realizedPnl) >= 0}
          />

          <MetricCard
            label="Gross P&L"
            value={formatCurrency(summary.grossPnl, currency, {
              signed: true,
            })}
            description="Before fees"
            icon={TrendingUp}
            positive={Number(summary.grossPnl) >= 0}
          />

          <MetricCard
            label="Total Fees"
            value={formatCurrency(summary.totalFees, currency)}
            description="Commission and trading fees"
            icon={Receipt}
          />

          <MetricCard
            label="Win Rate"
            value={formatPercent(summary.winRate, 1)}
            description={`${summary.winningTrades} wins · ${summary.losingTrades} losses`}
            icon={Target}
          />
        </div>
      </section>

      {/* Trade Statistics */}
      <section className="mt-8">
        <h2 className="mb-4 text-sm font-semibold text-white">
          Trade Statistics
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Profit Factor"
            value={profitFactorValue}
            description="Gross profit ÷ gross loss"
            icon={BarChart3}
          />

          <MetricCard
            label="Average Win"
            value={formatCurrency(summary.averageWin, currency)}
            description="Average winning trade"
            icon={TrendingUp}
            positive
          />

          <MetricCard
            label="Average Loss"
            value={`-${formatCurrency(summary.averageLoss, currency)}`}
            description="Average losing trade"
            icon={TrendingDown}
            positive={false}
          />

          <MetricCard
            label="Closed Trades"
            value={String(summary.closedTrades)}
            description={`${summary.openTrades} currently open`}
            icon={Activity}
          />
        </div>
      </section>

      {/* Performance Highlights */}
      <section className="mt-8 mb-8">
        <h2 className="mb-4 text-sm font-semibold text-white">
          Performance Highlights
        </h2>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-[#292B2E] bg-[#17191B] p-5">
            <p className="text-xs text-[#85878A]">
              Most Profitable Strategy
            </p>

            <p className="mt-3 text-xl font-semibold text-white">
              {mostProfitableStrategy?.name || "No data"}
            </p>

            <p className="mt-1 text-sm text-[#79B89A]">
              {mostProfitableStrategy
                ? formatCurrency(mostProfitableStrategy.netPnl, currency, {
                    signed: true,
                  })
                : formatCurrency(0, currency)}
            </p>
          </div>

          <div className="rounded-xl border border-[#292B2E] bg-[#17191B] p-5">
            <p className="text-xs text-[#85878A]">Best Trade</p>

            <p className="mt-3 text-xl font-semibold text-white">
              {summary.bestTrade?.asset || "No closed trades"}
            </p>

            <p className="mt-1 text-sm text-[#79B89A]">
              {summary.bestTrade
                ? formatCurrency(summary.bestTrade.pnl, currency, {
                    signed: true,
                  })
                : formatCurrency(0, currency)}
            </p>
          </div>

          <div className="rounded-xl border border-[#292B2E] bg-[#17191B] p-5">
            <p className="text-xs text-[#85878A]">Worst Trade</p>

            <p className="mt-3 text-xl font-semibold text-white">
              {summary.worstTrade?.asset || "No closed trades"}
            </p>

            <p className="mt-1 text-sm text-[#D17A7A]">
              {summary.worstTrade
                ? formatCurrency(summary.worstTrade.pnl, currency, {
                    signed: true,
                  })
                : formatCurrency(0, currency)}
            </p>
          </div>

          <div className="rounded-xl border border-[#292B2E] bg-[#17191B] p-5">
            <p className="text-xs text-[#85878A]">
              Winning vs Losing Trades
            </p>

            <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-[#292B2E]">
              <div
                className="bg-[#79B89A]"
                style={{
                  width: `${
                    summary.closedTrades
                      ? (summary.winningTrades / summary.closedTrades) * 100
                      : 0
                  }%`,
                }}
              />

              <div
                className="bg-[#D17A7A]"
                style={{
                  width: `${
                    summary.closedTrades
                      ? (summary.losingTrades / summary.closedTrades) * 100
                      : 0
                  }%`,
                }}
              />
            </div>

            <div className="mt-3 flex justify-between text-xs">
              <span className="text-[#79B89A]">
                {summary.winningTrades} Wins
              </span>
              <span className="text-[#D17A7A]">
                {summary.losingTrades} Losses
              </span>
            </div>
          </div>
        </div>
      </section>

      <EquityCurve equity={data.equity} currency={currency} />

      <DrawdownAnalysis drawdown={data.drawdown} currency={currency} />

      {/* Market Breakdown */}
      <section className="mt-8">
        <h2 className="mb-4 text-sm font-semibold text-white">
          Performance by Market
        </h2>

        {markets.length === 0 ? (
          <div className="rounded-xl border border-[#292B2E] bg-[#17191B] px-5 py-14 text-center">
            <p className="text-sm font-medium text-white">
              No market data yet
            </p>
            <p className="mt-1 text-xs text-[#77797C]">
              Record trades to see how each market is performing.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#292B2E] bg-[#17191B]">
            {markets.map((market, index) => (
              <div
                key={market.name}
                className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${
                  index !== markets.length - 1
                    ? "border-b border-[#292B2E]"
                    : ""
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {market.name}
                  </p>
                  <p className="mt-1 text-xs text-[#77797C]">
                    {market.trades} trades
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#292B2E]">
                    <div
                      className="h-full rounded-full bg-[#A7A9AC]"
                      style={{ width: `${market.percentage}%` }}
                    />
                  </div>

                  <p
                    className={`min-w-[120px] text-right text-sm font-medium ${
                      Number(market.pnl) >= 0
                        ? "text-[#79B89A]"
                        : "text-[#D17A7A]"
                    }`}
                  >
                    {formatCurrency(market.pnl, currency, { signed: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {!hasClosedTrades && (
        <p className="mt-6 text-center text-[11px] text-[#686A6D]">
          Close a trade to populate your performance analytics.
        </p>
      )}
    </div>
  );
}
