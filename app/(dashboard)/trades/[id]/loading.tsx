export default function TradeDetailsLoading() {
  return (
    <div className="min-h-screen min-w-0 p-4 text-white sm:p-6 lg:p-8">
      {/* Header skeleton */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="h-4 w-36 animate-pulse rounded bg-[#202225]" />
          <div className="mt-4 h-7 w-48 animate-pulse rounded bg-[#202225]" />
          <div className="mt-3 h-5 w-40 animate-pulse rounded bg-[#202225]" />
        </div>

        <div className="h-24 w-full shrink-0 animate-pulse rounded-xl border border-[#292B2E] bg-[#17191B] lg:w-64" />
      </div>

      {/* Card skeletons */}
      <div className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-56 animate-pulse rounded-xl border border-[#292B2E] bg-[#17191B]"
          />
        ))}

        <div className="h-64 animate-pulse rounded-xl border border-[#292B2E] bg-[#17191B] xl:col-span-2" />
      </div>
    </div>
  );
}
