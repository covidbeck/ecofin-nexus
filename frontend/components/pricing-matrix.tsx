"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { ApiError, subscribe } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { BillingCycle, TierId } from "@/lib/types";

type Tier = {
  id: TierId;
  name: string;
  tagline: string;
  price: Record<BillingCycle, string>;
  priceNote: Record<BillingCycle, string>;
  features: string[];
  cta: string;
  highlighted?: boolean;
};

// Fixed price list from the product spec. Displayed verbatim — no client-side
// price arithmetic; the annual figures are part of the published tariff.
const TIERS: Tier[] = [
  {
    id: "free",
    name: "Freemium",
    tagline: "Познакомиться с платформой",
    price: { month: "0 ₸", year: "0 ₸" },
    priceNote: { month: "навсегда", year: "навсегда" },
    features: [
      "1 энергоаудит в месяц",
      "Почасовой профиль нагрузки",
      "Базовый расчёт тарифного арбитража",
      "AI-ассистент по продукту",
    ],
    cta: "Начать бесплатно",
  },
  {
    id: "pro_7500",
    name: "Nexus Pro",
    tagline: "Для растущего МСБ",
    price: { month: "7 500 ₸", year: "6 000 ₸" },
    priceNote: { month: "в месяц", year: "в месяц при оплате за год" },
    features: [
      "Безлимитная загрузка квитанций",
      "Защита от штрафов по КоАП РК",
      "Мониторинг перекоса фаз и договорной мощности",
      "AI Roadmap оптимизации по каждому счёту",
      "Приоритетная поддержка",
    ],
    cta: "Подключить Pro",
    highlighted: true,
  },
  {
    id: "enterprise_50000",
    name: "ESG Bridge",
    tagline: "Доступ к зелёному финансированию",
    price: { month: "50 000 ₸", year: "50 000 ₸" },
    priceNote: { month: "разово", year: "разово" },
    features: [
      "Отчётность Scope 2 по GHG Protocol",
      "ESG-андеррайтинг с индексом I_gap",
      "Заявка на зелёный кредит фонда «Даму»",
      "Executive summary для банка и инвесторов",
    ],
    cta: "Заказать ESG-отчёт",
  },
];

export function PricingMatrix() {
  const [cycle, setCycle] = useState<BillingCycle>("month");
  const [pendingTier, setPendingTier] = useState<TierId | null>(null);
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationKey: ["subscribe"],
    mutationFn: subscribe,
    onSuccess: (data) => {
      showToast(`Тариф «${data?.tier ?? "—"}» оформлен. Переход к оплате (демо-режим).`, "success");
      setPendingTier(null);
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

  const handleSubscribe = (tierId: TierId) => {
    setPendingTier(tierId);
    mutation.mutate({ tier_id: tierId, billing_cycle: cycle });
  };

  return (
    <div>
      <div className="flex justify-center">
        <div
          role="group"
          aria-label="Период оплаты"
          className="glass inline-flex rounded-full p-1 text-sm"
        >
          {(
            [
              { value: "month", label: "Ежемесячно" },
              { value: "year", label: "За год (Скидка 20%)" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={cycle === option.value}
              onClick={() => setCycle(option.value)}
              className={`rounded-full px-5 py-2 transition ${
                cycle === option.value
                  ? "bg-accent-500 font-medium text-nexus-950"
                  : "text-emerald-100/60 hover:text-white"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {TIERS.map((tier) => {
          const isPending = mutation.isPending && pendingTier === tier.id;
          return (
            <article
              key={tier.id}
              className={`relative flex flex-col rounded-3xl p-8 transition ${
                tier.highlighted
                  ? "glass-strong border-accent-400/40 shadow-2xl shadow-accent-500/10 lg:-translate-y-3"
                  : "glass"
              }`}
            >
              {tier.highlighted ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent-500 px-4 py-1 text-[11px] font-semibold tracking-wide text-nexus-950 uppercase">
                  Популярный выбор
                </span>
              ) : null}

              <h2 className="text-xl font-semibold text-white">{tier.name}</h2>
              <p className="mt-1 text-sm text-emerald-100/50">{tier.tagline}</p>

              <div className="mt-6">
                <span className="text-4xl font-semibold text-white">{tier.price[cycle]}</span>
                <span className="ml-2 text-sm text-emerald-100/50">{tier.priceNote[cycle]}</span>
              </div>

              <ul className="mt-6 flex-1 space-y-3 text-sm leading-6 text-emerald-50/85">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <span className="mt-0.5 text-accent-400">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={mutation.isPending}
                onClick={() => handleSubscribe(tier.id)}
                className={`mt-8 rounded-full px-6 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  tier.highlighted
                    ? "bg-accent-500 text-nexus-950 hover:bg-accent-400"
                    : "border border-emerald-300/25 text-white hover:border-accent-400/60 hover:bg-accent-500/10"
                }`}
              >
                {isPending ? "Оформляем…" : tier.cta}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
