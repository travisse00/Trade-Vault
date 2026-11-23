import { Route } from "lucide-react";

import { ROADMAP_STATUSES, roadmapItems, type RoadmapStatus } from "@/lib/roadmap";

const STATUS_CLASSES: Record<RoadmapStatus, string> = {
  Planned: "border-[#303236] bg-[#17191B] text-[#A7A9AC]",
  "In Development": "border-[#3A3D41] bg-[#1D1F21] text-[#C4C6C8]",
  "Coming Soon": "border-[#4A4D52] bg-[#202225] text-[#D7D8DA]",
  Released: "border-[#4A4D52] bg-[#222427] text-[#E5E6E7]",
};

function StatusLabel({ status }: { status: RoadmapStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${STATUS_CLASSES[status]}`}
    >
      {status}
    </span>
  );
}

export default function RoadmapPage() {
  return (
    <div className="min-h-screen min-w-0 p-4 text-white sm:p-6 lg:p-8">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#303236] bg-[#202225] text-[#A7A9AC]">
          <Route size={18} />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Product Roadmap</h1>
          <p className="mt-1 text-sm text-[#77797C]">
            Features and improvements planned for TradeVault. Statuses change as work progresses.
          </p>
        </div>
      </div>

      <section className="mt-7 overflow-hidden rounded-2xl border border-[#303236] bg-[#1A1C1E]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#303236] px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#A7A9AC]">
              Upcoming improvements
            </h2>
            <p className="mt-1 text-xs text-[#77797C]">
              No release dates or delivery timelines are published here.
            </p>
          </div>
          <span className="text-xs text-[#77797C]">
            {roadmapItems.length} items
          </span>
        </div>

        <ul className="divide-y divide-[#26282B]">
          {roadmapItems.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 px-4 py-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:px-5"
            >
              <div className="min-w-0 max-w-2xl">
                <h3 className="text-sm font-semibold text-[#E5E6E7]">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#9FA1A4]">
                  {item.description}
                </p>
                {item.capabilities?.length ? (
                  <div className="mt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6F7174]">
                      Potential capabilities
                    </p>
                    <ul className="mt-2 grid gap-x-5 gap-y-1.5 sm:grid-cols-2">
                      {item.capabilities.map((capability) => (
                        <li
                          key={capability}
                          className="flex items-start gap-2 text-xs leading-relaxed text-[#85878A]"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#5E6063]"
                          />
                          {capability}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
              <div className="shrink-0 sm:pt-0.5">
                <StatusLabel status={item.status} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-[#6F7174]">
        <span className="mr-1 uppercase tracking-wider">Statuses</span>
        {ROADMAP_STATUSES.map((status) => (
          <StatusLabel key={status} status={status} />
        ))}
      </div>
    </div>
  );
}
