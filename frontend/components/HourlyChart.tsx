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

import type { HourlyPoint } from "@/lib/types";

type HourlyChartProps = {
  points: HourlyPoint[];
};

export function HourlyChart({ points }: HourlyChartProps) {
  const data = points.map((point) => ({
    hour: `${String(point.hour).padStart(2, "0")}:00`,
    kwh: point.energy_kwh,
  }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="kwhFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="hour" tick={{ fill: "#1e293b", fontSize: 11 }} interval={2} />
          <YAxis
            tick={{ fill: "#1e293b", fontSize: 11 }}
            label={{ value: "кВт·ч", angle: -90, position: "insideLeft", fill: "#1e293b" }}
          />
          <Tooltip
            formatter={(value: number) => [`${value.toFixed(3)} кВт·ч`, "Нагрузка"]}
            contentStyle={{ borderColor: "#e2e8f0", borderRadius: 12 }}
          />
          <Area
            type="monotone"
            dataKey="kwh"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#kwhFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
