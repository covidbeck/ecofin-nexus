"use client";

import { useState } from "react";

import { DashboardWorkspace } from "@/components/dashboard-workspace";
import type { BillAnalysisResponse } from "@/lib/types";

export default function HomePage() {
  const [analysis, setAnalysis] = useState<BillAnalysisResponse | null>(null);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <p className="text-xs font-medium tracking-[0.2em] text-emerald-600 uppercase">
        EcoFin Nexus
      </p>
      <h1 className="mt-3 max-w-3xl text-4xl leading-tight font-light tracking-tight text-slate-800">
        ESG-андеррайтинг и тарифный арбитраж по квитанции.
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">
        Загрузите PDF. График, roadmap и ESG-текст приходят с API вместе с цифрами ядра.
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
