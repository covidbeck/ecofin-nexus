"use client";

import { useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import type { Assumption, ValueStatus } from "@/lib/types";
import { valueStatusHuman } from "@/lib/ux-copy";

export type EvidenceMetric = {
  label: string;
  value: string;
  explanation: string;
};

export function EvidenceDrawer({
  assumptions,
  snapshot,
  missingData,
  summary,
  usedData = [],
  assumptionLines = [],
  reliability,
  extraMetrics = [],
}: {
  assumptions: Assumption[];
  snapshot: Record<string, unknown>;
  missingData: string[];
  summary?: string;
  usedData?: string[];
  assumptionLines?: string[];
  reliability?: string;
  extraMetrics?: EvidenceMetric[];
}) {
  const [open, setOpen] = useState(false);
  const [techOpen, setTechOpen] = useState(false);

  const humanAssumptions = assumptionLines.length > 0 ? assumptionLines : assumptions.map((item) => item.detail);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost">
        Доказательства и допущения
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50" onClick={() => setOpen(false)}>
          <aside
            className="evidence-drawer flex h-full w-full max-w-md flex-col overflow-y-auto p-6 animate-fade-in"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-emerald-50">Доказательства и допущения</h2>
                <p className="mt-1 text-sm leading-relaxed text-emerald-100/75">
                  Сначала — человеческое объяснение. Формулы и технические идентификаторы скрыты до проверки.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Закрыть"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-emerald-100 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200"
              >
                ✕
              </button>
            </div>

            <section className="mb-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-lime-200/80">
                Что это значит
              </h3>
              <p className="text-sm leading-relaxed text-emerald-50">
                {summary ??
                  "Расчёт использует подтверждённые данные периода, ваши ограничения и явно помеченные допущения. Если данных не хватает, Nexus не подставляет правдоподобную цифру."}
              </p>
            </section>

            {usedData.length > 0 ? (
              <section className="mb-6">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-lime-200/80">
                  Какие данные использованы
                </h3>
                <ul className="flex flex-col gap-2">
                  {usedData.map((item) => (
                    <li key={item} className="rounded-2xl border border-lime-100/15 bg-emerald-950/40 px-3.5 py-3 text-sm leading-relaxed text-emerald-50">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="mb-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-lime-200/80">
                Какие допущения сделаны
              </h3>
              <ul className="flex flex-col gap-2">
                {humanAssumptions.map((line) => (
                  <li
                    key={line}
                    className="rounded-2xl border border-lime-100/15 bg-emerald-950/40 px-3.5 py-3 text-sm leading-relaxed text-emerald-50"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </section>

            {reliability ? (
              <section className="mb-6">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-lime-200/80">
                  Насколько можно доверять результату
                </h3>
                <p className="rounded-2xl border border-lime-100/15 bg-emerald-950/40 px-3.5 py-3 text-sm leading-relaxed text-emerald-50">
                  {reliability}
                </p>
              </section>
            ) : null}

            {extraMetrics.length > 0 ? (
              <section className="mb-6">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-lime-200/80">
                  Дополнительные метрики
                </h3>
                <ul className="flex flex-col gap-2">
                  {extraMetrics.map((metric) => (
                    <li
                      key={metric.label}
                      className="rounded-2xl border border-lime-100/15 bg-emerald-950/40 px-3.5 py-3"
                    >
                      <p className="text-sm font-medium text-emerald-50">{metric.label}</p>
                      <p className="mt-1 text-lg font-semibold text-lime-100">{metric.value}</p>
                      <p className="mt-1 text-xs leading-relaxed text-emerald-100/70">{metric.explanation}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {missingData.length > 0 ? (
              <section className="mb-6">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-lime-200/80">
                  Чего не хватает
                </h3>
                <ul className="flex flex-col gap-2">
                  {missingData.map((item) => (
                    <li
                      key={item}
                      className="rounded-2xl border border-amber-200/20 bg-amber-400/10 px-3.5 py-3 text-sm text-amber-100"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-2xl border border-lime-100/15 bg-emerald-950/30 px-4 py-3 text-left text-sm font-medium text-emerald-50 transition hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200"
                onClick={() => setTechOpen((current) => !current)}
                aria-expanded={techOpen}
              >
                Технические детали для проверки
                <span aria-hidden="true">{techOpen ? "▾" : "▸"}</span>
              </button>

              {techOpen ? (
                <div className="mt-3 flex flex-col gap-4">
                  <ul className="flex flex-col gap-3">
                    {assumptions.map((assumption, index) => (
                      <li key={`${assumption.subject}-${index}`} className="rounded-2xl border border-lime-100/10 bg-emerald-950/50 p-3">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-emerald-50">{assumption.subject}</p>
                          <StatusBadge status={assumption.status as ValueStatus} />
                        </div>
                        <p className="text-sm text-emerald-100/80">{assumption.detail}</p>
                        <p className="mt-1 text-xs text-emerald-200/60">
                          Источник: {assumption.source} · {valueStatusHuman(assumption.status as ValueStatus)}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <pre className="overflow-x-auto rounded-2xl border border-lime-100/10 bg-black/40 p-3 text-[11px] leading-relaxed text-lime-100">
                    {JSON.stringify(snapshot, null, 2)}
                  </pre>
                  <p className="text-xs leading-relaxed text-emerald-200/60">
                    Снимок содержит входные данные, версии конфигураций и формулы — расчёт воспроизводим
                    детерминированно.
                  </p>
                </div>
              ) : null}
            </section>
          </aside>
        </div>
      ) : null}
    </>
  );
}
