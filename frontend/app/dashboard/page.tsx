"use client";

import { useState } from "react";

import { DashboardWorkspace } from "@/components/dashboard-workspace";
import type { BillAnalysisResponse } from "@/lib/types";

export default function DashboardPage() {
  const [analysis, setAnalysis] = useState<BillAnalysisResponse | null>(null);

  return (
    <main className="mx-auto max-w-6xl px-6 pt-14 pb-24">
      <span className="inline-flex items-center gap-2 rounded-full border border-accent-400/25 bg-accent-500/10 px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-accent-400 uppercase">
        <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
        EcoFin · Казахстан 2026
      </span>

      <h1 className="mt-5 max-w-3xl text-4xl leading-tight font-semibold tracking-tight text-white sm:text-5xl">
        Zero-CapEx AI{" "}
        <span className="bg-gradient-to-r from-accent-400 to-emerald-200 bg-clip-text text-transparent">
          Энергоаудит
        </span>
      </h1>

      <p className="mt-5 max-w-2xl text-base leading-7 text-emerald-100/70">
        Загрузите PDF-счет или фото квитанции. Наш алгоритм за 3 секунды найдет скрытые
        переплаты, перекосы фаз и оптимизирует ваш тарифный план.
      </p>

      <div className="mt-10">
        <DashboardWorkspace
          analysis={analysis}
          onSuccess={setAnalysis}
          onReset={() => setAnalysis(null)}
        />
      </div>
    </main>
  );
}
