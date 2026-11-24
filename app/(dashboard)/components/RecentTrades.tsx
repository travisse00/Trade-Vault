"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
} from "lucide-react";
import type { RecentTradeItem } from "@/lib/service/analytics.service";
import { formatDate, formatSignedCurrency } from "@/lib/format";

function formatPnl(value: string | null, currency: string) {
  if (value === null) return "—";

  const amount = Number(value);

  if (!Number.isFinite(amount)) return "—";

  return formatSignedCurrency(amount, currency);
}

export default function RecentTrades({
  trades,
  currency,
}: {
  trades: RecentTradeItem[];
  currency: string;
}) {
  const recentTrades = trades.slice(0, 5);

  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-[#292B2E] bg-[#17191B]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <div>
          <h2 className="text-base font-semibold text-white">
            Recent Trades
          </h2>
          <p className="mt-1 text-xs text-[#77797C]">
            Your latest trading activity
          </p>
        </div>

        <Link
          href="/trades"
          className="flex items-center gap-2 text-xs font-medium text-[#A7A9AC] transition hover:text-white"
        >
          View all trades
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Trade List */}
      <div className="divide-y divide-[#292B2E]">
        {recentTrades.map((trade) => {
          const isOpen = trade.status === "OPEN";
          const isPositive = Number(trade.pnl ?? 0) >= 0;

          return (
            <Link
              key={trade.id}
              href={`/trades/${trade.id}`}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition hover:bg-[#1D1F21] sm:px-5"
            >
              {/* Asset */}
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#303236] bg-[#202225]">
                  {trade.direction === "LONG" ? (
                    <ArrowUpRight
                      size={18}
                      className="text-[#79B89A]"
                    />
                  ) : (
                    <ArrowDownRight
                      size={18}
                      className="text-[#D17A7A]"
                    />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {trade.asset}
                  </p>

                  <p className="mt-1 truncate text-xs text-[#77797C]">
                    {trade.market} ·{" "}
                    {trade.direction === "LONG" ? "Long" : "Short"}
                  </p>
                </div>
              </div>

              {/* Status and date */}
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <span
                  className={`rounded-md border px-2 py-1 text-[9px] font-semibold tracking-wider ${
                    isOpen
                      ? "border-[#414448] bg-[#202225] text-[#A7A9AC]"
                      : "border-[#315341] bg-[#1B2921] text-[#79B89A]"
                  }`}
                >
                  {trade.status}
                </span>

                <p className="text-[11px] text-[#77797C]">
                  {formatDate(trade.date)}
                </p>
              </div>

              {/* P&L */}
              <div className="w-full text-left sm:w-32 sm:text-right">
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    isOpen
                      ? "text-[#77797C]"
                      : isPositive
                        ? "text-[#79B89A]"
                        : "text-[#D17A7A]"
                  }`}
                >
                  {isOpen ? "—" : formatPnl(trade.pnl, currency)}
                </p>

                <p className="mt-1 text-[10px] text-[#77797C]">
                  {isOpen ? "Open trade" : "Realised P&L"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {recentTrades.length === 0 && (
        <div className="px-5 py-12 text-center">
          <p className="text-sm font-medium text-white">
            No trades yet
          </p>
          <p className="mt-1 text-xs text-[#77797C]">
            Your recent trading activity will appear here.
          </p>
          <Link
            href="/trades/new"
            className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-[#A7A9AC] transition hover:text-white"
          >
            Add your first trade
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      <div className="border-t border-[#292B2E] px-4 py-3 sm:px-5">
        <p className="text-[10px] text-[#686A6D]">
          Retrieved from your account records.
        </p>
      </div>
    </section>
  );
}
