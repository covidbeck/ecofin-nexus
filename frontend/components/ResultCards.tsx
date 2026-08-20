"use client";

import type { BillAnalysisResponse } from "@/lib/types";

function formatKzt(value: number | undefined | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("ru-KZ", { maximumFractionDigits: 0 }).format(value);
}

type ResultCardsProps = {
  data?: BillAnalysisResponse | null;
};

export function ResultCards({ data }: ResultCardsProps) {
  const arbitrage = data?.arbitrage;
  const scope2 = data?.scope2;
  const esg = data?.esg;
  const eligible = esg?.status === "eligible";

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <article className="glass rounded-2xl p-6">
        <p className="text-[11px] tracking-[0.16em] text-emerald-100/50 uppercase">
          Потенциальная экономия
        </p>
        <p className="mt-4 text-3xl font-semibold text-accent-400">
          {formatKzt(arbitrage?.delta_cost_kzt)} ₸
        </p>
        <p className="mt-2 text-sm text-emerald-100/60">
          В сутки · {arbitrage?.savings_percent?.toFixed(1) ?? "—"}% от базовой стоимости
        </p>
        <p className="mt-1 text-xs text-emerald-100/40">
          Сдвиг {arbitrage?.shifted_kwh?.toFixed(2) ?? "—"} кВт·ч с пика на ночной тариф
        </p>
      </article>

      <article className="glass rounded-2xl p-6">
        <p className="text-[11px] tracking-[0.16em] text-emerald-100/50 uppercase">
          Предотвращённые выбросы
        </p>
        <p className="mt-4 text-3xl font-semibold text-teal-300">
          {scope2?.co2_avoided_tonnes?.toFixed(3) ?? "—"} т
        </p>
        <p className="mt-2 text-sm text-emerald-100/60">
          Scope 2 CO₂ · эквивалент {scope2?.trees_equivalent?.toFixed(1) ?? "—"} деревьев
        </p>
      </article>

      <article className="glass rounded-2xl p-6">
        <p className="text-[11px] tracking-[0.16em] text-emerald-100/50 uppercase">
          ESG-статус для «Даму»
        </p>
        <p className="mt-4 text-3xl font-semibold text-white">
          I_gap {esg?.i_gap?.toFixed(3) ?? "—"}
        </p>
        <span
          className={`mt-3 inline-flex rounded-full px-3 py-1 text-[11px] font-medium tracking-wide uppercase ${
            eligible
              ? "bg-accent-500/15 text-accent-400 ring-1 ring-accent-400/30"
              : "bg-white/5 text-emerald-100/60 ring-1 ring-white/10"
          }`}
        >
          {eligible ? "eligible" : (esg?.status ?? "pending")}
        </span>
        <p className="mt-3 text-sm leading-6 text-emerald-100/60">
          {esg?.summary ?? "Ожидание ответа API."}
        </p>
      </article>
    </div>
  );
}
