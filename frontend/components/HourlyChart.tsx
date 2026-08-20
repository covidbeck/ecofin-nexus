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

const AXIS_TICK = { fill: "#a7f3d0", fontSize: 11 };

export function HourlyChart({ points }: HourlyChartProps) {
  const series = points ?? [];
  const data = series.map((point) => ({
    hour: `${String(point?.hour ?? 0).padStart(2, "0")}:00`,
    kwh: point?.energy_kwh ?? 0,
    cost: point?.cost_kzt ?? 0,
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center text-sm text-emerald-100/40">
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
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(167, 243, 208, 0.12)" />
          <XAxis dataKey="hour" tick={AXIS_TICK} interval={2} stroke="rgba(167,243,208,0.25)" />
          <YAxis
            yAxisId="kwh"
            tick={AXIS_TICK}
            stroke="rgba(167,243,208,0.25)"
            label={{ value: "кВт·ч", angle: -90, position: "insideLeft", fill: "#a7f3d0" }}
          />
          <YAxis
            yAxisId="cost"
            orientation="right"
            tick={AXIS_TICK}
            stroke="rgba(167,243,208,0.25)"
          />
          <Tooltip
            formatter={(value: number | string, name: string) =>
              name === "Стоимость"
                ? [`${Number(value).toFixed(2)} ₸`, name]
                : [`${Number(value).toFixed(3)} кВт·ч`, name]
            }
            contentStyle={{
              backgroundColor: "rgba(7, 35, 24, 0.95)",
              border: "1px solid rgba(52, 211, 153, 0.3)",
              borderRadius: 12,
              color: "#ecfdf5",
            }}
            labelStyle={{ color: "#a7f3d0" }}
            cursor={{ fill: "rgba(16, 185, 129, 0.08)" }}
          />
          <Legend wrapperStyle={{ color: "#a7f3d0", fontSize: 12 }} />
          <Bar yAxisId="cost" dataKey="cost" name="Стоимость" fill="rgba(52, 211, 153, 0.22)" />
          <Area
            yAxisId="kwh"
            type="monotone"
            dataKey="kwh"
            name="Нагрузка"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#kwhFill)"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
