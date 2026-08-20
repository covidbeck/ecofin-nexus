"use client";

import type { BillAnalysisResponse } from "@/lib/types";

function formatKzt(value: number | undefined | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("ru-KZ", { maximumFractionDigits: 0 }).format(value);
}

const ESG_EXPLANATION: Record<"eligible" | "ineligible", string> = {
  eligible:
    "Потенциал снижения ≥20%. Компания может готовить пакет на зелёное финансирование Даму.",
  ineligible:
    "Текущий сценарий даёт снижение менее 20%. Выполните план оптимизации и загрузите следующую квитанцию для повторной оценки.",
};

type ResultCardsProps = {
  data?: BillAnalysisResponse | null;
};

export function ResultCards({ data }: ResultCardsProps) {
  const arbitrage = data?.arbitrage;
  const scope2 = data?.scope2;
  const esg = data?.esg;
  const eligible = esg?.status === "eligible";
  const explanation = esg?.status ? ESG_EXPLANATION[esg.status] : null;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <article className="card p-6">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          Потенциальная экономия
        </p>
        <p className="mt-3 text-3xl font-semibold text-emerald-600">
          {formatKzt(arbitrage?.delta_cost_kzt)} ₸
        </p>
        <p className="mt-2 text-sm text-slate-500">
          В сутки при переносе нагрузки · {arbitrage?.savings_percent?.toFixed(1) ?? "—"}% от
          базовой стоимости
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Гибкая нагрузка: {arbitrage?.shifted_kwh?.toFixed(2) ?? "—"} кВт·ч с пика на ночь
        </p>
      </article>

      <article className="card p-6">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          Scope 2 · выбросы CO₂
        </p>
        <p className="mt-3 text-3xl font-semibold text-teal-500">
          {scope2?.co2_avoided_tonnes?.toFixed(3) ?? "—"} т
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Предотвращённые выбросы по коэффициенту энергосистемы РК
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Эквивалент {scope2?.trees_equivalent?.toFixed(1) ?? "—"} высаженных деревьев
        </p>
      </article>

      <article className="card p-6">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
            Статус «Даму»
          </p>
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase ${
              eligible ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
            }`}
          >
            {eligible ? "Приемлемо" : esg?.status ? "Пока нет" : "—"}
          </span>
        </div>
        <p className="mt-3 text-3xl font-semibold text-slate-900">
          I_gap {esg?.i_gap != null ? esg.i_gap.toFixed(3) : "—"}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {explanation ?? "Загрузите квитанцию, чтобы оценить право на зелёное финансирование."}
        </p>
      </article>
    </div>
  );
}
