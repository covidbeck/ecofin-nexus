"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { BillUploader } from "@/components/BillUploader";
import { ResultCards } from "@/components/ResultCards";
import { useAuth } from "@/lib/auth-context";
import type { BillAnalysisResponse } from "@/lib/types";

const HourlyChart = dynamic(
  () => import("@/components/HourlyChart").then((mod) => mod.HourlyChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-80 items-center justify-center text-sm text-slate-400">
        Загрузка графика…
      </div>
    ),
  },
);

const REGION_LABELS: Record<string, string> = { astana: "Астана", almaty: "Алматы" };
const BUSINESS_LABELS: Record<string, string> = { bakery: "Пекарня", catering: "Общепит" };

export function AnalyticsWorkspace() {
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<BillAnalysisResponse | null>(null);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">Аналитика</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {user?.companyName ? `${user.companyName}: ваш энергоаудит` : "Zero-CapEx энергоаудит"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          Загрузите квитанцию — и получите тарифный арбитраж, почасовой профиль, Scope 2 и оценку
          для зелёного финансирования. Все цифры считает детерминированное ядро, ИИ только извлекает
          и формулирует.
        </p>
      </header>

      {!analysis ? (
        <BillUploader onSuccess={setAnalysis} />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                Результаты анализа
              </p>
              <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900">
                {analysis?.bill?.total_kwh ?? "—"} кВт·ч ·{" "}
                {analysis?.bill?.region
                  ? (REGION_LABELS[analysis.bill.region] ?? analysis.bill.region)
                  : "—"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {analysis?.bill?.business_type
                  ? (BUSINESS_LABELS[analysis.bill.business_type] ?? analysis.bill.business_type)
                  : "—"}{" "}
                · период {analysis?.bill?.days_in_month ?? "—"} дн. · счёт{" "}
                {new Intl.NumberFormat("ru-KZ", { maximumFractionDigits: 0 }).format(
                  analysis?.bill?.cost_kzt ?? 0,
                )}{" "}
                ₸
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAnalysis(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-gray-300 hover:bg-slate-50"
            >
              Загрузить другую квитанцию
            </button>
          </div>

          <ResultCards data={analysis} />

          <section className="card p-6 sm:p-8">
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              Почасовой профиль
            </p>
            <h3 className="mt-1.5 text-lg font-semibold text-slate-900">
              Нагрузка и стоимость за типичные сутки
            </h3>
            <div className="mt-6">
              <HourlyChart points={analysis?.hourly_profile?.points} />
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Итого за сутки: {analysis?.hourly_profile?.total_daily_kwh?.toFixed(2) ?? "—"} кВт·ч ·{" "}
              {analysis?.hourly_profile?.total_daily_cost_kzt?.toFixed(0) ?? "—"} ₸
            </p>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-6 sm:p-8">
              <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                AI Roadmap
              </p>
              <h3 className="mt-1.5 text-lg font-semibold text-slate-900">План оптимизации</h3>
              {(analysis?.ai_roadmap ?? []).length > 0 ? (
                <ol className="mt-5 space-y-4">
                  {analysis?.ai_roadmap?.map((step, index) => (
                    <li key={step} className="flex gap-3 text-sm leading-6 text-slate-700">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-4 text-sm text-slate-400">План появится после ответа API.</p>
              )}
            </section>

            <section className="card p-6 sm:p-8">
              <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                ESG Executive Summary
              </p>
              <h3 className="mt-1.5 text-lg font-semibold text-slate-900">
                Резюме для андеррайтинга
              </h3>
              <p className="mt-5 text-sm leading-7 text-slate-700">
                {analysis?.esg_executive_summary ?? "Сводка появится после анализа."}
              </p>
              <p className="mt-4 text-xs text-slate-400">
                Оценка носит рекомендательный характер и не гарантирует одобрение кредита или
                субсидии.
              </p>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
