"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { StatusBadge, formatNumber } from "@/components/status-badge";
import { createConsumption, fetchConsumption, uploadBill } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { BillUploadResponse, ConsumptionCreate } from "@/lib/types";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".docx"];

type FormState = {
  period_start: string;
  period_end: string;
  kwh: string;
  cost_kzt: string;
  fixed_charges_kzt: string;
};

const EMPTY_FORM: FormState = {
  period_start: "",
  period_end: "",
  kwh: "",
  cost_kzt: "",
  fixed_charges_kzt: "0",
};

function validateFile(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return "Недопустимый формат. Разрешены: PDF, PNG, JPEG, WebP, DOCX.";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return "Файл больше 10 МБ. Сожмите документ или введите данные вручную.";
  }
  return null;
}

export function BillsManager() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [extraction, setExtraction] = useState<BillUploadResponse | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [source, setSource] = useState<"upload" | "manual">("manual");
  const [showForm, setShowForm] = useState(false);

  const recordsQuery = useQuery({ queryKey: ["consumption"], queryFn: fetchConsumption });

  const uploadMutation = useMutation({
    mutationFn: uploadBill,
    onSuccess: (data) => {
      setExtraction(data);
      setSource("upload");
      setShowForm(true);
      if (data.draft) {
        setForm({
          period_start: data.draft.period_start,
          period_end: data.draft.period_end,
          kwh: String(data.draft.kwh),
          cost_kzt: String(data.draft.cost_kzt),
          fixed_charges_kzt: String(data.draft.fixed_charges_kzt),
        });
      } else {
        setForm(EMPTY_FORM);
      }
      showToast(data.message, data.needs_manual_entry ? "info" : "success");
    },
    onError: (error) =>
      showToast(error instanceof Error ? error.message : "Ошибка загрузки", "error"),
  });

  const confirmMutation = useMutation({
    mutationFn: createConsumption,
    onSuccess: () => {
      showToast("Период подтверждён и добавлен в цифровой двойник", "success");
      setExtraction(null);
      setShowForm(false);
      setForm(EMPTY_FORM);
      void queryClient.invalidateQueries({ queryKey: ["consumption"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) =>
      showToast(error instanceof Error ? error.message : "Не удалось сохранить запись", "error"),
  });

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const problem = validateFile(file);
    if (problem) {
      showToast(problem, "error");
      return;
    }
    uploadMutation.mutate(file);
  };

  const handleConfirm = (event: React.FormEvent) => {
    event.preventDefault();
    const kwh = Number(form.kwh);
    const cost = Number(form.cost_kzt);
    const fixed = Number(form.fixed_charges_kzt || "0");
    if (!form.period_start || !form.period_end) {
      showToast("Укажите даты периода", "error");
      return;
    }
    if (!Number.isFinite(kwh) || kwh <= 0 || !Number.isFinite(cost) || cost <= 0) {
      showToast("кВт·ч и сумма должны быть положительными числами", "error");
      return;
    }
    const payload: ConsumptionCreate = {
      period_start: form.period_start,
      period_end: form.period_end,
      kwh,
      cost_kzt: cost,
      fixed_charges_kzt: Number.isFinite(fixed) ? fixed : 0,
      data_quality: "measured",
      source,
    };
    confirmMutation.mutate(payload);
  };

  const records = recordsQuery.data?.records ?? [];

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Счета и данные</h1>
        <p className="text-sm text-slate-500">
          Загрузите счёт (ИИ извлечёт поля, вы подтвердите) или введите значения вручную.
          Всё, что попадает в расчёты, подтверждается человеком.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            handleFile(event.dataTransfer.files?.[0]);
          }}
          className={`card flex flex-col items-center justify-center gap-3 border-2 border-dashed p-10 text-center transition ${
            dragging ? "border-emerald-400 bg-emerald-50/50" : "border-gray-200"
          }`}
        >
          {uploadMutation.isPending ? (
            <>
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
              <p className="text-sm text-slate-600">Извлекаем поля из документа…</p>
            </>
          ) : (
            <>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-xl">
                📄
              </span>
              <p className="text-sm font-medium text-slate-800">
                Перетащите счёт сюда или выберите файл
              </p>
              <p className="text-xs text-slate-400">PDF, PNG, JPEG, WebP, DOCX · до 10 МБ</p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-1 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800"
              >
                Выбрать файл
              </button>
              <input
                ref={inputRef}
                type="file"
                accept={ALLOWED_EXTENSIONS.join(",")}
                className="hidden"
                onChange={(event) => {
                  handleFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </>
          )}
        </div>

        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              {extraction ? "Проверьте извлечённые данные" : "Ручной ввод периода"}
            </h2>
            {!showForm ? (
              <button
                type="button"
                onClick={() => {
                  setSource("manual");
                  setExtraction(null);
                  setForm(EMPTY_FORM);
                  setShowForm(true);
                }}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-emerald-300"
              >
                Ввести вручную
              </button>
            ) : null}
          </div>

          {extraction && extraction.warnings.length > 0 ? (
            <ul className="mb-4 flex flex-col gap-1">
              {extraction.warnings.map((warning, index) => (
                <li
                  key={index}
                  className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800"
                >
                  {warning}
                </li>
              ))}
            </ul>
          ) : null}

          {showForm ? (
            <form onSubmit={handleConfirm} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Начало периода
                  <input
                    type="date"
                    required
                    value={form.period_start}
                    onChange={(e) => setForm({ ...form, period_start: e.target.value })}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Конец периода
                  <input
                    type="date"
                    required
                    value={form.period_end}
                    onChange={(e) => setForm({ ...form, period_end: e.target.value })}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Потребление, кВт·ч
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={form.kwh}
                  onChange={(e) => setForm({ ...form, kwh: e.target.value })}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Сумма счёта, ₸
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={form.cost_kzt}
                    onChange={(e) => setForm({ ...form, cost_kzt: e.target.value })}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Фикс. платежи, ₸
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={form.fixed_charges_kzt}
                    onChange={(e) => setForm({ ...form, fixed_charges_kzt: e.target.value })}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={confirmMutation.isPending}
                className="mt-1 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:opacity-50"
              >
                {confirmMutation.isPending ? "Сохраняем…" : "Подтвердить и добавить в расчёты"}
              </button>
              <p className="text-xs text-slate-400">
                Запись получит статус «подтверждено человеком». ИИ никогда не записывает
                данные в расчёты без вашего подтверждения.
              </p>
            </form>
          ) : (
            <p className="text-sm leading-relaxed text-slate-500">
              После загрузки счёта здесь появится форма проверки. Если извлечение не
              сработает, всегда доступен ручной ввод — это штатный сценарий, а не ошибка.
            </p>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Подтверждённые периоды</h2>
        {recordsQuery.isLoading ? (
          <p className="text-sm text-slate-500">Загружаем…</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-slate-500">Записей пока нет.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-4 font-medium">Период</th>
                  <th className="py-2 pr-4 font-medium">кВт·ч</th>
                  <th className="py-2 pr-4 font-medium">Сумма, ₸</th>
                  <th className="py-2 pr-4 font-medium">Эфф. ставка</th>
                  <th className="py-2 pr-4 font-medium">Источник</th>
                  <th className="py-2 font-medium">Качество</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b border-gray-50 text-slate-700">
                    <td className="py-2.5 pr-4">
                      {record.period_start} — {record.period_end}
                    </td>
                    <td className="py-2.5 pr-4">{formatNumber(record.kwh)}</td>
                    <td className="py-2.5 pr-4">{formatNumber(record.cost_kzt)}</td>
                    <td className="py-2.5 pr-4">
                      {record.effective_rate !== null
                        ? `${formatNumber(record.effective_rate, 2)} ₸/кВт·ч`
                        : "—"}
                    </td>
                    <td className="py-2.5 pr-4">
                      {record.source === "upload"
                        ? "счёт"
                        : record.source === "manual"
                          ? "вручную"
                          : "demo"}
                    </td>
                    <td className="py-2.5">
                      <StatusBadge
                        status={record.data_quality === "measured" ? "measured" : "estimated"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
