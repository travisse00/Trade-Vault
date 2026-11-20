"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, TriangleAlert } from "lucide-react";

export default function TradeDetailsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Trade details error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen min-w-0 items-center justify-center p-4 text-white sm:p-6">
      <div className="w-full max-w-md rounded-xl border border-[#292B2E] bg-[#17191B] p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
          <TriangleAlert size={20} className="text-red-400" />
        </div>

        <h1 className="mt-5 text-lg font-semibold">
          We couldn&apos;t load this trade
        </h1>

        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[#77797C]">
          Something went wrong while fetching the trade details. Please try
          again.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#A7A9AC] px-4 py-2.5 text-sm font-semibold text-[#101112] transition hover:bg-white"
          >
            <RotateCcw size={16} />
            Try again
          </button>

          <Link
            href="/trades"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#303236] px-4 py-2.5 text-sm text-[#A7A9AC] transition hover:bg-[#202225]"
          >
            <ArrowLeft size={16} />
            Back to My Trades
          </Link>
        </div>
      </div>
    </div>
  );
}
