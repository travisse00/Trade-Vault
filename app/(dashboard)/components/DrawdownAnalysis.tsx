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
import type { DrawdownSummary } from "@/lib/service/analytics.service";
import { formatCurrency } from "@/lib/format";

export default function DrawdownAnalysis({
  drawdown,
  currency,
}: {
  drawdown: DrawdownSummary;
  currency: string;
}) {
  const formatPercent = (value: number | null) =>
    value === null ? "N/A" : `${value.toFixed(2)}%`;

  const metrics = [
    {
      label: "Current Drawdown",
      value: formatCurrency(drawdown.currentDrawdown, currency),
      detail: formatPercent(drawdown.currentDrawdownPercent),
    },
    {
      label: "Maximum Drawdown",
      value: formatCurrency(drawdown.maxDrawdown, currency),
      detail: formatPercent(drawdown.maxDrawdownPercent),
    },
    {
      label: "Current Equity",
      value: formatCurrency(drawdown.currentEquity, currency),
      detail: "After deposits and closed trades",
    },
    {
      label: "Recovery Status",
      value: drawdown.isRecovered ? "At Peak" : "Below Peak",
      detail: drawdown.isRecovered
        ? "Equity has recovered to its peak"
        : "Equity has not recovered yet",
    },
  ];

  return (
    <section className="rounded-xl border border-[#292B2D] bg-[#171819] p-5">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-white">
          Drawdown Analysis
        </h2>
        <p className="mt-1 text-sm text-[#85888B]">
          Track declines from your previous equity peak
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-lg border border-[#292B2D] bg-[#1D1F20] p-4"
          >
            <p className="text-xs text-[#85888B]">{metric.label}</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {metric.value}
            </p>
            <p className="mt-1 text-xs text-[#777A7D]">
              {metric.detail}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-3">
        <h3 className="text-sm font-medium text-white">
          Drawdown Over Time
        </h3>
        <p className="mt-1 text-xs text-[#85888B]">
          Distance between equity and its previous peak
        </p>
      </div>

      {drawdown.hasDrawdown ? (
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={drawdown.chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="drawdownFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
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
                  formatCurrency(Number(value), currency),
                  "Drawdown",
                ]}
                labelStyle={{ color: "#A7A9AC" }}
              />

              <Area
                type="monotone"
                dataKey="drawdown"
                stroke="#A7A9AC"
                strokeWidth={2}
                fill="url(#drawdownFill)"
                activeDot={{ r: 5, fill: "#A7A9AC" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-[250px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-[#292B2D]">
          <p className="text-sm font-medium text-white">
            No drawdown recorded
          </p>
          <p className="mt-1 text-xs text-[#85888B]">
            Your equity has not dropped below a previous peak.
          </p>
        </div>
      )}

      <p className="mt-3 text-xs text-[#66696C]">
        Based on your account balance · Closed trades and cash transactions
      </p>
    </section>
  );
}
