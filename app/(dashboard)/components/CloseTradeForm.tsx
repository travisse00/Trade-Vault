"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { showErrorPopup, showSuccessPopup } from "@/lib/popup";
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  X,
} from "lucide-react";

type MarketType = "FOREX" | "CRYPTO_SPOT" | "CRYPTO_FUTURES";
type TradeDirection = "LONG" | "SHORT";

interface CloseTradeFormProps {
  tradeId: string;
  asset: string;
  direction: TradeDirection;
  marketType: MarketType;
  entryDate: string;
}

const marketLabels: Record<MarketType, string> = {
  FOREX: "Forex",
  CRYPTO_SPOT: "Crypto Spot",
  CRYPTO_FUTURES: "Crypto Futures",
};

const inputClass =
  "h-11 w-full rounded-lg border border-[#292B2E] bg-[#1D1F21] px-3 text-sm text-white outline-none transition focus:border-[#A7A9AC] placeholder:text-[#62676B]";

function toDateTimeLocal(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function CloseTradeForm({
  tradeId,
  asset,
  direction,
  marketType,
  entryDate,
}: CloseTradeFormProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [closed, setClosed] = useState(false);

  const [exitPrice, setExitPrice] = useState("");
  const [exitDate, setExitDate] = useState(() =>
    toDateTimeLocal(new Date())
  );
  const [additionalFees, setAdditionalFees] = useState("0");
  const [additionalFundingFees, setAdditionalFundingFees] = useState("0");

  const [submitting, setSubmitting] = useState(false);

  const isLong = direction === "LONG";
  const isFutures = marketType === "CRYPTO_FUTURES";

  const entryDateLocal = useMemo(() => {
    const parsed = new Date(entryDate);

    return Number.isNaN(parsed.getTime())
      ? undefined
      : toDateTimeLocal(parsed);
  }, [entryDate]);

  const resetForm = useCallback(() => {
    setExitPrice("");
    setExitDate(toDateTimeLocal(new Date()));
    setAdditionalFees("0");
    setAdditionalFundingFees("0");
  }, []);

  const closeDialog = useCallback(() => {
    if (submitting) return;

    setOpen(false);
    resetForm();
  }, [resetForm, submitting]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDialog();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, closeDialog]);

  if (closed) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    const price = Number(exitPrice);

    if (!Number.isFinite(price) || price <= 0) {
      showErrorPopup("Enter an exit price greater than zero.");
      return;
    }

    const parsedExitDate = new Date(exitDate);

    if (Number.isNaN(parsedExitDate.getTime())) {
      showErrorPopup("Enter a valid exit date and time.");
      return;
    }

    const entry = new Date(entryDate);

    if (
      !Number.isNaN(entry.getTime()) &&
      parsedExitDate.getTime() < entry.getTime()
    ) {
      showErrorPopup("Exit date cannot be earlier than the entry date.");
      return;
    }

    const fees = Number(additionalFees || 0);
    const funding = Number(additionalFundingFees || 0);

    if (!Number.isFinite(fees) || fees < 0) {
      showErrorPopup("Additional fees cannot be negative.");
      return;
    }

    if (!Number.isFinite(funding) || funding < 0) {
      showErrorPopup("Additional funding fees cannot be negative.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/trades", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: tradeId,
          exitPrice: price,
          exitDate: parsedExitDate.toISOString(),
          additionalFees: fees,
          additionalFundingFees: isFutures ? funding : 0,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(data?.error || "Unable to close trade.");
      }

      showSuccessPopup(`${asset} trade closed successfully.`);
      setOpen(false);
      resetForm();
      setClosed(true);
      router.refresh();
    } catch (err) {
      showErrorPopup(
        err instanceof Error ? err.message : "Unable to close trade."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#A7A9AC] px-4 text-sm font-semibold text-[#101112] transition hover:bg-white"
      >
        <CircleDollarSign size={17} />
        Close Trade
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeDialog();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="close-trade-title"
            className="my-auto w-full max-w-md rounded-xl border border-[#303236] bg-[#17191B] p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="close-trade-title"
                  className="text-base font-semibold text-white"
                >
                  Close Trade
                </h2>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-white">
                    {asset}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      isLong
                        ? "border-[#315341] bg-[#1B2921] text-[#79B89A]"
                        : "border-[#4A3131] bg-[#291B1B] text-[#D17A7A]"
                    }`}
                  >
                    {isLong ? (
                      <ArrowUpRight size={12} />
                    ) : (
                      <ArrowDownRight size={12} />
                    )}
                    {isLong ? "Long" : "Short"}
                  </span>

                  <span className="text-xs text-[#77797C]">
                    {marketLabels[marketType]}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={closeDialog}
                disabled={submitting}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-[#77797C] transition hover:bg-[#202225] hover:text-white disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="exitPrice"
                  className="mb-2 block text-sm font-medium text-[#C4C6C8]"
                >
                  Exit Price
                </label>

                <input
                  id="exitPrice"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  required
                  value={exitPrice}
                  onChange={(event) => setExitPrice(event.target.value)}
                  placeholder="Price at which the position closed"
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="exitDate"
                  className="mb-2 block text-sm font-medium text-[#C4C6C8]"
                >
                  Exit Date &amp; Time
                </label>

                <input
                  id="exitDate"
                  type="datetime-local"
                  required
                  value={exitDate}
                  min={entryDateLocal}
                  onChange={(event) => setExitDate(event.target.value)}
                  className={inputClass}
                />
              </div>

              <div
                className={
                  isFutures
                    ? "grid grid-cols-1 gap-4 sm:grid-cols-2"
                    : ""
                }
              >
                <div>
                  <label
                    htmlFor="additionalFees"
                    className="mb-2 block text-sm font-medium text-[#C4C6C8]"
                  >
                    Additional Fees
                  </label>

                  <input
                    id="additionalFees"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    value={additionalFees}
                    onChange={(event) =>
                      setAdditionalFees(event.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                {isFutures && (
                  <div>
                    <label
                      htmlFor="additionalFundingFees"
                      className="mb-2 block text-sm font-medium text-[#C4C6C8]"
                    >
                      Funding Fees
                    </label>

                    <input
                      id="additionalFundingFees"
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0"
                      value={additionalFundingFees}
                      onChange={(event) =>
                        setAdditionalFundingFees(event.target.value)
                      }
                      className={inputClass}
                    />
                  </div>
                )}
              </div>

              <p className="text-xs leading-5 text-[#686A6D]">
                P&amp;L, total fees and return percentage are calculated on
                the server when you close the trade.
              </p>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={closeDialog}
                  className="flex-1 rounded-lg border border-[#303236] px-4 py-2.5 text-sm text-[#A7A9AC] transition hover:bg-[#202225] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-[#A7A9AC] px-4 py-2.5 text-sm font-semibold text-[#101112] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Closing..." : "Close Trade"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
