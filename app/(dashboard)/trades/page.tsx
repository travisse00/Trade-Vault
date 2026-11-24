
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  SlidersHorizontal,
  X,
  Trash2,
} from "lucide-react";
import { showErrorPopup, showSuccessPopup } from "@/lib/popup";
import { formatSignedCurrency } from "@/lib/format";

type TradeStatus = "ALL" | "OPEN" | "CLOSED";

type MarketType =
  | "FOREX"
  | "CRYPTO_SPOT"
  | "CRYPTO_FUTURES";

type MarketFilter = "ALL" | MarketType;

interface Trade {
  id: string;
  asset: string;
  marketType: Exclude<MarketFilter, "ALL">;
  direction: "LONG" | "SHORT";
  status: Exclude<TradeStatus, "ALL">;
  entryDate: string;
  netPnL: string | number | null;
}

const marketLabels: Record<MarketType, string> = {
  FOREX: "Forex",
  CRYPTO_SPOT: "Crypto Spot",
  CRYPTO_FUTURES: "Crypto Futures",
};

function formatPnl(value: string | number | null, currency: string) {
  if (value === null) return "--";

  const amount = Number(value);

  if (!Number.isFinite(amount)) return "--";

  return formatSignedCurrency(amount, currency);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Invalid date";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [currency, setCurrency] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TradeStatus>("ALL");
  const [market, setMarket] = useState<MarketFilter>("ALL");

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Trade | null>(null);

  useEffect(() => {
    async function fetchTrades() {
      try {
        setLoading(true);
        setLoadError("");

        const response = await fetch("/api/trades", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load trades.");
        }

        setTrades(data.trades ?? []);
        setCurrency(data.currency ?? "");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Something went wrong while loading trades.";
        setLoadError(message);
        showErrorPopup(message);
      } finally {
        setLoading(false);
      }
    }

    fetchTrades();
  }, []);

  const totalTrades = trades.length;

  const openTrades = trades.filter(
    (trade) => trade.status === "OPEN"
  ).length;

  const closedTrades = trades.filter(
    (trade) => trade.status === "CLOSED"
  ).length;

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      const searchTerm = search.toLowerCase();

      const matchesSearch =
        trade.asset.toLowerCase().includes(searchTerm) ||
        marketLabels[trade.marketType]
          .toLowerCase()
          .includes(searchTerm);

      const matchesStatus =
        status === "ALL" || trade.status === status;

      const matchesMarket =
        market === "ALL" || trade.marketType === market;

      return matchesSearch && matchesStatus && matchesMarket;
    });
  }, [trades, search, status, market]);

  const hasFilters =
    search !== "" || status !== "ALL" || market !== "ALL";

  function clearFilters() {
    setSearch("");
    setStatus("ALL");
    setMarket("ALL");
  }

  async function handleDeleteTrade() {
    if (!confirmDelete || deletingId !== null) return;

    try {
      setDeletingId(confirmDelete.id);
      setDeleteError("");

      const response = await fetch(
        `/api/trades?id=${encodeURIComponent(confirmDelete.id)}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete trade.");
      }

      setTrades((current) =>
        current.filter((trade) => trade.id !== confirmDelete.id)
      );

      showSuccessPopup("Trade deleted successfully.");
      setConfirmDelete(null);
      setDeleteError("");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to delete trade.";
      setDeleteError(message);
      showErrorPopup(message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen min-w-0 p-4 text-white sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            My Trades
          </h1>
          <p className="mt-1 text-sm text-[#77797C]">
            Track, review and manage your trading activity.
          </p>
        </div>

        <Link
          href="/trades/new"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#A7A9AC] px-4 py-2.5 text-sm font-semibold text-[#101112] transition hover:bg-white sm:w-auto"
        >
          <Plus size={17} />
          Add Trade
        </Link>
      </div>

      {/* Error Message */}
      {loadError && (
        <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {loadError}
        </div>
      )}

      {/* Summary Cards */}
      <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            label: "Total Trades",
            value: totalTrades,
            description: "All recorded trades",
          },
          {
            label: "Open Trades",
            value: openTrades,
            description: "Currently active positions",
          },
          {
            label: "Closed Trades",
            value: closedTrades,
            description: "Completed positions",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-[#292B2E] bg-[#17191B] p-4 sm:p-5"
          >
            <p className="text-xs text-[#77797C]">{item.label}</p>
            <p className="mt-3 text-2xl font-semibold tabular-nums">
              {loading ? "..." : item.value}
            </p>
            <p className="mt-1 text-xs text-[#686A6D]">
              {item.description}
            </p>
          </div>
        ))}
      </div>

      {/* Trade History */}
      <section className="mt-7 overflow-hidden rounded-xl border border-[#292B2E] bg-[#17191B]">
        <div className="border-b border-[#292B2E] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold">Trade History</h2>
              <p className="mt-1 text-xs text-[#77797C]">
                {loading
                  ? "Loading trades..."
                  : `${filteredTrades.length} of ${totalTrades} trades`}
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              {/* Search */}
              <div className="flex min-w-0 items-center gap-2 rounded-lg border border-[#303236] bg-[#101112] px-3 sm:w-64">
                <Search size={16} className="shrink-0 text-[#77797C]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search trades..."
                  className="h-10 min-w-0 w-full bg-transparent text-sm text-white outline-none placeholder:text-[#686A6D]"
                />

                {search && (
                  <button
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="text-[#77797C] hover:text-white"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as TradeStatus)
                }
                className="h-10 rounded-lg border border-[#303236] bg-[#101112] px-3 text-sm text-[#A7A9AC] outline-none focus:border-[#77797C]"
              >
                <option value="ALL">All statuses</option>
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
              </select>

              {/* Market Filter */}
              <select
                value={market}
                onChange={(event) =>
                  setMarket(event.target.value as MarketFilter)
                }
                className="h-10 rounded-lg border border-[#303236] bg-[#101112] px-3 text-sm text-[#A7A9AC] outline-none focus:border-[#77797C]"
              >
                <option value="ALL">All markets</option>
                <option value="FOREX">Forex</option>
                <option value="CRYPTO_SPOT">Crypto Spot</option>
                <option value="CRYPTO_FUTURES">Crypto Futures</option>
              </select>
            </div>
          </div>

          {hasFilters && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-[#77797C]">
                Filtered results
              </p>
              <button
                onClick={clearFilters}
                className="text-xs text-[#A7A9AC] transition hover:text-white"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left">
            <thead className="bg-[#131516]">
              <tr className="text-[10px] uppercase tracking-wider text-[#686A6D]">
                <th className="px-5 py-4 font-medium">Asset</th>
                <th className="px-5 py-4 font-medium">Market</th>
                <th className="px-5 py-4 font-medium">Direction</th>
                <th className="px-5 py-4 font-medium">Date</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 text-right font-medium">P&L</th>
                <th className="px-5 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#292B2E]">
              {!loading &&
                filteredTrades.map((trade) => {
                  const isOpen = trade.status === "OPEN";
                  const pnl = trade.netPnL;

                  return (
                    <tr
                      key={trade.id}
                      className="transition hover:bg-[#1D1F21]"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/trades/${trade.id}`}
                          className="text-sm font-medium text-white transition hover:text-[#A7A9AC]"
                        >
                          {trade.asset}
                        </Link>
                      </td>

                      <td className="px-5 py-4 text-sm text-[#A7A9AC]">
                        {marketLabels[trade.marketType]}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm text-[#A7A9AC]">
                          {trade.direction === "LONG" ? (
                            <ArrowUpRight
                              size={15}
                              className="text-[#79B89A]"
                            />
                          ) : (
                            <ArrowDownRight
                              size={15}
                              className="text-[#D17A7A]"
                            />
                          )}
                          {trade.direction === "LONG" ? "Long" : "Short"}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-[#77797C]">
                        {formatDate(trade.entryDate)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-md border px-2 py-1 text-[9px] font-semibold tracking-wider ${
                            isOpen
                              ? "border-[#414448] bg-[#202225] text-[#A7A9AC]"
                              : "border-[#315341] bg-[#1B2921] text-[#79B89A]"
                          }`}
                        >
                          {trade.status}
                        </span>
                      </td>

                      <td
                        className={`px-5 py-4 text-right text-sm font-semibold tabular-nums ${
                          pnl === null
                            ? "text-[#77797C]"
                            : Number(pnl) >= 0
                              ? "text-[#79B89A]"
                              : "text-[#D17A7A]"
                        }`}
                      >
                        {formatPnl(pnl, currency)}
                        <p className="mt-1 text-[10px] font-normal text-[#686A6D]">
                          {isOpen ? "Awaiting close" : "Realised"}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/trades/${trade.id}`}
                            aria-label={`View ${trade.asset} trade details`}
                            className="rounded-lg p-2 text-[#77797C] transition hover:bg-[#202225] hover:text-white"
                          >
                            <ChevronRight size={16} />
                          </Link>

                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError("");
                              setConfirmDelete(trade);
                            }}
                            aria-label={`Delete ${trade.asset} trade`}
                            className="rounded-lg p-2 text-[#77797C] transition hover:bg-red-500/10 hover:text-red-400"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Mobile Trade Cards */}
        <div className="divide-y divide-[#292B2E] md:hidden">
          {!loading &&
            filteredTrades.map((trade) => {
              const isOpen = trade.status === "OPEN";
              const pnl = trade.netPnL;

              return (
                <div key={trade.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/trades/${trade.id}`}
                        className="text-sm font-semibold text-white transition hover:text-[#A7A9AC]"
                      >
                        {trade.asset}
                      </Link>
                      <p className="mt-1 text-xs text-[#77797C]">
                        {marketLabels[trade.marketType]} ·{" "}
                        {trade.direction === "LONG" ? "Long" : "Short"}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-md border px-2 py-1 text-[9px] font-semibold tracking-wider ${
                          isOpen
                            ? "border-[#414448] bg-[#202225] text-[#A7A9AC]"
                            : "border-[#315341] bg-[#1B2921] text-[#79B89A]"
                        }`}
                      >
                        {trade.status}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError("");
                          setConfirmDelete(trade);
                        }}
                        aria-label={`Delete ${trade.asset} trade`}
                        className="rounded-lg p-2 text-[#77797C] transition hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-3">
                    <p className="text-xs text-[#77797C]">
                      {formatDate(trade.entryDate)}
                    </p>

                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold tabular-nums ${
                          pnl === null
                            ? "text-[#77797C]"
                            : Number(pnl) >= 0
                              ? "text-[#79B89A]"
                              : "text-[#D17A7A]"
                        }`}
                      >
                        {formatPnl(pnl, currency)}
                      </p>
                      <p className="mt-1 text-[10px] text-[#686A6D]">
                        {isOpen ? "Awaiting close" : "Realised P&L"}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/trades/${trade.id}`}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#A7A9AC] transition hover:text-white"
                  >
                    View details
                    <ChevronRight size={14} />
                  </Link>
                </div>
              );
            })}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="px-5 py-16 text-center">
            <p className="text-sm text-[#77797C]">
              Loading your trades...
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !loadError && filteredTrades.length === 0 && (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[#303236] bg-[#202225]">
              <SlidersHorizontal
                size={20}
                className="text-[#A7A9AC]"
              />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-white">
              {totalTrades === 0 ? "No trades yet" : "No trades found"}
            </h3>

            <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-[#77797C]">
              {totalTrades === 0
                ? "Your recorded trades will appear here once you add your first trade."
                : "We couldn't find any trades matching your search or filters. Try changing your filters."}
            </p>

            {totalTrades === 0 ? (
              <Link
                href="/trades/new"
                className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-[#A7A9AC] transition hover:text-white"
              >
                <Plus size={14} />
                Add your first trade
              </Link>
            ) : (
              <button
                onClick={clearFilters}
                className="mt-4 text-xs font-medium text-[#A7A9AC] transition hover:text-white"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        <div className="border-t border-[#292B2E] px-4 py-3 sm:px-5">
          <p className="text-[10px] text-[#686A6D]">
            Trades are retrieved from your account.
          </p>
        </div>
      </section>

      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="presentation"
          onClick={(event) => {
            if (
              event.target === event.currentTarget &&
              deletingId === null
            ) {
              setConfirmDelete(null);
              setDeleteError("");
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            className="w-full max-w-sm rounded-xl border border-[#303236] bg-[#17191B] p-5 shadow-2xl"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
              <Trash2 size={19} />
            </div>

            <h2
              id="delete-dialog-title"
              className="mt-4 text-base font-semibold text-white"
            >
              Delete this trade?
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#92969A]">
              You&apos;re about to permanently delete your{" "}
              <span className="font-medium text-white">
                {confirmDelete.asset}
              </span>{" "}
              trade and its uploaded screenshots. This action cannot be
              undone.
            </p>

            {deleteError && (
              <p className="mt-3 text-xs text-red-400">
                {deleteError}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={() => {
                  setConfirmDelete(null);
                  setDeleteError("");
                }}
                className="flex-1 rounded-lg border border-[#303236] px-4 py-2.5 text-sm text-[#A7A9AC] hover:bg-[#202225] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deletingId !== null}
                onClick={handleDeleteTrade}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingId ? "Deleting..." : "Delete trade"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
