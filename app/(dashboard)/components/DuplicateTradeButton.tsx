"use client";

import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import {
  buildDuplicatePrefill,
  saveDuplicateDraft,
  type DuplicateTradeSource,
} from "@/lib/trade-duplicate";

/**
 * Copies only reusable details into a single-use draft, then opens the
 * existing Add Trade form. Nothing is written to the database here.
 */
export default function DuplicateTradeButton({
  trade,
}: {
  trade: DuplicateTradeSource;
}) {
  const router = useRouter();

  function handleDuplicate() {
    saveDuplicateDraft(buildDuplicatePrefill(trade), trade.id);
    router.push("/trades/new");
  }

  return (
    <button
      type="button"
      onClick={handleDuplicate}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#303236] px-4 text-sm font-medium text-[#C4C6C8] transition hover:bg-[#202225] hover:text-white"
    >
      <Copy size={16} />
      Duplicate Trade
    </button>
  );
}
