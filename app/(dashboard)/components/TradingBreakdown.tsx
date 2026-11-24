"use client";

import {
  Target,
  TrendingUp,
  Activity,
  ChartNoAxesCombined,
} from "lucide-react";
import type {
  StrategyBreakdown,
  MarketBreakdown,
} from "@/lib/service/analytics.service";
import { formatSignedCurrency } from "@/lib/format";

function formatPnl(value: string, currency: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "—";

  return formatSignedCurrency(amount, currency);
}

export default function TradingBreakdown({
  strategies,
  markets,
  currency,
}: {
  strategies: StrategyBreakdown[];
  markets: MarketBreakdown[];
  currency: string;
}) {
  const mostProfitableStrategy = [...strategies].sort(
    (a, b) => Number(b.netPnl) - Number(a.netPnl)
  )[0];

  const mostTradedMarket = [...markets].sort(
    (a, b) => b.trades - a.trades
  )[0];

  return (
    <section className="mt-6 grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
      {/* Strategy Performance */}
      <div className="min-w-0 overflow-hidden rounded-xl border border-[#292B2E] bg-[#17191B] p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">
              Strategy Performance
            </h2>
            <p className="mt-1 text-xs text-[#77797C]">
              Performance by trading strategy
            </p>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#303236] bg-[#202225]">
            <Target size={18} className="text-[#A7A9AC]" />
          </div>
        </div>

        {strategies.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-[#292B2E] px-4 py-10 text-center">
            <p className="text-sm font-medium text-white">
              No strategies yet
            </p>
            <p className="mt-1 text-xs text-[#77797C]">
              Add a strategy name when recording a trade to see its
              performance here.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {strategies.map((strategy) => {
              const pnl = Number(strategy.netPnl);

              return (
                <div key={strategy.name}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {strategy.name}
                      </p>
                    </div>

                    <p
                      className={`text-sm font-semibold ${
                        pnl >= 0 ? "text-[#79B89A]" : "text-[#D17A7A]"
                      }`}
                    >
                      {formatPnl(strategy.netPnl, currency)}
                    </p>
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#292B2E]">
                    <div
                      className={`h-full rounded-full ${
                        pnl >= 0 ? "bg-[#79B89A]" : "bg-[#D17A7A]"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, strategy.winRate)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-[#292B2E] pt-4">
          <div>
            <p className="text-xs text-[#77797C]">
              Most profitable strategy
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {mostProfitableStrategy?.name ?? "No data"}
            </p>
          </div>

          {mostProfitableStrategy && (
            <div className="flex items-center gap-2 text-xs text-[#79B89A]">
              <TrendingUp size={15} />
              {formatPnl(mostProfitableStrategy.netPnl, currency)}
            </div>
          )}
        </div>
      </div>

      {/* Market Breakdown */}
      <div className="min-w-0 overflow-hidden rounded-xl border border-[#292B2E] bg-[#17191B] p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">
              Market Breakdown
            </h2>
            <p className="mt-1 text-xs text-[#77797C]">
              Performance across different markets
            </p>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#303236] bg-[#202225]">
            <Activity size={18} className="text-[#A7A9AC]" />
          </div>
        </div>

        {markets.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-[#292B2E] px-4 py-10 text-center">
            <p className="text-sm font-medium text-white">
              No market data yet
            </p>
            <p className="mt-1 text-xs text-[#77797C]">
              Your market breakdown will appear once you record trades.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {markets.map((market) => {
              const pnl = Number(market.pnl);

              return (
                <div key={market.name}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {market.name}
                      </p>
                      <p className="mt-1 text-xs text-[#77797C]">
                        {market.trades} trades
                      </p>
                    </div>

                    <p
                      className={`text-sm font-semibold ${
                        pnl >= 0 ? "text-[#79B89A]" : "text-[#D17A7A]"
                      }`}
                    >
                      {formatPnl(market.pnl, currency)}
                    </p>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#292B2E]">
                    <div
                      className="h-full rounded-full bg-[#A7A9AC]"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, market.percentage)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 border-t border-[#292B2E] pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#77797C]">
                Most traded market
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {mostTradedMarket?.name ?? "No data"}
              </p>
            </div>

            {mostTradedMarket && (
              <div className="flex items-center gap-2 text-xs text-[#A7A9AC]">
                <ChartNoAxesCombined size={15} />
                {mostTradedMarket.trades} trades
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
