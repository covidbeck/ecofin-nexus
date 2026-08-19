"use client";

import { useState } from "react";

import { DashboardWorkspace } from "@/components/dashboard-workspace";
import type { BillAnalysisResponse } from "@/lib/types";

export default function DashboardPage() {
  const [analysis, setAnalysis] = useState<BillAnalysisResponse | null>(null);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-light tracking-tight text-slate-800">Dashboard</h1>
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
