"use client";

import dynamic from "next/dynamic";

import { BillUploader } from "@/components/BillUploader";
import { Dashboard } from "@/components/Dashboard";
import type { BillAnalysisResponse } from "@/lib/types";

const HourlyChart = dynamic(
  () => import("@/components/HourlyChart").then((mod) => mod.HourlyChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-80 items-center justify-center text-sm text-emerald-100/40">
        Загрузка графика…
      </div>
    ),
  },
);

type DashboardWorkspaceProps = {
  analysis: BillAnalysisResponse | null;
  onSuccess: (data: BillAnalysisResponse) => void;
  onReset: () => void;
};

export function DashboardWorkspace({ analysis, onSuccess, onReset }: DashboardWorkspaceProps) {
  if (!analysis) {
    return <BillUploader onSuccess={onSuccess} />;
  }

  const points = analysis?.hourly_profile?.points;
  const roadmap = analysis?.ai_roadmap ?? [];

  return (
    <div className="space-y-6">
      <Dashboard data={analysis} onReset={onReset} />

      <section className="glass rounded-2xl p-6 sm:p-8">
        <p className="text-[11px] tracking-[0.16em] text-emerald-100/50 uppercase">
          Почасовой профиль
        </p>
        <h3 className="mt-2 text-lg font-medium text-white">
          Нагрузка и стоимость за типичные сутки
        </h3>
        <div className="mt-6">
          <HourlyChart points={points} />
        </div>
        <p className="mt-4 text-xs text-emerald-100/40">
          Итого за сутки: {analysis?.hourly_profile?.total_daily_kwh?.toFixed(2) ?? "—"} кВт·ч ·{" "}
          {analysis?.hourly_profile?.total_daily_cost_kzt?.toFixed(0) ?? "—"} ₸
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass rounded-2xl p-6 sm:p-8">
          <p className="text-[11px] tracking-[0.16em] text-emerald-100/50 uppercase">
            AI Roadmap
          </p>
          <h3 className="mt-2 text-lg font-medium text-white">План оптимизации</h3>
          {roadmap.length > 0 ? (
            <ol className="mt-5 space-y-4">
              {roadmap.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm leading-6 text-emerald-50/90">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-500/15 text-xs font-semibold text-accent-400 ring-1 ring-accent-400/30">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm text-emerald-100/40">План появится после ответа API.</p>
          )}
        </section>

        <section className="glass rounded-2xl p-6 sm:p-8">
          <p className="text-[11px] tracking-[0.16em] text-emerald-100/50 uppercase">
            Модуль Insights
          </p>
          <h3 className="mt-2 text-lg font-medium text-white">ESG Executive Summary</h3>
          <p className="mt-5 text-sm leading-7 text-emerald-50/90">
            {analysis?.esg_executive_summary ?? "Сводка появится после анализа."}
          </p>
        </section>
      </div>
    </div>
  );
}
