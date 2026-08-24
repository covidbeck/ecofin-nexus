import type { ValueStatus, ValueWithStatus } from "@/lib/types";
import { humanUnit } from "@/lib/ux-copy";

const STATUS_STYLES: Record<ValueStatus, string> = {
  measured: "bg-lime-200/90 text-emerald-950",
  confirmed: "border border-lime-200/70 bg-emerald-950/20 text-lime-100",
  estimated: "bg-amber-400/20 text-amber-100",
  simulated: "bg-cyan-400/20 text-cyan-100",
  unavailable: "bg-emerald-950/40 text-emerald-200/80",
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

const TRUST_STYLES = {
  demo: "bg-amber-300/15 text-amber-100 border border-amber-200/25",
  manual: "bg-cyan-300/15 text-cyan-100 border border-cyan-200/25",
  verified: "bg-lime-200/20 text-lime-100 border border-lime-100/30",
  review: "bg-orange-300/15 text-orange-100 border border-orange-200/25",
};

const TRUST_ICONS = {
  demo: "◈",
  manual: "✎",
  verified: "✓",
  review: "!",
};

export function TrustBadge({
  label,
  tone,
}: {
  label: string;
  tone: keyof typeof TRUST_STYLES;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${TRUST_STYLES[tone]}`}
    >
      <span aria-hidden="true">{TRUST_ICONS[tone]}</span>
      {label}
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
  caption,
  hideStatus = true,
  hideSource = true,
}: {
  title: string;
  data: ValueWithStatus;
  digits?: number;
  accent?: boolean;
  caption?: string;
  hideStatus?: boolean;
  hideSource?: boolean;
}) {
  const unit = humanUnit(data.unit);
  return (
    <div className={`card flex flex-col gap-2 p-6 ${accent ? "ring-1 ring-lime-200/30" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        {hideStatus ? null : <StatusBadge status={data.status} />}
      </div>
      {data.value !== null && data.value !== undefined ? (
        <p className="text-2xl font-semibold tracking-tight text-slate-900">
          {formatNumber(data.value, digits)}
          {unit ? <span className="ml-1 text-sm font-normal text-slate-500">{unit}</span> : null}
        </p>
      ) : (
        <p className="text-sm leading-relaxed text-slate-500">
          {data.explanation ?? "Данные недоступны."}
        </p>
      )}
      {caption ? <p className="text-xs leading-relaxed text-slate-400">{caption}</p> : null}
      {!hideSource && data.source && data.value !== null ? (
        <p className="truncate text-xs text-slate-400" title={data.source}>
          {data.source}
        </p>
      ) : null}
    </div>
  );
}
