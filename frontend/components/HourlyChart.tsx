"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { HourlyPoint } from "@/lib/types";

type HourlyChartProps = {
  points?: HourlyPoint[] | null;
};

const AXIS_TICK = { fill: "#64748b", fontSize: 11 };

export function HourlyChart({ points }: HourlyChartProps) {
  const series = points ?? [];
  const data = series.map((point) => ({
    hour: `${String(point?.hour ?? 0).padStart(2, "0")}:00`,
    kwh: point?.energy_kwh ?? 0,
    cost: point?.cost_kzt ?? 0,
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center text-sm text-slate-400">
        Нет почасовых точек для графика.
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="kwhFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="hour" tick={AXIS_TICK} interval={2} stroke="#cbd5e1" />
          <YAxis
            yAxisId="kwh"
            tick={AXIS_TICK}
            stroke="#cbd5e1"
            label={{ value: "кВт·ч", angle: -90, position: "insideLeft", fill: "#64748b" }}
          />
          <YAxis yAxisId="cost" orientation="right" tick={AXIS_TICK} stroke="#cbd5e1" />
          <Tooltip
            formatter={(value: number | string, name: string) =>
              name === "Стоимость"
                ? [`${Number(value).toFixed(2)} ₸`, name]
                : [`${Number(value).toFixed(3)} кВт·ч`, name]
            }
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              color: "#0f172a",
              boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
            }}
            labelStyle={{ color: "#64748b" }}
            cursor={{ fill: "rgba(5, 150, 105, 0.06)" }}
          />
          <Legend wrapperStyle={{ color: "#64748b", fontSize: 12 }} />
          <Bar yAxisId="cost" dataKey="cost" name="Стоимость" fill="#99f6e4" radius={[3, 3, 0, 0]} />
          <Area
            yAxisId="kwh"
            type="monotone"
            dataKey="kwh"
            name="Нагрузка"
            stroke="#059669"
            strokeWidth={2}
            fill="url(#kwhFill)"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
