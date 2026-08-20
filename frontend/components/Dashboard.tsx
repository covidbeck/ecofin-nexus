"use client";

import { ResultCards } from "@/components/ResultCards";
import type { BillAnalysisResponse } from "@/lib/types";

const REGION_LABELS: Record<string, string> = {
  astana: "Астана",
  almaty: "Алматы",
};

const BUSINESS_LABELS: Record<string, string> = {
  bakery: "Пекарня",
  catering: "Общепит",
};

type DashboardProps = {
  data?: BillAnalysisResponse | null;
  onReset?: () => void;
};

export function Dashboard({ data, onReset }: DashboardProps) {
  if (!data) {
    return (
      <p className="text-sm text-emerald-100/40">Нет данных анализа. Загрузите квитанцию.</p>
    );
  }

  const region = data?.bill?.region;
  const business = data?.bill?.business_type;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium tracking-[0.18em] text-accent-400 uppercase">
            Результаты анализа
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            {data?.bill?.total_kwh ?? "—"} кВт·ч ·{" "}
            {region ? (REGION_LABELS[region] ?? region) : "—"}
          </h2>
          <p className="mt-1 text-sm text-emerald-100/50">
            {business ? (BUSINESS_LABELS[business] ?? business) : "—"} ·{" "}
            {data?.bill?.days_in_month ?? "—"} дней в периоде
          </p>
        </div>
        {onReset ? (
          <button
            type="button"
            onClick={onReset}
            className="rounded-full border border-emerald-300/20 px-4 py-2 text-sm text-emerald-100/70 transition hover:border-accent-400/50 hover:text-white"
          >
            Загрузить другой счёт
          </button>
        ) : null}
      </div>
      <ResultCards data={data} />
    </div>
  );
}
