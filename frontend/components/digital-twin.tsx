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
import { StatusBadge, ValueCard, formatNumber } from "@/components/status-badge";
import {
  ApiError,
  fetchConsumption,
  fetchDashboard,
  optimizeScenarios,
  seedDemoData,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";

function Spinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
    </div>
  );
}

export function DigitalTwin() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [recordId, setRecordId] = useState<number | undefined>(undefined);

  const recordsQuery = useQuery({ queryKey: ["consumption"], queryFn: fetchConsumption });
  const records = useMemo(() => recordsQuery.data?.records ?? [], [recordsQuery.data]);
  const hasRecords = records.length > 0;

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", recordId ?? "latest"],
    queryFn: () => fetchDashboard(recordId),
    enabled: hasRecords,
    retry: false,
  });

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
        <h2 className="mb-2 text-xl font-semibold text-slate-900">
          Пока нет подтверждённых периодов
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-slate-600">
          Цифровой двойник строится из ваших данных. Загрузите счёт или введите значения
          вручную — либо посмотрите на явно помеченных демонстрационных данных.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/bills"
            className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-800"
          >
            Добавить счёт
          </Link>
          <button
            type="button"
            disabled={seedMutation.isPending}
            onClick={() => seedMutation.mutate()}
            className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-emerald-300 disabled:opacity-50"
          >
            {seedMutation.isPending ? "Загружаем…" : "Демо-данные (fixture)"}
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
            : "Не удалось построить цифровой двойник."}
        </p>
      </div>
    );
  }

  const twin = dashboardQuery.data;
  const optimization = optimizationQuery.data;
  const optimizerBlocked =
    optimizationQuery.error instanceof ApiError && optimizationQuery.error.status === 403;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {user?.organization.name}: цифровой двойник
          </h1>
          <p className="text-sm text-slate-500">
            Период {twin.record.period_start} — {twin.record.period_end} · качество данных:{" "}
            {twin.data_quality} · доверительный интервал {twin.confidence.label}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={recordId ?? twin.record.id}
            onChange={(event) => setRecordId(Number(event.target.value))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400"
          >
            {records.map((record) => (
              <option key={record.id} value={record.id}>
                {record.period_start} — {record.period_end}
                {record.source === "demo" ? " (demo)" : ""}
              </option>
            ))}
          </select>
          <EvidenceDrawer
            assumptions={twin.assumptions}
            snapshot={twin.snapshot}
            missingData={twin.missing_data}
          />
        </div>
      </div>

      {twin.key_anomaly ? (
        <div
          className={`card border-l-4 p-5 ${
            twin.key_anomaly.severity === "critical" ? "border-l-red-500" : "border-l-amber-500"
          }`}
        >
          <p className="mb-1 text-sm font-semibold text-slate-900">
            Требует внимания: аномалия ({twin.key_anomaly.kind === "period_over_period" ? "к прошлому периоду" : "к исторической базе"})
          </p>
          <p className="text-sm text-slate-700">{twin.key_anomaly.message}</p>
          <p className="mt-2 text-xs text-slate-400">
            Доказательство: {String(twin.key_anomaly.evidence["formula"] ?? "")} · текущий период{" "}
            {formatNumber(twin.key_anomaly.current_kwh)} кВт·ч против базы{" "}
            {formatNumber(twin.key_anomaly.reference_kwh)} кВт·ч
          </p>
        </div>
      ) : (
        <div className="card border-l-4 border-l-emerald-500 p-5">
          <p className="text-sm text-slate-700">
            Аномалий не обнаружено{twin.baseline_kwh.value === null ? " (или недостаточно истории для сравнения)" : ""}.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ValueCard title="Стоимость периода" data={twin.cost_kzt} accent />
        <ValueCard title="Потребление" data={twin.kwh} />
        <ValueCard title="Эффективная ставка" data={twin.effective_rate} digits={2} />
        <ValueCard title="CO₂e периода" data={twin.co2e_kg} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ValueCard title="Интенсивность" data={twin.intensity} digits={2} />
        <ValueCard title="Историческая база (медиана)" data={twin.baseline_kwh} />
        <ValueCard title="Отклонение от базы" data={twin.baseline_deviation} digits={3} />
      </div>

      {twin.trend.length > 1 ? (
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Динамика потребления, кВт·ч</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={twin.trend} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
                <XAxis dataKey="period" tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} width={70} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    fontSize: 13,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="kwh"
                  stroke="#047857"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="кВт·ч"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      <div className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-700">
            Лучший выполнимый сценарий (current vs scenario)
          </h2>
          <StatusBadge status="simulated" />
        </div>

        {optimizationQuery.isLoading ? (
          <p className="text-sm text-slate-500">Перебираем допустимые комбинации действий…</p>
        ) : optimizerBlocked ? (
          <p className="text-sm text-slate-600">
            Оптимизатор доступен на планах Pro и Business.{" "}
            <Link href="/subscription" className="font-medium text-emerald-700 hover:underline">
              Обновить план
            </Link>
          </p>
        ) : optimization?.best && optimization.best_simulation ? (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Сейчас</p>
                <p className="text-lg font-semibold text-slate-900">
                  {formatNumber(optimization.best_simulation.base_cost_kzt)} ₸
                </p>
                <p className="text-xs text-slate-500">
                  {formatNumber(optimization.best_simulation.base_kwh)} кВт·ч
                </p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-4">
                <p className="text-xs text-emerald-700">Сценарий</p>
                <p className="text-lg font-semibold text-emerald-800">
                  {formatNumber(optimization.best_simulation.scenario_cost_kzt.value ?? 0)} ₸
                </p>
                <p className="text-xs text-emerald-700">
                  {formatNumber(optimization.best_simulation.scenario_kwh.value ?? 0)} кВт·ч
                </p>
              </div>
              <div className="rounded-lg bg-slate-900 p-4">
                <p className="text-xs text-slate-300">Потенциал за период</p>
                <p className="text-lg font-semibold text-white">
                  −{formatNumber(optimization.best_simulation.delta_cost_kzt.value ?? 0)} ₸
                </p>
                <p className="text-xs text-slate-300">
                  {optimization.best_simulation.confidence.label} · симуляция, не гарантия
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                План действий
              </p>
              <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-slate-700">
                {optimization.action_plan.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
            <p className="text-xs text-slate-400">{optimization.note}</p>
            <Link
              href="/scenarios"
              className="self-start text-sm font-medium text-emerald-700 hover:underline"
            >
              Настроить сценарий вручную →
            </Link>
          </div>
        ) : optimization ? (
          <p className="text-sm text-slate-600">
            Ни один допустимый вариант не даёт положительного эффекта при текущих
            ограничениях и данных ({optimization.evaluated_count} комбинаций проверено).
            Смягчите ограничения в профиле или добавьте утверждённый тариф.
          </p>
        ) : (
          <p className="text-sm text-slate-600">
            {optimizationQuery.error instanceof Error
              ? optimizationQuery.error.message
              : "Оптимизация недоступна."}
          </p>
        )}
      </div>
    </div>
  );
}
