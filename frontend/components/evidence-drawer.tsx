"use client";

import { useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import type { Assumption, ValueStatus } from "@/lib/types";

export function EvidenceDrawer({
  assumptions,
  snapshot,
  missingData,
}: {
  assumptions: Assumption[];
  snapshot: Record<string, unknown>;
  missingData: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
      >
        Доказательства и допущения
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30" onClick={() => setOpen(false)}>
          <aside
            className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white p-6 shadow-xl animate-fade-in"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Evidence & assumptions</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Закрыть"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <section className="mb-6">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Допущения и источники
              </h3>
              <ul className="flex flex-col gap-3">
                {assumptions.map((assumption, index) => (
                  <li key={index} className="rounded-lg border border-gray-100 bg-slate-50 p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800">{assumption.subject}</p>
                      <StatusBadge status={assumption.status as ValueStatus} />
                    </div>
                    <p className="text-sm text-slate-600">{assumption.detail}</p>
                    <p className="mt-1 text-xs text-slate-400">Источник: {assumption.source}</p>
                  </li>
                ))}
              </ul>
            </section>

            {missingData.length > 0 ? (
              <section className="mb-6">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Чего не хватает
                </h3>
                <ul className="flex flex-col gap-2">
                  {missingData.map((item, index) => (
                    <li
                      key={index}
                      className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Снимок расчёта
              </h3>
              <pre className="overflow-x-auto rounded-lg border border-gray-100 bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">
                {JSON.stringify(snapshot, null, 2)}
              </pre>
              <p className="mt-2 text-xs text-slate-400">
                Снимок содержит входные данные, версии конфигураций и формулы — расчёт
                воспроизводим детерминированно.
              </p>
            </section>
          </aside>
        </div>
      ) : null}
    </>
  );
}
