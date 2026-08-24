"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { CheckoutModal } from "@/components/checkout-modal";
import { formatNumber } from "@/components/status-badge";
import { checkout, fetchPlans, fetchSubscription } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { BillingCycle, Plan, PlanId } from "@/lib/types";

export function SubscriptionMatrix() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [cycle, setCycle] = useState<BillingCycle>("month");
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null);

  const plansQuery = useQuery({ queryKey: ["plans"], queryFn: fetchPlans });
  const subscriptionQuery = useQuery({ queryKey: ["subscription"], queryFn: fetchSubscription });

  const checkoutMutation = useMutation({
    mutationFn: ({ plan, billingCycle }: { plan: PlanId; billingCycle: BillingCycle }) =>
      checkout(plan, billingCycle),
    onSuccess: (data) => {
      showToast(data.note, "success");
      setPendingPlan(null);
      void queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
    onError: (error) =>
      showToast(error instanceof Error ? error.message : "Не удалось сменить план", "error"),
  });

  const currentPlan = subscriptionQuery.data?.plan;
  const plans = plansQuery.data?.plans ?? [];

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Тарифные планы</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
          Права применяются на сервере. Оплата в MVP — демонстрационная: реальный платёжный
          провайдер не подключён, карта никуда не отправляется.
        </p>
        <div className="mt-5 inline-flex rounded-full border border-emerald-200/20 bg-emerald-950/20 p-1 text-sm">
          {(["month", "year"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCycle(option)}
              className={`rounded-full px-4 py-1.5 font-medium transition ${
                cycle === option ? "bg-lime-100 text-emerald-950" : "text-emerald-100 hover:text-white"
              }`}
            >
              {option === "month" ? "Месяц" : "Год (−20%)"}
            </button>
          ))}
        </div>
      </div>

      {plansQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const isPro = plan.id === "pro";
            const price = cycle === "month" ? plan.price_month_kzt : plan.price_year_kzt;
            return (
              <div
                key={plan.id}
                className={`card relative flex flex-col gap-4 p-6 ${
                  isPro ? "ring-1 ring-lime-200/40" : ""
                }`}
              >
                {isPro ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-lime-100 px-3 py-1 text-xs font-medium text-emerald-950">
                    Основной план
                  </span>
                ) : null}
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{plan.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
                </div>
                <p className="text-3xl font-semibold tracking-tight text-slate-900">
                  {price === 0 ? "0 ₸" : `${formatNumber(price)} ₸`}
                  <span className="ml-1 text-sm font-normal text-slate-500">
                    /{cycle === "month" ? "мес" : "год"}
                  </span>
                </p>
                <ul className="flex flex-1 flex-col gap-2 text-sm text-slate-700">
                  {plan.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-0.5 text-emerald-600">✓</span>
                      {highlight}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={isCurrent}
                  onClick={() => setPendingPlan(plan)}
                  className={`rounded-full px-4 py-2.5 text-sm font-medium transition ${
                    isCurrent
                      ? "cursor-default border border-lime-200/40 bg-lime-100/20 text-lime-100"
                      : isPro
                        ? "bg-lime-100 text-emerald-950 hover:bg-white"
                        : "border border-lime-100/25 text-emerald-50 hover:bg-white/10"
                  }`}
                >
                  {isCurrent ? "Текущий план" : "Выбрать план"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {pendingPlan ? (
        <CheckoutModal
          plan={pendingPlan}
          cycle={cycle}
          busy={checkoutMutation.isPending}
          onConfirm={() =>
            checkoutMutation.mutate({ plan: pendingPlan.id, billingCycle: cycle })
          }
          onClose={() => setPendingPlan(null)}
        />
      ) : null}
    </div>
  );
}
