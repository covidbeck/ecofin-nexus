import { PricingMatrix } from "@/components/pricing-matrix";

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 pt-14 pb-24">
      <div className="text-center">
        <p className="text-[11px] font-medium tracking-[0.18em] text-accent-400 uppercase">
          Тарифы и подписка
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Платите за экономию, а не за оборудование
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-emerald-100/60">
          Zero-CapEx модель: никаких датчиков и монтажа. Всё, что нужно — квитанция за
          электроэнергию.
        </p>
      </div>

      <div className="mt-12">
        <PricingMatrix />
      </div>
    </main>
  );
}
