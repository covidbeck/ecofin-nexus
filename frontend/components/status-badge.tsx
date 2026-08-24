import type { ValueStatus, ValueWithStatus } from "@/lib/types";

const STATUS_STYLES: Record<ValueStatus, string> = {
  measured: "bg-emerald-100 text-emerald-800",
  confirmed: "border border-emerald-300 bg-white text-emerald-700",
  estimated: "bg-amber-100 text-amber-800",
  simulated: "bg-sky-100 text-sky-800",
  unavailable: "bg-slate-100 text-slate-500",
};

const STATUS_LABELS: Record<ValueStatus, string> = {
  measured: "измерено",
  confirmed: "подтверждено",
  estimated: "оценка",
  simulated: "симуляция",
  unavailable: "недоступно",
};

export function StatusBadge({ status }: { status: ValueStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function ValueCard({
  title,
  data,
  digits = 0,
  accent = false,
}: {
  title: string;
  data: ValueWithStatus;
  digits?: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`card flex flex-col gap-2 p-5 ${accent ? "border-emerald-200 bg-emerald-50/40" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <StatusBadge status={data.status} />
      </div>
      {data.value !== null && data.value !== undefined ? (
        <p className="text-2xl font-semibold tracking-tight text-slate-900">
          {formatNumber(data.value, digits)}
          {data.unit ? <span className="ml-1 text-sm font-normal text-slate-500">{data.unit}</span> : null}
        </p>
      ) : (
        <p className="text-sm leading-relaxed text-slate-500">
          {data.explanation ?? "Данные недоступны."}
        </p>
      )}
      {data.source && data.value !== null ? (
        <p className="truncate text-xs text-slate-400" title={data.source}>
          Источник: {data.source}
        </p>
      ) : null}
    </div>
  );
}
