"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ChoiceGroup } from "@/components/choice-group";
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
import type { BusinessProfile, Constraints, DriverType } from "@/lib/types";
import {
  businessContextCopy,
  constraintsFromChoices,
  flexChoiceFromShare,
  isDemoCabinet,
  planLabel,
  productionChoiceFromShare,
  regionLabel,
  roleLabel,
  spendChoiceFromCapex,
  shiftChoiceFromHours,
  tariffHumanSummary,
  type FlexChoice,
  type ProductionChoice,
  type ShiftChoice,
  type SpendChoice,
} from "@/lib/ux-copy";

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

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  const [spend, setSpend] = useState<SpendChoice>("none");
  const [capexAmount, setCapexAmount] = useState("");
  const [shift, setShift] = useState<ShiftChoice>("none");
  const [production, setProduction] = useState<ProductionChoice>("keep_full");
  const [flex, setFlex] = useState<FlexChoice>("none");
  const [tariffRate, setTariffRate] = useState("");
  const [tariffSource, setTariffSource] = useState("");
  const [efValue, setEfValue] = useState("");
  const [efSource, setEfSource] = useState("");

  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile) return;
    setSpend(spendChoiceFromCapex(profile.constraints.capex_budget_kzt));
    setCapexAmount(
      profile.constraints.capex_budget_kzt > 0 ? String(profile.constraints.capex_budget_kzt) : "",
    );
    setShift(shiftChoiceFromHours(profile.constraints.max_schedule_shift_hours));
    setProduction(productionChoiceFromShare(profile.constraints.min_production_share));
    setFlex(flexChoiceFromShare(profile.constraints.flexible_load_share));
  }, [profileQuery.data]);

  const constraintsMutation = useMutation({
    mutationFn: (constraints: Constraints) => updateOrganizationProfile({ constraints }),
    onSuccess: () => {
      showToast("Настройки рекомендаций сохранены", "success");
      setSettingsOpen(false);
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
      showToast("Тариф сохранён", "success");
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
      showToast("Настройка экологического эффекта сохранена", "success");
      setEfValue("");
      setEfSource("");
      void queryClient.invalidateQueries();
    },
    onError: (error) =>
      showToast(error instanceof Error ? error.message : "Ошибка сохранения", "error"),
  });

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const saveSettings = () => {
    const profile = profileQuery.data;
    if (!profile) return;
    if (spend === "custom" && !(Number(capexAmount) > 0)) {
      showToast("Укажите сумму, которую готовы потратить", "error");
      return;
    }
    constraintsMutation.mutate(
      constraintsFromChoices(profile.constraints, {
        spend,
        capexAmount,
        shift,
        production,
        flex,
      }),
    );
  };

  const profile = profileQuery.data;
  const config = configQuery.data;
  const subscription = subscriptionQuery.data;
  const isDemo = isDemoCabinet(profile?.name ?? user?.organization.name);
  const businessLabel =
    BUSINESS_PROFILES.find((item) => item.value === profile?.business_profile)?.label ??
    "Предприятие";

  const contextText = useMemo(() => {
    if (!profile) return "";
    return businessContextCopy({
      businessLabel,
      constraints: profile.constraints,
      isDemo,
    });
  }, [businessLabel, isDemo, profile]);

  if (profileQuery.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-lime-100/20 border-t-lime-200" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <div className="profile-hero flex flex-wrap items-center justify-between gap-3 px-6 py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-emerald-50">
            {profile?.name ?? user?.organization.name}
          </h1>
          <p className="mt-1 text-sm text-emerald-100/80">
            {businessLabel}
            {profile?.region ? ` · ${regionLabel(profile.region)}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full border border-red-200/40 bg-red-500/15 px-4 py-2 text-sm font-medium text-red-100 transition hover:bg-red-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200"
        >
          Выйти из аккаунта
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Компания и доступ</h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Тип деятельности</dt>
              <dd className="font-medium text-slate-800">{businessLabel}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Регион</dt>
              <dd className="font-medium text-slate-800">{regionLabel(profile?.region)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Текущий план</dt>
              <dd className="font-medium text-slate-800">{planLabel(subscription?.entitlements.name)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Пользователь</dt>
              <dd className="text-right font-medium text-slate-800">
                {user?.name}
                <span className="mt-0.5 block text-xs font-normal text-slate-500">{user?.email}</span>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Роль</dt>
              <dd className="font-medium text-slate-800">{roleLabel(user?.role)}</dd>
            </div>
          </dl>
        </div>

        <div className="card flex flex-col gap-4 p-6">
          <h2 className="text-sm font-semibold text-slate-700">Как Nexus учитывает ваш бизнес</h2>
          <p className="text-sm leading-relaxed text-slate-600">{contextText}</p>
          <button type="button" onClick={() => setSettingsOpen(true)} className="btn-primary self-start">
            Настройки рекомендаций
          </button>
        </div>
      </div>

      <div className="card p-6">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setAssumptionsOpen((current) => !current)}
          aria-expanded={assumptionsOpen}
        >
          <span>
            <span className="block text-sm font-semibold text-slate-700">Данные и допущения</span>
            <span className="mt-1 block text-sm leading-relaxed text-slate-500">
              Nexus использует эти настройки только для расчётов. В демо они являются синтетическими примерами
              и не считаются реальными тарифами поставщика.
            </span>
          </span>
          <span aria-hidden="true" className="ml-4 text-slate-400">
            {assumptionsOpen ? "▾" : "▸"}
          </span>
        </button>

        {assumptionsOpen ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-lime-100/15 p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Тариф для расчётов</h3>
              <p className="mb-4 text-sm leading-relaxed text-slate-500">
                {tariffHumanSummary(config?.tariff ?? null, isDemo)}
              </p>
              <form
                className="flex flex-col gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!Number(tariffRate) || !tariffSource.trim()) {
                    showToast("Нужны ставка и источник (договор или счёт)", "error");
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
                    onChange={(event) => setTariffRate(event.target.value)}
                  />
                  <input
                    placeholder="Откуда цифра"
                    value={tariffSource}
                    onChange={(event) => setTariffSource(event.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={tariffMutation.isPending}
                  className="btn-ghost self-start disabled:opacity-50"
                >
                  {tariffMutation.isPending ? "Сохраняем…" : "Сохранить тариф"}
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-lime-100/15 p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Экологический эффект</h3>
              <p className="mb-4 text-sm leading-relaxed text-slate-500">
                {config?.emission_factor
                  ? isDemo
                    ? "Для демо используется синтетическая оценка выбросов, не коэффициент оператора сети."
                    : "Экологический эффект считается по подтверждённому коэффициенту организации."
                  : "Без этой настройки экологический эффект показывается как недоступный — Nexus не подставляет чужую цифру."}
              </p>
              <form
                className="flex flex-col gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!Number(efValue) || !efSource.trim()) {
                    showToast("Нужны значение и источник", "error");
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
                    onChange={(event) => setEfValue(event.target.value)}
                  />
                  <input
                    placeholder="Откуда цифра"
                    value={efSource}
                    onChange={(event) => setEfSource(event.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={efMutation.isPending}
                  className="btn-ghost self-start disabled:opacity-50"
                >
                  {efMutation.isPending ? "Сохраняем…" : "Сохранить настройку"}
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </div>

      {settingsOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 sm:items-center" onClick={() => setSettingsOpen(false)}>
          <div
            className="evidence-drawer max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl p-6 animate-fade-in"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-emerald-50">Настройки рекомендаций</h2>
                <p className="mt-1 text-sm leading-relaxed text-emerald-100/75">
                  Ответьте на простые вопросы. Nexus использует их как ограничения и не показывает технические
                  шкалы.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                aria-label="Закрыть"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-emerald-100 transition hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-6">
              <fieldset className="flex flex-col gap-3">
                <legend className="text-sm font-medium text-emerald-50">
                  Сколько вы готовы потратить на изменения?
                </legend>
                <ChoiceGroup
                  name="Бюджет изменений"
                  value={spend}
                  onChange={setSpend}
                  options={[
                    { value: "none", label: "Без дополнительных затрат" },
                    { value: "custom", label: "До указанной суммы" },
                  ]}
                />
                {spend === "custom" ? (
                  <input
                    type="number"
                    min="0"
                    value={capexAmount}
                    onChange={(event) => setCapexAmount(event.target.value)}
                    placeholder="Сумма, ₸"
                  />
                ) : null}
              </fieldset>

              <fieldset className="flex flex-col gap-3">
                <legend className="text-sm font-medium text-emerald-50">
                  Можно ли менять время работы части оборудования?
                </legend>
                <ChoiceGroup
                  name="Сдвиг графика"
                  value={shift}
                  onChange={setShift}
                  options={[
                    { value: "none", label: "Нет" },
                    { value: "one_hour", label: "До 1 часа" },
                    { value: "two_hours", label: "До 2 часов" },
                  ]}
                />
              </fieldset>

              <fieldset className="flex flex-col gap-3">
                <legend className="text-sm font-medium text-emerald-50">Можно ли временно снизить выпуск?</legend>
                <ChoiceGroup
                  name="Выпуск"
                  value={production}
                  onChange={setProduction}
                  options={[
                    { value: "keep_full", label: "Нет, выпуск сохраняем полностью" },
                    { value: "allow_small", label: "Можно снизить немного" },
                  ]}
                />
              </fieldset>

              <fieldset className="flex flex-col gap-3">
                <legend className="text-sm font-medium text-emerald-50">
                  Какую часть второстепенного оборудования можно переносить по времени?
                </legend>
                <ChoiceGroup
                  name="Гибкая нагрузка"
                  value={flex}
                  onChange={setFlex}
                  options={[
                    { value: "none", label: "Не переносить" },
                    { value: "small", label: "Небольшую часть" },
                    { value: "up_to_30", label: "До 30%" },
                  ]}
                />
              </fieldset>
            </div>

            <button
              type="button"
              disabled={constraintsMutation.isPending}
              onClick={saveSettings}
              className="btn-primary mt-6 disabled:opacity-50"
            >
              {constraintsMutation.isPending ? "Сохраняем…" : "Сохранить настройки"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
