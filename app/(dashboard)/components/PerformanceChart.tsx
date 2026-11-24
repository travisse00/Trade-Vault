"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import type {
  PerformancePeriod,
  PerformancePoint,
} from "@/lib/service/analytics.service";
import { formatSignedCurrency } from "@/lib/format";

type Period = PerformancePeriod;

const periods: Period[] = ["7D", "30D", "90D", "All time"];

export default function PerformanceChart({
  performance,
  currency,
}: {
  performance: Record<PerformancePeriod, PerformancePoint[]>;
  currency: string;
}) {
  const [period, setPeriod] = useState<Period>("30D");

  const data = performance[period] ?? [];
  const currentPnl = data[data.length - 1]?.value ?? 0;
  const isPositive = currentPnl >= 0;
  const hasTrades = data.length > 1;

  return (
    <section className="mt-6 min-w-0 overflow-hidden rounded-xl border border-[#292B2E] bg-[#17191B] p-4 sm:p-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-white">
              P&L Performance
            </h2>
          </div>

          <p className="mt-1 text-xs text-[#77797C]">
            Cumulative profit and loss over time
          </p>
        </div>

        <div className="flex w-full rounded-lg border border-[#292B2E] bg-[#101112] p-1 sm:w-auto">
          {periods.map((item) => (
            <button
              key={item}
              onClick={() => setPeriod(item)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs transition sm:flex-none ${
                period === item
                  ? "bg-[#292B2E] text-white"
                  : "text-[#77797C] hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Summary */}
      <div className="mt-6">
        <p className="text-xs text-[#77797C]">
          Ending cumulative P&L
        </p>

        <p
          className={`mt-1 text-2xl font-semibold tracking-tight ${
            isPositive ? "text-[#79B89A]" : "text-[#D17A7A]"
          }`}
        >
          {formatSignedCurrency(currentPnl, currency)}
        </p>
      </div>

      {hasTrades ? (
        <div className="mt-5 h-[240px] w-full sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 12, left: -18, bottom: 0 }}
            >
              <CartesianGrid
                stroke="#292B2E"
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#77797C", fontSize: 11 }}
                tickMargin={12}
                minTickGap={20}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#77797C", fontSize: 11 }}
                tickFormatter={(value) => `${value}`}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: "#202225",
                  border: "1px solid #414448",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{
                  color: "#A7A9AC",
                  marginBottom: "4px",
                }}
                formatter={(value) => [
                  formatSignedCurrency(Number(value), currency),
                  "Cumulative P&L",
                ]}
              />

              <ReferenceLine
                y={0}
                stroke="#686A6D"
                strokeDasharray="4 4"
              />

              <Line
                type="monotone"
                dataKey="value"
                stroke={isPositive ? "#79B89A" : "#D17A7A"}
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 5,
                  fill: isPositive ? "#79B89A" : "#D17A7A",
                  stroke: "#17191B",
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-5 flex h-[240px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-[#292B2E] sm:h-[280px]">
          <p className="text-sm font-medium text-white">
            No closed trades in this period
          </p>
          <p className="mt-1 text-xs text-[#77797C]">
            Your cumulative P&L will appear here once trades are closed.
          </p>
        </div>
      )}

      <p className="mt-3 text-[11px] text-[#686A6D]">
        Calculated from your closed trades. Deposits and withdrawals are not
        included.
      </p>
    </section>
  );
}
