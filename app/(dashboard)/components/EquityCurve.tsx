"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EquityPoint } from "@/lib/service/analytics.service";

export default function EquityCurve({
  equity,
  currency,
}: {
  equity: EquityPoint[];
  currency: string;
}) {
  const finalBalance = equity[equity.length - 1]?.balance ?? 0;
  const hasActivity = equity.length > 1;

  return (
    <section className="mb-8 rounded-xl border border-[#292B2D] bg-[#171819] p-5">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">
            Equity Curve
          </h2>
          <p className="mt-1 text-sm text-[#85888B]">
            Account balance after each deposit, withdrawal and closed trade
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-[#85888B]">Current balance</p>
          <p className="mt-1 text-lg font-semibold text-[#A7A9AC]">
            {finalBalance.toFixed(2)} {currency}
          </p>
        </div>
      </div>

      {hasActivity ? (
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={equity}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="#A7A9AC"
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="100%"
                    stopColor="#A7A9AC"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke="#292B2D"
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="label"
                stroke="#85888B"
                tick={{ fill: "#85888B", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                stroke="#85888B"
                tick={{ fill: "#85888B", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: "#202224",
                  border: "1px solid #383A3D",
                  borderRadius: "8px",
                  color: "#FFFFFF",
                }}
                formatter={(value) => [
                  `${Number(value).toFixed(2)} ${currency}`,
                  "Balance",
                ]}
                labelStyle={{ color: "#A7A9AC" }}
              />

              <Area
                type="monotone"
                dataKey="balance"
                stroke="#A7A9AC"
                strokeWidth={2}
                fill="url(#equityFill)"
                activeDot={{ r: 5, fill: "#A7A9AC" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-[260px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-[#292B2D]">
          <p className="text-sm font-medium text-white">
            No account activity yet
          </p>
          <p className="mt-1 text-xs text-[#85888B]">
            Your equity curve will appear after your first trade or
            transaction.
          </p>
        </div>
      )}

      <p className="mt-3 text-xs text-[#66696C]">
        Starting balance: {equity[0]?.balance.toFixed(2) ?? "0.00"}{" "}
        {currency} · Closed trades only
      </p>
    </section>
  );
}
