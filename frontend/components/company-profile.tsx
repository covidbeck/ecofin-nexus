"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import {
  fetchOrganizationConfig,
  fetchOrganizationProfile,
  fetchSubscription,
  putEmissionFactor,
  putTariff,
  updateOrganizationProfile,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";
import type { BusinessProfile, DriverType } from "@/lib/types";

export const BUSINESS_PROFILES: { value: BusinessProfile; label: string }[] = [
  { value: "office", label: "Офис" },
  { value: "shop", label: "Магазин" },
  { value: "cafe", label: "Кафе / ресторан" },
  { value: "bakery", label: "Пекарня" },
  { value: "production", label: "Производство" },
  { value: "warehouse", label: "Склад" },
  { value: "hotel", label: "Гостиница" },
  { value: "clinic", label: "Клиника" },
];

export const DRIVER_TYPES: { value: DriverType; label: string }[] = [
  { value: "floor_area_m2", label: "Площадь, м²" },
  { value: "output_units", label: "Объём выпуска, ед." },
  { value: "guests", label: "Гости / посетители" },
  { value: "beds", label: "Койко-места" },
  { value: "employees", label: "Сотрудники" },
];

export function CompanyProfile() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["organization-profile"],
    queryFn: fetchOrganizationProfile,
  });
  const configQuery = useQuery({
    queryKey: ["organization-config"],
    queryFn: fetchOrganizationConfig,
  });
  const subscriptionQuery = useQuery({ queryKey: ["subscription"], queryFn: fetchSubscription });

  const [constraints, setConstraints] = useState({
    capex_budget_kzt: "0",
    max_schedule_shift_hours: "0",
    flexible_load_share: "0.2",
    min_production_share: "1",
  });
  const [tariffRate, setTariffRate] = useState("");
  const [tariffSource, setTariffSource] = useState("");
  const [efValue, setEfValue] = useState("");
  const [efSource, setEfSource] = useState("");

  useEffect(() => {
    const profile = profileQuery.data;
    if (profile) {
      setConstraints({
        capex_budget_kzt: String(profile.constraints.capex_budget_kzt),
        max_schedule_shift_hours: String(profile.constraints.max_schedule_shift_hours),
        flexible_load_share: String(profile.constraints.flexible_load_share),
        min_production_share: String(profile.constraints.min_production_share),
      });
    }
  }, [profileQuery.data]);

  const constraintsMutation = useMutation({
    mutationFn: () =>
      updateOrganizationProfile({
        constraints: {
          capex_budget_kzt: Number(constraints.capex_budget_kzt) || 0,
          max_schedule_shift_hours: Number(constraints.max_schedule_shift_hours) || 0,
          flexible_load_share: Number(constraints.flexible_load_share) || 0,
          min_production_share: Number(constraints.min_production_share) || 1,
        },
      }),
    onSuccess: () => {
      showToast("Ограничения обновлены", "success");
      void queryClient.invalidateQueries({ queryKey: ["organization-profile"] });
      void queryClient.invalidateQueries({ queryKey: ["optimize"] });
    },
    onError: (error) =>
      showToast(error instanceof Error ? error.message : "Ошибка сохранения", "error"),
  });

  const tariffMutation = useMutation({
    mutationFn: () =>
      putTariff({
        name: "Пользовательский тариф",
        currency: "KZT",
        structure: { type: "flat", rate_kzt_per_kwh: Number(tariffRate) },
        source: tariffSource.trim(),
        status: "approved",
        version: (configQuery.data?.tariff?.version ?? 0) + 1,
      }),
    onSuccess: () => {
      showToast("Тариф сохранён и утверждён", "success");
      setTariffRate("");
      setTariffSource("");
      void queryClient.invalidateQueries();
    },
    onError: (error) =>
      showToast(error instanceof Error ? error.message : "Ошибка сохранения тарифа", "error"),
  });

  const efMutation = useMutation({
    mutationFn: () =>
      putEmissionFactor({
        value_kg_per_kwh: Number(efValue),
        unit: "kg CO2e/kWh",
        source: efSource.trim(),
        status: "approved",
        version: (configQuery.data?.emission_factor?.version ?? 0) + 1,
      }),
    onSuccess: () => {
      showToast("Emission factor сохранён", "success");
      setEfValue("");
      setEfSource("");
      void queryClient.invalidateQueries();
    },
    onError: (error) =>
      showToast(error instanceof Error ? error.message : "Ошибка сохранения фактора", "error"),
  });

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const profile = profileQuery.data;
  const config = configQuery.data;
  const subscription = subscriptionQuery.data;

  if (profileQuery.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {profile?.name ?? user?.organization.name}
          </h1>
          <p className="text-sm text-slate-500">
            {BUSINESS_PROFILES.find((item) => item.value === profile?.business_profile)?.label ??
              "Тип предприятия не указан"}
            {profile?.region ? ` · ${profile.region}` : ""} · {profile?.currency ?? "KZT"} ·{" "}
            {profile?.timezone ?? "Asia/Almaty"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
        >
          Выйти из аккаунта
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-1 text-sm font-semibold text-slate-700">Аккаунт и подписка</h2>
          <dl className="mt-3 flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Пользователь</dt>
              <dd className="text-right font-medium text-slate-800">
                {user?.name} ({user?.email})
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Роль</dt>
              <dd className="font-medium text-slate-800">{user?.role}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">План</dt>
              <dd className="font-medium text-slate-800">
                {subscription?.entitlements.name ?? "…"} ({subscription?.status ?? ""})
              </dd>
            </div>
            {profile?.driver ? (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Драйвер нормализации</dt>
                <dd className="font-medium text-slate-800">
                  {DRIVER_TYPES.find((item) => item.value === profile.driver?.type)?.label}:{" "}
                  {profile.driver.value}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="card p-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            Ограничения для сценариев
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              CapEx бюджет, ₸
              <input
                type="number"
                min="0"
                value={constraints.capex_budget_kzt}
                onChange={(e) =>
                  setConstraints({ ...constraints, capex_budget_kzt: e.target.value })
                }
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Макс. сдвиг графика, ч
              <input
                type="number"
                min="0"
                value={constraints.max_schedule_shift_hours}
                onChange={(e) =>
                  setConstraints({ ...constraints, max_schedule_shift_hours: e.target.value })
                }
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Гибкая нагрузка (0–1)
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={constraints.flexible_load_share}
                onChange={(e) =>
                  setConstraints({ ...constraints, flexible_load_share: e.target.value })
                }
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Мин. доля производства (0–1)
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={constraints.min_production_share}
                onChange={(e) =>
                  setConstraints({ ...constraints, min_production_share: e.target.value })
                }
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={constraintsMutation.isPending}
            onClick={() => constraintsMutation.mutate()}
            className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:opacity-50"
          >
            {constraintsMutation.isPending ? "Сохраняем…" : "Сохранить ограничения"}
          </button>
        </div>

        <div className="card p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Тариф на электроэнергию</h2>
            {config?.tariff ? <StatusBadge status="confirmed" /> : <StatusBadge status="unavailable" />}
          </div>
          {config?.tariff ? (
            <p className="mb-3 text-sm text-slate-600">
              {config.tariff.name} · {config.tariff.structure.rate_kzt_per_kwh} ₸/кВт·ч · v
              {config.tariff.version} · источник: {config.tariff.source}
            </p>
          ) : (
            <p className="mb-3 text-sm text-slate-500">
              Тариф не задан. Без утверждённого тарифа сценарные стоимости считаются по
              эффективной ставке из ваших счетов, а помеченные тарифом расчёты остаются
              «недоступно».
            </p>
          )}
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!Number(tariffRate) || !tariffSource.trim()) {
                showToast("Нужны ставка и источник (документ/договор)", "error");
                return;
              }
              tariffMutation.mutate();
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                step="any"
                min="0"
                placeholder="Ставка, ₸/кВт·ч"
                value={tariffRate}
                onChange={(e) => setTariffRate(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              />
              <input
                placeholder="Источник (договор, счёт)"
                value={tariffSource}
                onChange={(e) => setTariffSource(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              />
            </div>
            <button
              type="submit"
              disabled={tariffMutation.isPending}
              className="self-start rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
            >
              Утвердить тариф
            </button>
          </form>
        </div>

        <div className="card p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">CO₂ emission factor</h2>
            {config?.emission_factor ? (
              <StatusBadge status="confirmed" />
            ) : (
              <StatusBadge status="unavailable" />
            )}
          </div>
          {config?.emission_factor ? (
            <p className="mb-3 text-sm text-slate-600">
              {config.emission_factor.value_kg_per_kwh} кг CO₂e/кВт·ч · v
              {config.emission_factor.version} · источник: {config.emission_factor.source}
            </p>
          ) : (
            <p className="mb-3 text-sm text-slate-500">
              Фактор не задан — CO₂e показывается как «недоступно». Nexus не использует
              выдуманные факторы: укажите значение с указанием источника.
            </p>
          )}
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!Number(efValue) || !efSource.trim()) {
                showToast("Нужны значение фактора и источник", "error");
                return;
              }
              efMutation.mutate();
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                step="any"
                min="0"
                placeholder="кг CO₂e / кВт·ч"
                value={efValue}
                onChange={(e) => setEfValue(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              />
              <input
                placeholder="Источник (оператор сети, отчёт)"
                value={efSource}
                onChange={(e) => setEfSource(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              />
            </div>
            <button
              type="submit"
              disabled={efMutation.isPending}
              className="self-start rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
            >
              Утвердить фактор
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
