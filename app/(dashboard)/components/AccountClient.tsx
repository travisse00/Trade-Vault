"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { showErrorPopup, showSuccessPopup } from "@/lib/popup";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  ArrowRight,
} from "lucide-react";
import type {
  AccountOverview,
  TransactionHistoryEntry,
  TransactionKind,
} from "@/lib/service/account.service";
import { formatCurrency, formatDate } from "@/lib/format";

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

const kindLabels: Record<TransactionKind, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  TRADE_PNL: "Trade P&L",
};

export default function AccountClient({
  overview,
  entries,
}: {
  overview: AccountOverview;
  entries: TransactionHistoryEntry[];
}) {
  const router = useRouter();
  const currency = overview.currency;

  const [type, setType] = useState<"DEPOSIT" | "WITHDRAWAL">("DEPOSIT");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayInputValue());
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = Number(amount);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      showErrorPopup("Enter an amount greater than zero.");
      return;
    }

    if (type === "WITHDRAWAL" && parsed > Number(overview.currentBalance)) {
      showErrorPopup(
        "Insufficient balance. You cannot withdraw more than your available balance."
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/account/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount: parsed,
          // Store at midday UTC so the chosen calendar date is stable
          // regardless of the viewer's timezone.
          date: `${date}T12:00:00.000Z`,
          note: note.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to record transaction.");
      }

      showSuccessPopup(
        type === "DEPOSIT" ? "Deposit recorded." : "Withdrawal recorded."
      );

      setAmount("");
      setNote("");
      setDate(todayInputValue());
      setType("DEPOSIT");
      router.refresh();
    } catch (error) {
      showErrorPopup(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const metrics = [
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
      value: formatCurrency(overview.realizedPnl, currency, { signed: true }),
      description: "Net profit/loss from closed trades",
    },
  ];

  const inputClass =
    "h-11 w-full rounded-lg border border-[#292B2E] bg-[#1D1F21] px-3 text-sm text-white outline-none transition focus:border-[#A7A9AC]";

  return (
    <div className="min-h-screen bg-[#101112] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-7">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Wallet size={20} className="text-[#A7A9AC]" />
              <h1 className="text-2xl font-semibold">Account</h1>
            </div>
            <p className="mt-1 text-sm text-[#85888B]">
              Track your balance, record deposits and withdrawals, and review
              your transaction history.
            </p>
          </div>
        </div>

        {/* Balance Overview */}
        <section>
          <h2 className="mb-4 text-sm font-semibold text-white">
            Balance Overview
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl border border-[#292B2E] bg-[#17191B] p-4 sm:p-5"
              >
                <p className="text-sm text-[#929497]">{metric.label}</p>
                <p className="mt-4 break-words text-xl font-semibold tracking-tight text-white">
                  {metric.value}
                </p>
                <p className="mt-2 text-xs leading-5 text-[#77797C]">
                  {metric.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Add Transaction */}
        <section className="rounded-xl border border-[#292B2E] bg-[#17191B] p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-lg bg-[#252729] p-2.5 text-[#A7A9AC]">
              <Plus size={18} />
            </div>
            <div>
              <h2 className="font-semibold">Record a Transaction</h2>
              <p className="text-xs text-[#85888B]">
                Add a deposit or withdrawal to your account.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-[#C4C6C8]">
                Type
              </label>
              <div className="flex rounded-lg border border-[#292B2E] bg-[#1D1F21] p-1">
                <button
                  type="button"
                  onClick={() => setType("DEPOSIT")}
                  className={`flex-1 rounded-md px-3 py-2 text-xs transition ${
                    type === "DEPOSIT"
                      ? "bg-[#292B2E] text-white"
                      : "text-[#77797C] hover:text-white"
                  }`}
                >
                  Deposit
                </button>
                <button
                  type="button"
                  onClick={() => setType("WITHDRAWAL")}
                  className={`flex-1 rounded-md px-3 py-2 text-xs transition ${
                    type === "WITHDRAWAL"
                      ? "bg-[#292B2E] text-white"
                      : "text-[#77797C] hover:text-white"
                  }`}
                >
                  Withdrawal
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#C4C6C8]">
                Amount ({currency})
              </label>
              <input
                type="number"
                min="0"
                max={type === "WITHDRAWAL" ? overview.currentBalance : undefined}
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
              {type === "WITHDRAWAL" && (
                <p className="mt-2 text-xs text-[#77797C]">
                  Available balance:{" "}
                  {formatCurrency(overview.currentBalance, currency)}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#C4C6C8]">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#C4C6C8]">
                Description (optional)
              </label>
              <input
                type="text"
                value={note}
                maxLength={200}
                onChange={(event) => setNote(event.target.value)}
                placeholder="e.g. Monthly funding"
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 rounded-lg bg-[#A7A9AC] px-4 py-2.5 text-sm font-medium text-[#101112] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={16} />
                {submitting ? "Recording..." : "Record transaction"}
              </button>
            </div>
          </form>
        </section>

        {/* Transaction History */}
        <section className="overflow-hidden rounded-xl border border-[#292B2E] bg-[#17191B]">
          <div className="border-b border-[#292B2E] p-4 sm:p-5">
            <h2 className="text-base font-semibold">Transaction History</h2>
            <p className="mt-1 text-xs text-[#77797C]">
              Deposits, withdrawals and realised trading activity in one
              ledger.
            </p>
          </div>

          {entries.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <p className="text-sm font-medium text-white">
                No transactions yet
              </p>
              <p className="mt-1 text-xs text-[#77797C]">
                Deposits, withdrawals and closed trades will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-[#131516]">
                  <tr className="text-[10px] uppercase tracking-wider text-[#686A6D]">
                    <th className="px-5 py-4 font-medium">Type</th>
                    <th className="px-5 py-4 font-medium">Description</th>
                    <th className="px-5 py-4 font-medium">Date</th>
                    <th className="px-5 py-4 text-right font-medium">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#292B2E]">
                  {entries.map((entry) => {
                    const signed =
                      entry.kind === "DEPOSIT"
                        ? Number(entry.amount)
                        : entry.kind === "WITHDRAWAL"
                          ? -Number(entry.amount)
                          : Number(entry.amount);

                    const positive = signed >= 0;

                    return (
                      <tr
                        key={entry.id}
                        className="transition hover:bg-[#1D1F21]"
                      >
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold tracking-wide ${
                              entry.kind === "DEPOSIT"
                                ? "border-[#315341] bg-[#1B2921] text-[#79B89A]"
                                : entry.kind === "WITHDRAWAL"
                                  ? "border-[#4A2B2B] bg-[#2A1B1B] text-[#D17A7A]"
                                  : "border-[#414448] bg-[#202225] text-[#A7A9AC]"
                            }`}
                          >
                            {entry.kind === "DEPOSIT" ? (
                              <ArrowDownLeft size={12} />
                            ) : entry.kind === "WITHDRAWAL" ? (
                              <ArrowUpRight size={12} />
                            ) : (
                              <ArrowRight size={12} />
                            )}
                            {kindLabels[entry.kind]}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {entry.tradeId ? (
                            <Link
                              href={`/trades/${entry.tradeId}`}
                              className="text-[#A7A9AC] transition hover:text-white"
                            >
                              {entry.description}
                            </Link>
                          ) : (
                            <span className="text-[#A7A9AC]">
                              {entry.description}
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-[#77797C]">
                          {formatDate(entry.date)}
                        </td>

                        <td
                          className={`px-5 py-4 text-right font-semibold tabular-nums ${
                            positive ? "text-[#79B89A]" : "text-[#D17A7A]"
                          }`}
                        >
                          {positive ? "+" : "-"}
                          {formatCurrency(Math.abs(signed), currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-[#292B2E] px-4 py-3 sm:px-5">
            <p className="text-[10px] text-[#686A6D]">
              Trade P&L entries are derived from your closed trades and are not
              separate transactions.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
