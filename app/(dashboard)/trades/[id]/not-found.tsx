import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function TradeNotFound() {
  return (
    <div className="flex min-h-screen min-w-0 items-center justify-center p-4 text-white sm:p-6">
      <div className="w-full max-w-md rounded-xl border border-[#292B2E] bg-[#17191B] p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[#303236] bg-[#202225]">
          <SearchX size={20} className="text-[#A7A9AC]" />
        </div>

        <h1 className="mt-5 text-lg font-semibold">Trade not found</h1>

        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[#77797C]">
          This trade doesn&apos;t exist, was deleted, or belongs to another
          account.
        </p>

        <Link
          href="/trades"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#A7A9AC] px-4 py-2.5 text-sm font-semibold text-[#101112] transition hover:bg-white"
        >
          <ArrowLeft size={16} />
          Back to My Trades
        </Link>
      </div>
    </div>
  );
}
