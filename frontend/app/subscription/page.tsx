import { SubscriptionMatrix } from "@/components/subscription-matrix";

export default function SubscriptionPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 pt-14 pb-24">
      <div className="text-center">
        <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">
          Тарифы и подписка
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
          Платите за экономию, а не за оборудование
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-500">
          Zero-CapEx: без датчиков и монтажа. Годовая цена уже включает скидку 20%. Оплата в
          демо-режиме — реальный процессинг подключается через hosted checkout Kaspi/Stripe.
        </p>
      </div>

      <div className="mt-12">
        <SubscriptionMatrix />
      </div>
    </main>
  );
}
