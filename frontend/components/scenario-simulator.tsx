"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { ChoiceGroup } from "@/components/choice-group";
import { EvidenceDrawer } from "@/components/evidence-drawer";
import { TrustBadge, formatNumber } from "@/components/status-badge";
import {
  createScenario,
  fetchActionCatalog,
  fetchConsumption,
  fetchOrganizationConfig,
  fetchOrganizationProfile,
  fetchScenarios,
  simulateScenario,
  updateScenario,
} from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { ActionCatalogItem, ActionLevel, Constraints, Scenario, SimulationResult } from "@/lib/types";
import {
  ACTION_LEVEL_OPTIONS,
  ACTION_LEVEL_VALUES,
  accuracyLabel,
  actionCondition,
  actionConstraintPreview,
  actionEffect,
  actionSummary,
  actionTitle,
  actionUnavailableReason,
  compareWithLabel,
  humanizeViolation,
  isTouTariff,
  levelFromNumber,
  savingsKwhLabel,
  savingsLabel,
  selectedActionsEffectCopy,
  valueStatusHuman,
  whyPlanFits,
  type ActionLevelChoice,
  type ConstraintPreview,
} from "@/lib/ux-copy";

function levelsToMap(actions: ActionLevel[]): Record<string, number> {
  return Object.fromEntries(actions.map((item) => [item.action_id, item.level]));
}

function selectedCount(levels: Record<string, number>): number {
  return Object.values(levels).filter((level) => level > 0).length;
}

function ResultPanel({
  result,
  why,
  effectCopy,
}: {
  result: SimulationResult;
  why: string;
  effectCopy: string;
}) {
  if (!result.feasible) {
    return (
      <div className="warning-panel">
        <p className="mb-2 text-sm font-semibold">Этот план сейчас нельзя выполнить</p>
        <ul className="flex flex-col gap-2 text-sm">
          {result.violations.map((violation) => (
            <li key={violation}>{humanizeViolation(violation)}</li>
          ))}
        </ul>
      </div>
    );
  }

  const co2 = result.avoided_co2e_kg;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="metric-card metric-card-now">
          <p className="text-xs font-medium">Сейчас</p>
          <p className="text-lg font-semibold">{formatNumber(result.base_cost_kzt)} ₸</p>
          <p className="text-xs">{formatNumber(result.base_kwh)} кВт·ч</p>
        </div>
        <div className="metric-card metric-card-after">
          <p className="text-xs font-medium">После изменений</p>
          <p className="text-lg font-semibold">
            {result.scenario_cost_kzt.value !== null
              ? `${formatNumber(result.scenario_cost_kzt.value)} ₸`
              : "недоступно"}
          </p>
          <p className="text-xs">
            {result.scenario_kwh.value !== null ? `${formatNumber(result.scenario_kwh.value)} кВт·ч` : ""}
          </p>
        </div>
        <div className="metric-card metric-card-savings">
          <p className="text-xs font-medium">Ожидаемая экономия</p>
          <p className="text-lg font-semibold">{savingsLabel(result.delta_cost_kzt.value)}</p>
          <p className="text-xs">{savingsKwhLabel(result.delta_kwh.value)}</p>
        </div>
      </div>
      {co2.value !== null ? (
        <p className="text-sm leading-relaxed text-lime-100">
          CO₂e: на {formatNumber(co2.value, 1)} кг меньше
          {co2.source ? ` · источник: ${co2.source}` : ""} · {valueStatusHuman(co2.status)}
        </p>
      ) : co2.explanation ? (
        <p className="text-sm leading-relaxed text-lime-100">{co2.explanation}</p>
      ) : null}
      <div className="rounded-2xl border border-lime-200 p-4">
        <p className="text-sm font-semibold text-lime-100">Какие действия дали эффект</p>
        <p className="mt-2 text-sm leading-relaxed text-lime-50">{effectCopy}</p>
        <p className="mt-3 text-sm leading-relaxed text-lime-50">{why}</p>
      </div>
      <p className="text-xs leading-relaxed text-lime-50">
        Это симуляция, а не гарантия. Фактический результат зависит от выполнения действий и режима
        работы предприятия. Точность оценки: {accuracyLabel(result.confidence)}.
      </p>
    </div>
  );
}

function ActionCard({
  action,
  level,
  onChange,
}: {
  action: ActionCatalogItem;
  level: number;
  onChange: (choice: ActionLevelChoice) => void;
}) {
  const choice = levelFromNumber(level);
  return (
    <div className="rounded-2xl border border-lime-200 p-5">
      <p className="text-sm font-semibold text-lime-50">{actionTitle(action)}</p>
      <p className="mt-1 text-sm leading-relaxed text-lime-100">{actionSummary(action)}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <TrustBadge label={actionEffect(action)} tone="verified" />
        <TrustBadge label={actionCondition(action)} tone={action.capex_kzt > 0 ? "review" : "manual"} />
      </div>
      <div className="mt-4">
        <ChoiceGroup
          name={actionTitle(action)}
          value={choice}
          options={ACTION_LEVEL_OPTIONS}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

function UnavailableActionCard({
  action,
  preview,
  open,
  onToggle,
}: {
  action: ActionCatalogItem;
  preview: ConstraintPreview;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-2xl border border-amber-300 p-5">
      <p className="text-sm font-semibold text-lime-50">{actionTitle(action)}</p>
      <p className="mt-1 text-sm leading-relaxed text-lime-100">{actionSummary(action)}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <TrustBadge label={actionEffect(action)} tone="verified" />
        <TrustBadge label={actionCondition(action)} tone={action.capex_kzt > 0 ? "review" : "manual"} />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-amber-100">{preview.reason}</p>
      <button type="button" onClick={onToggle} className="btn-ghost mt-4">
        {open ? "Скрыть сравнение" : "Посмотреть при других условиях"}
      </button>
      {open ? (
        <div className="mt-4 rounded-2xl bg-[#ecfccb] p-4 text-[#14532d]">
          <p className="text-sm font-semibold">Что нужно изменить</p>
          <p className="mt-2 text-sm leading-relaxed">{preview.constraintNow}</p>
          <p className="mt-1 text-sm leading-relaxed">{preview.constraintNeeded}</p>
          <p className="mt-3 text-sm font-semibold">Возможный эффект</p>
          <p className="mt-1 text-sm leading-relaxed">{preview.possibleEffect}</p>
          <Link href="/profile" className="mt-3 inline-block text-sm font-semibold text-emerald-900 underline">
            Изменить условие в профиле
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function ScenarioSimulator() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const catalogQuery = useQuery({ queryKey: ["action-catalog"], queryFn: fetchActionCatalog });
  const recordsQuery = useQuery({ queryKey: ["consumption"], queryFn: fetchConsumption });
  const scenariosQuery = useQuery({ queryKey: ["scenarios"], queryFn: fetchScenarios });
  const profileQuery = useQuery({ queryKey: ["organization-profile"], queryFn: fetchOrganizationProfile });
  const configQuery = useQuery({ queryKey: ["organization-config"], queryFn: fetchOrganizationConfig });

  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [levels, setLevels] = useState<Record<string, number>>({});
  const [name, setName] = useState("Мой план экономии");
  const [baseRecordId, setBaseRecordId] = useState<number | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [emptyHint, setEmptyHint] = useState(false);
  const [previewActionId, setPreviewActionId] = useState<string | null>(null);

  const records = recordsQuery.data?.records ?? [];
  const scenarios = scenariosQuery.data?.scenarios ?? [];
  const constraints: Constraints = profileQuery.data?.constraints ?? {
    capex_budget_kzt: 0,
    min_production_share: 1,
    max_schedule_shift_hours: 0,
    flexible_load_share: 0,
  };
  const hasTou = isTouTariff(configQuery.data?.tariff);
  const constraintsReady = profileQuery.isSuccess && configQuery.isSuccess;
  const selectedRecord = records.find((record) => record.id === (baseRecordId ?? records[0]?.id));

  const catalogActions = catalogQuery.data?.actions ?? [];
  const availableActions = constraintsReady
    ? catalogActions.filter((action) => !actionUnavailableReason(action, constraints, hasTou))
    : catalogActions;
  const unavailableActions = constraintsReady
    ? catalogActions
        .map((action) => ({
          action,
          preview: actionConstraintPreview(action, constraints, hasTou),
        }))
        .filter((item): item is { action: ActionCatalogItem; preview: ConstraintPreview } =>
          Boolean(item.preview),
        )
    : [];

  const enabledLevels = Object.fromEntries(
    Object.entries(levels).filter(([actionId, level]) => {
      if (level <= 0) return false;
      const action = catalogActions.find((item) => item.id === actionId);
      if (!action) return false;
      return !actionUnavailableReason(action, constraints, hasTou);
    }),
  );

  const simulateMutation = useMutation({
    mutationFn: async () => {
      const actions: ActionLevel[] = Object.entries(enabledLevels).map(([action_id, level]) => ({
        action_id,
        level,
      }));
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
      setEmptyHint(false);
      void queryClient.invalidateQueries({ queryKey: ["scenarios"] });
      if (!simulation.feasible) {
        showToast("Этот план не проходит ваши ограничения — см. объяснение", "info");
      }
    },
    onError: (error) =>
      showToast(error instanceof Error ? error.message : "Не удалось рассчитать план", "error"),
  });

  const loadScenario = (scenario: Scenario) => {
    setActiveScenario(scenario);
    setName(scenario.name);
    setBaseRecordId(scenario.base_record_id);
    setLevels(levelsToMap(scenario.actions));
    setResult(scenario.result);
    setEmptyHint(false);
  };

  const resetScenario = () => {
    setActiveScenario(null);
    setName("Мой план экономии");
    setLevels({});
    setResult(null);
    setEmptyHint(false);
  };

  const handleCalculate = () => {
    if (selectedCount(enabledLevels) === 0) {
      setResult(null);
      setEmptyHint(true);
      return;
    }
    simulateMutation.mutate();
  };

  if (recordsQuery.isSuccess && records.length === 0) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center animate-fade-in">
        <h2 className="mb-2 text-xl font-semibold text-slate-900">Нет данных для плана экономии</h2>
        <p className="mb-6 text-sm text-slate-600">
          Сначала добавьте счёт или ручную запись — с ними Nexus сравнит выбранные действия.
        </p>
        <Link href="/bills" className="btn-primary">
          Добавить данные
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">План экономии</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
            Выберите понятные действия. Nexus посчитает ожидаемый эффект и проверит, что план не рискует выпуском.
          </p>
        </div>
        {activeScenario ? (
          <button type="button" onClick={resetScenario} className="btn-ghost">
            Сравнить варианты
          </button>
        ) : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_19rem]">
        <div className="card flex flex-col gap-6 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Название варианта
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Сравниваем с
              <select
                value={baseRecordId ?? records[0]?.id ?? ""}
                onChange={(event) => setBaseRecordId(Number(event.target.value))}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400"
              >
                {records.map((record) => (
                  <option key={record.id} value={record.id}>
                    {compareWithLabel(record)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-sm leading-relaxed text-slate-500">
            Это период, с которым Nexus сравнивает выбранные действия.
            {selectedRecord ? ` Сейчас выбран ${compareWithLabel(selectedRecord)}.` : ""}
          </p>

          <div className="flex flex-col gap-4">
            {catalogQuery.isLoading ? (
              <p className="text-sm text-lime-100">Загружаем доступные действия…</p>
            ) : (
              <>
                <div className="flex flex-col gap-4">
                  <h2 className="text-sm font-semibold text-lime-50">Подходит вашим условиям</h2>
                  {availableActions.length === 0 ? (
                    <p className="text-sm leading-relaxed text-lime-100">
                      Сейчас нет действий, которые проходят ваши ограничения. Ниже можно посмотреть, что
                      изменится, если смягчить условия.
                    </p>
                  ) : (
                    availableActions.map((action) => (
                      <ActionCard
                        key={action.id}
                        action={action}
                        level={levels[action.id] ?? 0}
                        onChange={(choice) =>
                          setLevels((prev) => ({
                            ...prev,
                            [action.id]: ACTION_LEVEL_VALUES[choice],
                          }))
                        }
                      />
                    ))
                  )}
                </div>
                {unavailableActions.length > 0 ? (
                  <details className="rounded-2xl border border-amber-300 p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-amber-100">
                      Потребуют изменения условий ({unavailableActions.length})
                    </summary>
                    <div className="mt-4 flex flex-col gap-4">
                      {unavailableActions.map(({ action, preview }) => (
                        <UnavailableActionCard
                          key={action.id}
                          action={action}
                          preview={preview}
                          open={previewActionId === action.id}
                          onToggle={() =>
                            setPreviewActionId((current) => (current === action.id ? null : action.id))
                          }
                        />
                      ))}
                    </div>
                  </details>
                ) : null}
              </>
            )}
          </div>

          <p className="text-sm leading-relaxed text-lime-50">
            Выберите действия, которые готовы попробовать. Nexus сравнит их с выбранным счётом и покажет
            возможное изменение расходов и потребления.
          </p>
          <button
            type="button"
            disabled={simulateMutation.isPending || !constraintsReady || catalogQuery.isLoading}
            onClick={handleCalculate}
            className="btn-primary self-start"
          >
            {simulateMutation.isPending ? "Считаем…" : "Рассчитать мой план"}
          </button>

          {emptyHint ? (
            <div className="rounded-2xl border border-lime-100/15 p-5">
              <p className="text-sm font-semibold text-slate-800">Сначала выберите действие</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Отметьте хотя бы один вариант — например, отключать оборудование после смены. Это не требует
                вложений и не влияет на выпуск. Пустой план не считается полезным результатом.
              </p>
            </div>
          ) : null}

          {result ? (
            <div className="flex flex-col gap-4">
              <ResultPanel
                result={result}
                why={whyPlanFits({
                  actions: catalogActions,
                  levels: enabledLevels,
                  constraints,
                })}
                effectCopy={selectedActionsEffectCopy({
                  actions: catalogActions,
                  levels: enabledLevels,
                })}
              />
              {result.feasible ? (
                <EvidenceDrawer
                  assumptions={[]}
                  snapshot={result.snapshot}
                  missingData={[]}
                  summary="Ожидаемая экономия посчитана детерминированно по выбранным действиям и ограничениям предприятия. Это симуляция, не гарантия."
                  usedData={
                    selectedRecord
                      ? [`Сравнение с периодом: ${compareWithLabel(selectedRecord)}.`]
                      : []
                  }
                  assumptionLines={[
                    "Коэффициенты экономии берутся из каталога действий и являются оценками.",
                    "План проходит только если не нарушает ваши настройки рекомендаций.",
                  ]}
                  reliability={`Точность оценки: ${accuracyLabel(result.confidence)}. Интервал ${result.confidence.label} доступен здесь для проверки.`}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        <aside className="card h-fit p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Сохранённые варианты</h2>
          {scenariosQuery.isLoading ? (
            <p className="text-sm text-slate-500">Загружаем…</p>
          ) : scenarios.length === 0 ? (
            <p className="text-sm leading-relaxed text-slate-500">
              Пока нет сохранённых вариантов. Первый расчёт сохранит план автоматически.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {scenarios.map((scenario) => {
                const count = scenario.actions.filter((item) => item.level > 0).length;
                const delta = scenario.result?.delta_cost_kzt.value;
                let subtitle = "Действия не выбраны";
                if (count > 0 && scenario.result?.feasible && delta && delta > 0) {
                  subtitle = `${count} ${count === 1 ? "действие" : "действия"} · до ${formatNumber(delta)} ₸`;
                } else if (count > 0 && scenario.result && !scenario.result.feasible) {
                  subtitle = "Сейчас недоступен";
                } else if (count > 0) {
                  subtitle = `${count} ${count === 1 ? "действие" : "действия"}`;
                }
                return (
                  <li key={scenario.id}>
                    <button
                      type="button"
                      onClick={() => loadScenario(scenario)}
                      className={`w-full rounded-2xl border px-3 py-2.5 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200 ${
                        activeScenario?.id === scenario.id
                          ? "border-lime-200 bg-lime-100/15 text-emerald-50"
                          : "border-lime-100/15 text-slate-700 hover:border-lime-200/40"
                      }`}
                    >
                      <span className="block font-medium">{scenario.name}</span>
                      <span className="block text-xs text-slate-400">{subtitle}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
