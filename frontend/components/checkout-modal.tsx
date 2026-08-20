"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import type { BillingCycle, TierId } from "@/lib/types";

export type CheckoutTier = {
  id: TierId;
  label: string;
  price: string;
};

type CheckoutModalProps = {
  tier: CheckoutTier;
  cycle: BillingCycle;
  onClose: () => void;
};

// Visual-only demo checkout. Card fields are NEVER submitted or stored — the
// real flow will redirect to a Kaspi/Stripe hosted payment page.
export function CheckoutModal({ tier, cycle, onClose }: CheckoutModalProps) {
  const { setSubscription } = useAuth();
  const [paid, setPaid] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const confirm = () => {
    setProcessing(true);
    window.setTimeout(() => {
      setSubscription({
        tierId: tier.id,
        tierLabel: tier.label,
        cycle,
        activatedAt: new Date().toISOString(),
      });
      setProcessing(false);
      setPaid(true);
    }, 700);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Демо-оплата"
        onClick={(event) => event.stopPropagation()}
        className="animate-fade-in w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl shadow-slate-900/20"
      >
        {paid ? (
          <div className="text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
              ✓
            </span>
            <h2 className="mt-4 text-xl font-semibold text-slate-900">Подписка активирована</h2>
            <p className="mt-2 text-sm text-slate-500">
              Тариф «{tier.label}» ({cycle === "year" ? "годовой" : "месячный"} цикл) подключён в
              демо-режиме.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Готово
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">
                  Демо-оплата
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">{tier.label}</h2>
                <p className="text-sm text-slate-500">
                  {tier.price} · {cycle === "year" ? "оплата за год" : "оплата за месяц"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                className="text-slate-400 transition hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Номер карты</span>
                <input
                  inputMode="numeric"
                  placeholder="0000 0000 0000 0000"
                  autoComplete="off"
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Срок</span>
                  <input
                    placeholder="MM/YY"
                    autoComplete="off"
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">CVV</span>
                  <input
                    placeholder="123"
                    autoComplete="off"
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Имя владельца</span>
                <input
                  placeholder="IVAN IVANOV"
                  autoComplete="off"
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm uppercase outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </label>
            </div>

            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs leading-5 text-amber-800">
              Демо-режим: реквизиты не отправляются и не сохраняются. В production будет редирект на
              hosted checkout Kaspi/Stripe.
            </p>

            <button
              type="button"
              onClick={confirm}
              disabled={processing}
              className="mt-5 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {processing ? "Обработка…" : "Подтвердить демо-оплату"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
