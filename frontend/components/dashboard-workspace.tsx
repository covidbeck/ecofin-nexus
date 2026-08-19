"use client";

import { BillUploader } from "@/components/BillUploader";
import { Dashboard } from "@/components/Dashboard";
import { HourlyChart } from "@/components/HourlyChart";
import type { BillAnalysisResponse } from "@/lib/types";

type DashboardWorkspaceProps = {
  analysis: BillAnalysisResponse | null;
  onSuccess: (data: BillAnalysisResponse) => void;
  onReset: () => void;
};

export function DashboardWorkspace({ analysis, onSuccess, onReset }: DashboardWorkspaceProps) {
  if (!analysis) {
    return <BillUploader onSuccess={onSuccess} />;
  }

  return (
    <div className="space-y-8">
      <Dashboard data={analysis} onReset={onReset} />

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-xs tracking-[0.16em] text-slate-400 uppercase">Почасовой профиль</p>
        <h3 className="mt-2 text-center text-lg font-medium text-slate-800">
          Нагрузка за типичные сутки
        </h3>
        <div className="mx-auto mt-6 max-w-4xl">
          <HourlyChart points={analysis.hourly_profile.points} />
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-xs tracking-[0.16em] text-slate-400 uppercase">AI Roadmap</p>
        <h3 className="mt-2 text-lg font-medium text-slate-800">План оптимизации (AI Roadmap)</h3>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7 text-slate-800">
          {analysis.ai_roadmap.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-xs tracking-[0.16em] text-slate-400 uppercase">Модуль Insights</p>
        <h3 className="mt-2 text-lg font-medium text-slate-800">ESG Executive Summary</h3>
        <p className="mt-4 text-sm leading-7 text-slate-800">{analysis.esg_executive_summary}</p>
      </section>
    </div>
  );
}
