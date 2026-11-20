import Link from "next/link";
import { ArrowLeft, Newspaper } from "lucide-react";

export default function MarketNewsPage() {
  return (
    <div className="mx-auto w-full max-w-[900px] p-4 sm:p-6 lg:p-8">
      <Link
        href="/dashboard"
        className="mb-8 inline-flex items-center gap-2 text-sm text-[#92969A] transition hover:text-white"
      >
        <ArrowLeft size={16} />
        Back to overview
      </Link>

      <div className="mb-8 flex items-center gap-3">
        <Newspaper size={22} className="text-[#A7A9AC]" />
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Market News
        </h1>
      </div>

      <section className="rounded-xl border border-[#292B2E] bg-[#17191B] p-8 text-center">
        <p className="text-sm font-medium text-white">
          Market news is not available yet
        </p>

        <p className="mx-auto mt-2 max-w-md text-sm text-[#85878A]">
          This space is reserved for market headlines and economic events.
          Once a news source is connected, your feed will appear here.
        </p>
      </section>
    </div>
  );
}
