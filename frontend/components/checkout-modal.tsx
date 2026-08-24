"use client";

import { formatNumber } from "@/components/status-badge";
import type { BillingCycle, Plan } from "@/lib/types";

export function CheckoutModal({
  plan,
  cycle,
  busy,
  onConfirm,
  onClose,
}: {
  plan: Plan;
  cycle: BillingCycle;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const price = cycle === "month" ? plan.price_month_kzt : plan.price_year_kzt;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md p-6 animate-fade-in"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Демо-оплата</h2>
        <p className="mb-4 text-sm text-slate-500">
          План {plan.name} · {price === 0 ? "бесплатно" : `${formatNumber(price)} ₸`}
          {price > 0 ? (cycle === "month" ? " в месяц" : " в год") : ""}
        </p>

        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
          Это демонстрационный checkout MVP. Платёжный провайдер не подключён; данные карты
          никуда не отправляются и не сохраняются. План активируется на сервере как
          mock-подписка.
        </div>

        {price > 0 ? (
          <div className="mb-4 flex flex-col gap-3 opacity-70">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Номер карты (визуально, не отправляется)
              <input
                inputMode="numeric"
                placeholder="4242 4242 4242 4242"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Срок действия
                <input
                  placeholder="12/28"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                CVC
                <input
                  placeholder="•••"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                />
              </label>
            </div>
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:opacity-50"
          >
            {busy ? "Активируем…" : "Подтвердить демо-оплату"}
          </button>
        </div>
      </div>
    </div>
  );
}
