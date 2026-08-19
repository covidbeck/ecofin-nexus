"use client";

import { useState } from "react";

import { BillUploader } from "@/components/BillUploader";
import { Dashboard } from "@/components/Dashboard";
import type { BillAnalysisResponse } from "@/lib/types";

export default function DashboardPage() {
  const [analysis, setAnalysis] = useState<BillAnalysisResponse | null>(null);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-light tracking-tight text-slate-900">Dashboard</h1>
      <div className="mt-10">
        {analysis ? (
          <Dashboard data={analysis} onReset={() => setAnalysis(null)} />
        ) : (
          <BillUploader onSuccess={setAnalysis} />
        )}
      </div>
    </main>
  );
}
