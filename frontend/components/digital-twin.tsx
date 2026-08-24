"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EvidenceDrawer } from "@/components/evidence-drawer";
import { InfoTooltip } from "@/components/info-tooltip";
import { TrustBadge, ValueCard, formatNumber } from "@/components/status-badge";
import {
  ApiError,
  fetchActionCatalog,
  fetchConsumption,
  fetchDashboard,
  optimizeScenarios,
  seedDemoData,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";
import {
  accuracyLabel,
  actionTitle,
  anomalyHumanMessage,
  chartMonthLabel,
  deviationHumanLabel,
  evidenceAssumptionsHuman,
  evidenceReliability,
  evidenceUsedData,
  headlineFromDashboard,
  intensityMetric,
  isDemoCabinet,
  periodShortLabel,
  savingsKwhLabel,
  savingsLabel,
} from "@/lib/ux-copy";

function Spinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-lime-100/20 border-t-lime-200" />
    </div>
  );
}

export function DigitalTwin() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [recordId, setRecordId] = useState<number | undefined>(undefined);
  const [showHowCalculated, setShowHowCalculated] = useState(false);

  const recordsQuery = useQuery({ queryKey: ["consumption"], queryFn: fetchConsumption });
  const records = useMemo(() => recordsQuery.data?.records ?? [], [recordsQuery.data]);
  const hasRecords = records.length > 0;
  const demoCabinet = isDemoCabinet(user?.organization.name, records);

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", recordId ?? "latest"],
    queryFn: () => fetchDashboard(recordId),
    enabled: hasRecords,
    retry: false,
  });

  const catalogQuery = useQuery({ queryKey: ["action-catalog"], queryFn: fetchActionCatalog });
  const activeRecordId = dashboardQuery.data?.record.id;
  const optimizationQuery = useQuery({
    queryKey: ["optimize", activeRecordId],
    queryFn: () => optimizeScenarios(activeRecordId as number),
    enabled: Boolean(activeRecordId),
    retry: false,
  });

  const seedMutation = useMutation({
    mutationFn: seedDemoData,
    onSuccess: (data) => {
      showToast(`Демо-данные загружены (${data.note})`, "success");
      void queryClient.invalidateQueries();
    },
    onError: (error) =>
      showToast(error instanceof Error ? error.message : "Не удалось загрузить демо-данные", "error"),
  });

  if (recordsQuery.isLoading) return <Spinner />;

  if (!hasRecords) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center animate-fade-in">
        <h2 className="mb-2 text-xl font-semibold text-slate-900">Пока нет подтверждённых периодов</h2>
        <p className="mb-6 text-sm leading-relaxed text-slate-600">
          Добавьте счёт или введите значения вручную — либо откройте демонстрационный пример, чтобы увидеть,
          как Nexus отвечает на вопросы «что произошло, почему это важно и что можно сделать».
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/bills" className="btn-primary">
            Добавить счёт
          </Link>
          <button
            type="button"
            disabled={seedMutation.isPending}
            onClick={() => seedMutation.mutate()}
            className="btn-ghost disabled:opacity-50"
          >
            {seedMutation.isPending ? "Загружаем…" : "Посмотреть пример"}
          </button>
        </div>
      </div>
    );
  }

  if (dashboardQuery.isLoading) return <Spinner />;

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <p className="text-sm text-slate-600">
          {dashboardQuery.error instanceof Error
            ? dashboardQuery.error.message
            : "Не удалось собрать картину расходов за период."}
        </p>
      </div>
    );
  }

  const twin = dashboardQuery.data;
  const optimization = optimizationQuery.data;
  const optimizerBlocked =
    optimizationQuery.error instanceof ApiError && optimizationQuery.error.status === 403;
  const historyMonths = Math.max(twin.trend.length - 1, 0);
  const intensity = intensityMetric(twin.intensity);
  const isDemoPeriod = twin.record.source === "demo" || demoCabinet;
  const selectedActions = Object.entries(optimization?.best?.levels ?? {}).filter(
    ([, level]) => level > 0,
  );
  const catalogById = Object.fromEntries((catalogQuery.data?.actions ?? []).map((item) => [item.id, item]));
  const hasNoCostAction = selectedActions.some((entry) => (catalogById[entry[0]]?.capex_kzt ?? 0) <= 0);
  const primaryActionId = selectedActions.sort((a, b) => b[1] - a[1])[0]?.[0];
  const primaryAction = primaryActionId ? catalogById[primaryActionId] : undefined;
  const allZeroCapex = selectedActions.every((entry) => (catalogById[entry[0]]?.capex_kzt ?? 0) <= 0);
  const noProductionImpact = selectedActions.every(
    (entry) => (catalogById[entry[0]]?.production_impact_share ?? 0) <= 0,
  );
  const savingsKzt = optimization?.best_simulation?.delta_cost_kzt.value;
  const savingsKwh = optimization?.best_simulation?.delta_kwh.value;
  const co2Caption = isDemoPeriod ? "демо-оценка экологического эффекта" : "оценка экологического эффекта";

  const chartData = twin.trend.map((point) => ({
    ...point,
    month: chartMonthLabel(point.period),
  }));

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {isDemoPeriod ? (
              <span className="inline-flex items-center gap-1.5">
                <TrustBadge label="Демонстрационные данные" tone="demo" />
                <InfoTooltip
                  label="Что значит демонстрационные данные"
                  text="Это синтетический пример для показа возможностей Nexus."
                />
              </span>
            ) : null}
            <span className="text-sm text-slate-500">
              Точность оценки: {accuracyLabel(twin.confidence)}
            </span>
            <button
              type="button"
              onClick={() => setShowHowCalculated((current) => !current)}
              className="text-sm font-medium text-lime-200 underline-offset-4 transition hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200"
            >
              Как рассчитано
            </button>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.7rem]">
            {headlineFromDashboard(twin, { hasNoCostAction })}
          </h1>
          {showHowCalculated ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
              Сравниваем текущий период с обычным расходом за предыдущие месяцы. Интервал оценки{" "}
              {twin.confidence.label}. Формулы и источники — в «Доказательствах и допущениях».
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={recordId ?? twin.record.id}
            onChange={(event) => setRecordId(Number(event.target.value))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400"
          >
            {records.map((record) => (
              <option key={record.id} value={record.id}>
                {periodShortLabel(record)}
              </option>
            ))}
          </select>
          <EvidenceDrawer
            assumptions={twin.assumptions}
            snapshot={twin.snapshot}
            missingData={twin.missing_data}
            summary="Nexus показывает, что произошло с расходом, почему это требует внимания и какой эффект можно ожидать от выполнимых действий. Главный экран не содержит формул."
            usedData={evidenceUsedData(twin)}
            assumptionLines={evidenceAssumptionsHuman(twin.assumptions, isDemoPeriod)}
            reliability={evidenceReliability(twin)}
            extraMetrics={intensity ? [intensity] : []}
          />
        </div>
      </div>

      {twin.key_anomaly ? (
        <div
          className={`card border-l-4 p-6 ${
            twin.key_anomaly.severity === "critical" ? "border-l-red-400" : "border-l-amber-300"
          }`}
        >
          <p className="mb-1 text-sm font-semibold text-slate-900">Почему это требует внимания</p>
          <p className="text-base leading-relaxed text-slate-700">
            {anomalyHumanMessage(twin.key_anomaly, historyMonths)}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Сейчас {formatNumber(twin.key_anomaly.current_kwh)} кВт·ч при обычном уровне{" "}
            {formatNumber(twin.key_anomaly.reference_kwh)} кВт·ч.
          </p>
        </div>
      ) : (
        <div className="card border-l-4 border-l-lime-300 p-6">
          <p className="text-sm leading-relaxed text-slate-700">
            {twin.baseline_kwh.value === null
              ? "Пока недостаточно истории, чтобы сказать, выше расход обычного или нет."
              : "Существенных отклонений от обычного расхода не видно."}
          </p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <ValueCard title="Расход за период" data={twin.cost_kzt} accent />
        <ValueCard title="Потребление" data={twin.kwh} />
        <ValueCard title="Цена за киловатт-час" data={twin.effective_rate} digits={2} />
        <ValueCard
          title="Экологический эффект"
          data={twin.co2e_kg}
          caption={twin.co2e_kg.value !== null ? co2Caption : undefined}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <ValueCard title="Обычный расход" data={twin.baseline_kwh} />
        <div className="card flex flex-col gap-2 p-6">
          <p className="text-sm font-medium text-slate-500">Сравнение с обычным уровнем</p>
          {twin.baseline_deviation.value !== null && twin.baseline_deviation.value !== undefined ? (
            <p className="text-2xl font-semibold tracking-tight text-slate-900">
              {deviationHumanLabel(twin.baseline_deviation.value)}
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-slate-500">
              {twin.baseline_deviation.explanation ?? "Недостаточно истории для сравнения."}
            </p>
          )}
        </div>
      </div>

      {chartData.length > 1 ? (
        <div className="card p-6">
          <h2 className="mb-5 text-sm font-semibold text-slate-700">Потребление по месяцам, кВт·ч</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="rgba(167, 243, 208, 0.18)" strokeDasharray="4 4" />
                <XAxis dataKey="month" tick={{ fill: "#a7f3d0", fontSize: 12 }} />
                <YAxis tick={{ fill: "#a7f3d0", fontSize: 12 }} width={70} />
                <Tooltip
                  formatter={(value) => [`${formatNumber(Number(value))} кВт·ч`, "Потребление"]}
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid rgba(167, 243, 208, 0.25)",
                    background: "#06241c",
                    color: "#ecfdf5",
                    fontSize: 13,
                  }}
                />
                <Line type="monotone" dataKey="kwh" stroke="#bef264" strokeWidth={2.5} dot={{ r: 3 }} name="кВт·ч" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      <div className="card p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Рекомендуемое действие</h2>
            <p className="mt-1 text-xs text-slate-400">Симуляция, не гарантия</p>
          </div>
        </div>

        {optimizationQuery.isLoading ? (
          <p className="text-sm text-slate-500">Подбираем выполнимые действия без риска для выпуска…</p>
        ) : optimizerBlocked ? (
          <p className="text-sm text-slate-600">
            Подбор лучшего варианта доступен на планах Pro и Business.{" "}
            <Link href="/subscription" className="font-medium text-lime-200 hover:underline">
              Обновить план
            </Link>
          </p>
        ) : optimization?.best?.feasible && optimization.best_simulation ? (
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-base font-medium leading-relaxed text-slate-900">
                {primaryAction
                  ? actionTitle(primaryAction)
                  : optimization.action_plan[0] ?? "Есть выполнимый набор действий"}
              </p>
              {selectedActions.length > 1 ? (
                <p className="mt-1 text-sm text-slate-500">
                  и ещё {selectedActions.length - 1}{" "}
                  {selectedActions.length - 1 === 1 ? "действие" : "действия"} в том же плане
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {allZeroCapex ? <TrustBadge label="без вложений" tone="verified" /> : null}
                {noProductionImpact ? <TrustBadge label="не влияет на выпуск" tone="verified" /> : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="metric-card metric-card-now">
                <p className="text-xs font-medium">Сейчас</p>
                <p className="text-lg font-semibold">
                  {formatNumber(optimization.best_simulation.base_cost_kzt)} ₸
                </p>
                <p className="text-xs">{formatNumber(optimization.best_simulation.base_kwh)} кВт·ч</p>
              </div>
              <div className="metric-card metric-card-after">
                <p className="text-xs font-medium">После изменений</p>
                <p className="text-lg font-semibold">
                  {formatNumber(optimization.best_simulation.scenario_cost_kzt.value ?? 0)} ₸
                </p>
                <p className="text-xs">
                  {formatNumber(optimization.best_simulation.scenario_kwh.value ?? 0)} кВт·ч
                </p>
              </div>
              <div className="metric-card metric-card-savings">
                <p className="text-xs font-medium">Ожидаемая экономия</p>
                <p className="text-lg font-semibold">{savingsLabel(savingsKzt)}</p>
                <p className="text-xs">{savingsKwhLabel(savingsKwh)}</p>
              </div>
            </div>

            <Link href="/scenarios" className="btn-primary self-start">
              Посмотреть план
            </Link>
          </div>
        ) : optimization ? (
          <p className="text-sm leading-relaxed text-slate-600">
            При текущих ограничениях нет выполнимого варианта без риска для выпуска. Можно изменить условия
            в профиле и снова посмотреть план экономии.
          </p>
        ) : (
          <p className="text-sm text-slate-600">
            {optimizationQuery.error instanceof Error
              ? optimizationQuery.error.message
              : "Рекомендация пока недоступна."}
          </p>
        )}
      </div>
    </div>
  );
}
