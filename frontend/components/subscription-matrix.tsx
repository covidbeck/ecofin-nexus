"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { CheckoutModal, type CheckoutTier } from "@/components/checkout-modal";
import { ApiError, subscribe } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";
import type { BillingCycle, TierId } from "@/lib/types";

type Tier = {
  id: TierId;
  name: string;
  audience: string;
  price: Record<BillingCycle, string>;
  priceNote: Record<BillingCycle, string>;
  features: string[];
  note?: string;
  cta: string;
  highlighted?: boolean;
};

// Prices are the published tariff (SPECIFICATION.md §5). Displayed verbatim —
// no client-side price arithmetic.
const TIERS: Tier[] = [
  {
    id: "free",
    name: "Freemium",
    audience: "Для знакомства с сервисом",
    price: { month: "0 ₸", year: "0 ₸" },
    priceNote: { month: "навсегда", year: "навсегда" },
    features: [
      "1 анализ в месяц",
      "Показывает общий потенциал потерь",
      "Без детального AI Roadmap",
      "Без ESG-пакета",
    ],
    cta: "Начать бесплатно",
  },
  {
    id: "pro_7500",
    name: "Nexus Pro",
    audience: "Для кафе, пекарен и небольших производств",
    price: { month: "7 500 ₸", year: "72 000 ₸" },
    priceNote: { month: "в месяц", year: "в год (≈6 000 ₸/мес)" },
    features: [
      "До 15 квитанций в месяц",
      "Тарифный арбитраж и почасовой профиль",
      "План переноса пиковой нагрузки",
      "Scope 2 в интерфейсе",
    ],
    cta: "Выбрать тариф",
    highlighted: true,
  },
  {
    id: "enterprise_50000",
    name: "ESG Bridge",
    audience: "Для среднего бизнеса и промышленных цехов",
    price: { month: "50 000 ₸", year: "480 000 ₸" },
    priceNote: { month: "в месяц", year: "в год (≈40 000 ₸/мес)" },
    features: [
      "Безлимитный анализ",
      "Scope 2 отчёт по GHG Protocol",
      "Индекс эффективности I_gap",
      "Экспортируемое ESG-резюме и пакет для «Даму»",
    ],
    note: "GHG Protocol Scope 2 — учёт косвенных выбросов от покупаемой электроэнергии. I_gap — детерминированный индекс потенциального снижения энергопотребления. Не гарантирует субсидию или кредит.",
    cta: "Выбрать тариф",
  },
];

export function SubscriptionMatrix() {
  const [cycle, setCycle] = useState<BillingCycle>("month");
  const [pendingTier, setPendingTier] = useState<TierId | null>(null);
  const [checkout, setCheckout] = useState<CheckoutTier | null>(null);
  const { showToast } = useToast();
  const { subscription } = useAuth();

  const mutation = useMutation({
    mutationKey: ["subscribe"],
    mutationFn: subscribe,
    onSuccess: (data, variables) => {
      const tier = TIERS.find((item) => item.id === variables.tier_id);
      setPendingTier(null);
      setCheckout({
        id: variables.tier_id,
        label: data?.tier ?? tier?.name ?? "Nexus",
        price: tier?.price[cycle] ?? "—",
      });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : "Не удалось оформить подписку.";
      showToast(message, "error");
      setPendingTier(null);
    },
  });

  const handleSelect = (tierId: TierId) => {
    setPendingTier(tierId);
    mutation.mutate({ tier_id: tierId, billing_cycle: cycle });
  };

  return (
    <div>
      <div className="flex justify-center">
        <div
          role="group"
          aria-label="Период оплаты"
          className="inline-flex rounded-full border border-gray-200 bg-white p-1 text-sm shadow-sm"
        >
          {(
            [
              { value: "month", label: "Месяц" },
              { value: "year", label: "Год (−20%)" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={cycle === option.value}
              onClick={() => setCycle(option.value)}
              className={`rounded-full px-6 py-2 font-medium transition ${
                cycle === option.value
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3 lg:items-start">
        {TIERS.map((tier) => {
          const isCurrent = subscription?.tierId === tier.id;
          const isPending = mutation.isPending && pendingTier === tier.id;
          return (
            <article
              key={tier.id}
              className={`relative flex flex-col rounded-2xl bg-white p-8 transition ${
                tier.highlighted
                  ? "border-2 border-emerald-500 shadow-xl shadow-emerald-600/10 lg:-translate-y-2"
                  : "border border-gray-200 shadow-sm"
              }`}
            >
              {tier.highlighted ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-4 py-1 text-[11px] font-semibold tracking-wide text-white uppercase">
                  Популярный выбор
                </span>
              ) : null}

              <h2 className="text-lg font-semibold text-slate-900">{tier.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{tier.audience}</p>

              <div className="mt-5">
                <span className="text-4xl font-semibold text-slate-900">{tier.price[cycle]}</span>
                <span className="ml-2 text-sm text-slate-500">{tier.priceNote[cycle]}</span>
              </div>

              <ul className="mt-6 flex-1 space-y-3 text-sm leading-6 text-slate-700">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5">
                    <span className="mt-0.5 text-emerald-600">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {tier.note ? (
                <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-500">
                  {tier.note}
                </p>
              ) : null}

              <button
                type="button"
                disabled={mutation.isPending || isCurrent}
                onClick={() => handleSelect(tier.id)}
                className={`mt-6 rounded-lg px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed ${
                  tier.highlighted
                    ? "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                    : "border border-gray-300 text-slate-800 hover:border-gray-400 hover:bg-slate-50 disabled:opacity-60"
                }`}
              >
                {isCurrent ? "Текущий тариф" : isPending ? "Оформляем…" : tier.cta}
              </button>
            </article>
          );
        })}
      </div>

      {checkout ? (
        <CheckoutModal tier={checkout} cycle={cycle} onClose={() => setCheckout(null)} />
      ) : null}
    </div>
  );
}
