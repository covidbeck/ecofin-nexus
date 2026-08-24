"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { EvidenceDrawer } from "@/components/evidence-drawer";
import { StatusBadge, formatNumber } from "@/components/status-badge";
import {
  createScenario,
  fetchActionCatalog,
  fetchConsumption,
  fetchScenarios,
  simulateScenario,
  updateScenario,
} from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { ActionLevel, Scenario, SimulationResult } from "@/lib/types";

const SLIDER_TO_LEVEL = [0, 0.5, 1] as const;

function sliderFromLevel(level: number): number {
  if (level >= 1) return 2;
  if (level >= 0.5) return 1;
  return 0;
}

function levelsToMap(actions: ActionLevel[]): Record<string, number> {
  return Object.fromEntries(actions.map((a) => [a.action_id, a.level]));
}

function ResultPanel({ result }: { result: SimulationResult }) {
  if (!result.feasible) {
    return (
      <div className="rounded-lg border border-red-100 bg-red-50 p-4">
        <p className="mb-2 text-sm font-semibold text-red-800">
          Сценарий нарушает ограничения предприятия
        </p>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-red-700">
          {result.violations.map((violation, index) => (
            <li key={index}>{violation}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs text-slate-500">База</p>
          <p className="text-lg font-semibold text-slate-900">
            {formatNumber(result.base_cost_kzt)} ₸
          </p>
          <p className="text-xs text-slate-500">{formatNumber(result.base_kwh)} кВт·ч</p>
        </div>
        <div className="rounded-lg bg-emerald-50 p-4">
          <p className="text-xs text-emerald-700">Сценарий</p>
          <p className="text-lg font-semibold text-emerald-800">
            {result.scenario_cost_kzt.value !== null
              ? `${formatNumber(result.scenario_cost_kzt.value)} ₸`
              : "недоступно"}
          </p>
          <p className="text-xs text-emerald-700">
            {result.scenario_kwh.value !== null
              ? `${formatNumber(result.scenario_kwh.value)} кВт·ч`
              : ""}
          </p>
        </div>
        <div className="rounded-lg bg-slate-900 p-4">
          <p className="text-xs text-slate-300">Δ стоимость</p>
          <p className="text-lg font-semibold text-white">
            {result.delta_cost_kzt.value !== null
              ? `−${formatNumber(result.delta_cost_kzt.value)} ₸`
              : "недоступно"}
          </p>
          <p className="text-xs text-slate-300">
            интервал {formatNumber(result.confidence.low)}–{formatNumber(result.confidence.high)} ₸
          </p>
        </div>
        <div className="rounded-lg bg-teal-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-teal-700">Избегаемый CO₂e</p>
            <StatusBadge status={result.avoided_co2e_kg.status} />
          </div>
          <p className="text-lg font-semibold text-teal-800">
            {result.avoided_co2e_kg.value !== null
              ? `${formatNumber(result.avoided_co2e_kg.value, 1)} кг`
              : "недоступно"}
          </p>
          {result.avoided_co2e_kg.value === null ? (
            <p className="text-xs text-teal-700">
              {result.avoided_co2e_kg.explanation ?? "Нет утверждённого emission factor."}
            </p>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-slate-400">
        Все значения сценария — симуляция на основе конфигурируемого каталога действий, не
        гарантия экономии. Доверие: {result.confidence.label}.
      </p>
    </div>
  );
}

export function ScenarioSimulator() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const catalogQuery = useQuery({ queryKey: ["action-catalog"], queryFn: fetchActionCatalog });
  const recordsQuery = useQuery({ queryKey: ["consumption"], queryFn: fetchConsumption });
  const scenariosQuery = useQuery({ queryKey: ["scenarios"], queryFn: fetchScenarios });

  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [levels, setLevels] = useState<Record<string, number>>({});
  const [name, setName] = useState("Мой сценарий");
  const [baseRecordId, setBaseRecordId] = useState<number | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const records = recordsQuery.data?.records ?? [];
  const catalog = catalogQuery.data;
  const scenarios = scenariosQuery.data?.scenarios ?? [];

  const simulateMutation = useMutation({
    mutationFn: async () => {
      const actions: ActionLevel[] = Object.entries(levels)
        .filter(([, level]) => level > 0)
        .map(([action_id, level]) => ({ action_id, level }));
      const recordId = baseRecordId ?? records[0]?.id;
      if (!recordId) throw new Error("Сначала добавьте хотя бы один период данных.");

      let scenario: Scenario;
      if (activeScenario) {
        scenario = await updateScenario(activeScenario.id, { name, actions });
      } else {
        scenario = await createScenario({ name, base_record_id: recordId, actions });
        setActiveScenario(scenario);
      }
      return simulateScenario(scenario.id);
    },
    onSuccess: (simulation) => {
      setResult(simulation);
      void queryClient.invalidateQueries({ queryKey: ["scenarios"] });
      if (!simulation.feasible) {
        showToast("Сценарий не проходит ограничения — см. детали", "info");
      }
    },
    onError: (error) =>
      showToast(error instanceof Error ? error.message : "Ошибка симуляции", "error"),
  });

  const loadScenario = (scenario: Scenario) => {
    setActiveScenario(scenario);
    setName(scenario.name);
    setBaseRecordId(scenario.base_record_id);
    setLevels(levelsToMap(scenario.actions));
    setResult(scenario.result);
  };

  const resetScenario = () => {
    setActiveScenario(null);
    setName("Мой сценарий");
    setLevels({});
    setResult(null);
  };

  if (recordsQuery.isSuccess && records.length === 0) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center animate-fade-in">
        <h2 className="mb-2 text-xl font-semibold text-slate-900">Нет данных для сценариев</h2>
        <p className="mb-6 text-sm text-slate-600">
          Сценарии моделируются от подтверждённого периода потребления. Сначала добавьте счёт
          или ручную запись.
        </p>
        <Link
          href="/bills"
          className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-800"
        >
          Добавить данные
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Симулятор сценариев
          </h1>
          <p className="text-sm text-slate-500">
            Выберите действия и уровни — движок детерминированно посчитает эффект и проверит
            ограничения. Каталог: версия {catalog?.version ?? "…"}.
          </p>
        </div>
        {activeScenario ? (
          <button
            type="button"
            onClick={resetScenario}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-300"
          >
            Новый сценарий
          </button>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="card flex flex-col gap-4 p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Название сценария
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Базовый период
              <select
                value={baseRecordId ?? records[0]?.id ?? ""}
                onChange={(event) => setBaseRecordId(Number(event.target.value))}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400"
              >
                {records.map((record) => (
                  <option key={record.id} value={record.id}>
                    {record.period_start} — {record.period_end} (
                    {formatNumber(record.kwh)} кВт·ч)
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-3">
            {catalogQuery.isLoading ? (
              <p className="text-sm text-slate-500">Загружаем каталог действий…</p>
            ) : (
              (catalog?.actions ?? []).map((action) => {
                const level = levels[action.id] ?? 0;
                const slider = sliderFromLevel(level);
                return (
                  <div key={action.id} className="rounded-lg border border-gray-100 p-4">
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">{action.label}</p>
                      <span className="text-xs text-slate-400">
                        до −{Math.round(action.savings_share * 100)}% ·{" "}
                        {action.capex_kzt > 0
                          ? `CapEx ${formatNumber(action.capex_kzt)} ₸`
                          : "без CapEx"}
                      </span>
                    </div>
                    <p className="mb-3 text-xs text-slate-500">{action.description}</p>
                    {action.requires_tou ? (
                      <p className="mb-2 text-xs text-amber-700">
                        Денежный эффект доступен только при утверждённом time-of-use тарифе.
                      </p>
                    ) : null}
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={2}
                        step={1}
                        value={slider}
                        onChange={(event) =>
                          setLevels((prev) => ({
                            ...prev,
                            [action.id]: SLIDER_TO_LEVEL[Number(event.target.value)] ?? 0,
                          }))
                        }
                        className="flex-1 accent-emerald-700"
                      />
                      <span className="w-24 text-right text-xs font-medium text-slate-600">
                        {slider === 0 ? "выключено" : slider === 1 ? "частично (50%)" : "полностью"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <button
            type="button"
            disabled={simulateMutation.isPending}
            onClick={() => simulateMutation.mutate()}
            className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:opacity-50"
          >
            {simulateMutation.isPending ? "Симулируем…" : "Симулировать сценарий"}
          </button>

          {result ? (
            <div className="flex flex-col gap-3">
              <ResultPanel result={result} />
              {result.feasible ? (
                <EvidenceDrawer
                  assumptions={[]}
                  snapshot={result.snapshot}
                  missingData={[]}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        <aside className="card h-fit p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Сохранённые сценарии</h2>
          {scenariosQuery.isLoading ? (
            <p className="text-sm text-slate-500">Загружаем…</p>
          ) : scenarios.length === 0 ? (
            <p className="text-sm text-slate-500">
              Пока нет сценариев. Первая симуляция сохранит сценарий автоматически.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {scenarios.map((scenario) => (
                <li key={scenario.id}>
                  <button
                    type="button"
                    onClick={() => loadScenario(scenario)}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                      activeScenario?.id === scenario.id
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-gray-100 text-slate-700 hover:border-emerald-200"
                    }`}
                  >
                    <span className="block font-medium">{scenario.name}</span>
                    <span className="block text-xs text-slate-400">
                      {scenario.actions.length} действий
                      {scenario.result
                        ? scenario.result.feasible
                          ? ` · −${formatNumber(scenario.result.delta_cost_kzt.value ?? 0)} ₸`
                          : " · невыполним"
                        : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
