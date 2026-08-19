"use client";

import type { BillAnalysisResponse } from "@/lib/types";

function formatKzt(value: number) {
  return new Intl.NumberFormat("ru-KZ", { maximumFractionDigits: 0 }).format(value);
}

type DashboardProps = {
  data: BillAnalysisResponse;
  onReset?: () => void;
};

export function Dashboard({ data, onReset }: DashboardProps) {
  const { bill, arbitrage, scope2, esg } = data;
  const eligible = esg.status === "eligible";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-emerald-600 uppercase">
            Результаты анализа
          </p>
          <h2 className="mt-2 text-2xl font-light tracking-tight text-slate-900">
            Счёт {bill.total_kwh} кВт·ч · {bill.region}
          </h2>
        </div>
        {onReset ? (
          <button
            type="button"
            onClick={onReset}
            className="text-sm text-slate-500 transition hover:text-slate-900"
          >
            Загрузить другой счёт
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs tracking-[0.16em] text-slate-400 uppercase">Потенциальная экономия</p>
          <p className="mt-4 text-3xl font-light text-emerald-600">
            {formatKzt(arbitrage.delta_cost_kzt)} ₸
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Сдвиг {arbitrage.shifted_kwh.toFixed(2)} кВт·ч с пика на ночь
          </p>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs tracking-[0.16em] text-slate-400 uppercase">
            Предотвращённые выбросы
          </p>
          <p className="mt-4 text-3xl font-light text-teal-500">
            {scope2.co2_avoided_tonnes.toFixed(4)} т
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Scope 2 CO₂ · эквивалент {scope2.trees_equivalent.toFixed(1)} деревьев
          </p>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs tracking-[0.16em] text-slate-400 uppercase">ESG-статус Даму</p>
          <p className="mt-4 text-3xl font-light text-slate-900">{esg.i_gap.toFixed(4)}</p>
          <p
            className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase ${
              eligible ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
            }`}
          >
            {eligible ? "Eligible" : "Ineligible"}
          </p>
          <p className="mt-3 text-sm text-slate-500">{esg.summary}</p>
        </article>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-xs tracking-[0.16em] text-slate-400 uppercase">Рекомендации</p>
        <h3 className="mt-2 text-lg font-medium text-slate-900">Ночной тариф</h3>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          Перенесите {arbitrage.shifted_kwh.toFixed(2)} кВт·ч гибкой нагрузки (выпечка, холодильные
          циклы, тестомесы) с пиковых часов 19:00–23:00 на ночь 23:00–07:00. По расчёту ядра это
          экономия {formatKzt(arbitrage.delta_cost_kzt)} ₸ в сутки при том же объёме энергии.
        </p>
      </section>
    </div>
  );
}
