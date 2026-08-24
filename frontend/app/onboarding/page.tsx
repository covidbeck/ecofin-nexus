"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { BUSINESS_PROFILES, DRIVER_TYPES } from "@/components/company-profile";
import { ProtectedRoute } from "@/components/protected-route";
import { updateOrganizationProfile } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";
import type { BusinessProfile, DriverType } from "@/lib/types";

const DRIVER_BY_PROFILE: Record<BusinessProfile, DriverType> = {
  office: "employees",
  shop: "floor_area_m2",
  cafe: "guests",
  bakery: "output_units",
  production: "output_units",
  warehouse: "floor_area_m2",
  hotel: "beds",
  clinic: "beds",
};

function OnboardingForm() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { showToast } = useToast();

  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>("office");
  const [region, setRegion] = useState("");
  const [driverType, setDriverType] = useState<DriverType>("employees");
  const [driverValue, setDriverValue] = useState("");
  const [capex, setCapex] = useState("0");
  const [shiftHours, setShiftHours] = useState("0");

  const mutation = useMutation({
    mutationFn: () =>
      updateOrganizationProfile({
        business_profile: businessProfile,
        region: region.trim() || undefined,
        driver: driverValue
          ? { type: driverType, value: Number(driverValue) }
          : undefined,
        constraints: {
          capex_budget_kzt: Number(capex) || 0,
          max_schedule_shift_hours: Number(shiftHours) || 0,
          flexible_load_share: 0.2,
          min_production_share: 1,
        },
      }),
    onSuccess: async () => {
      await refreshUser();
      showToast("Профиль предприятия сохранён", "success");
      router.push("/bills");
    },
    onError: (error) =>
      showToast(error instanceof Error ? error.message : "Не удалось сохранить", "error"),
  });

  const selectProfile = (value: BusinessProfile) => {
    setBusinessProfile(value);
    setDriverType(DRIVER_BY_PROFILE[value]);
  };

  const driverLabel = DRIVER_TYPES.find((item) => item.value === driverType)?.label ?? "";

  return (
    <main className="mx-auto max-w-2xl px-6 py-12 animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        Расскажите о предприятии
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Эти данные нужны для нормализации потребления и проверки выполнимости сценариев.
        Всё можно изменить позже в профиле.
      </p>

      <form
        className="card mt-8 flex flex-col gap-6 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Тип предприятия</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {BUSINESS_PROFILES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => selectProfile(item.value)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                  businessProfile === item.value
                    ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                    : "border-gray-200 text-slate-600 hover:border-emerald-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Регион (город)
          <input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="Астана"
            className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Драйвер нормализации
            <select
              value={driverType}
              onChange={(e) => setDriverType(e.target.value as DriverType)}
              className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
            >
              {DRIVER_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            {driverLabel} за период
            <input
              type="number"
              min="0"
              step="any"
              value={driverValue}
              onChange={(e) => setDriverValue(e.target.value)}
              placeholder="Например, 120"
              className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Бюджет на улучшения (CapEx), ₸
            <input
              type="number"
              min="0"
              value={capex}
              onChange={(e) => setCapex(e.target.value)}
              className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Допустимый сдвиг графика, часов
            <input
              type="number"
              min="0"
              max="12"
              value={shiftHours}
              onChange={(e) => setShiftHours(e.target.value)}
              className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
        >
          {mutation.isPending ? "Сохраняем…" : "Сохранить и перейти к данным"}
        </button>
      </form>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <ProtectedRoute>
      <OnboardingForm />
    </ProtectedRoute>
  );
}
