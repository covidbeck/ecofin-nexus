"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

import { analyzeUtilityBill, ApiError } from "@/lib/api";
import type { BillAnalysisResponse } from "@/lib/types";

type BillUploaderProps = {
  onSuccess: (data: BillAnalysisResponse) => void;
};

export function BillUploader({ onSuccess }: BillUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationKey: ["bill", "analyze"],
    mutationFn: analyzeUtilityBill,
    onSuccess,
  });

  const mutate = mutation.mutate;
  const onFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      mutate(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [mutate],
  );

  const errorText =
    mutation.error instanceof ApiError || mutation.error instanceof Error
      ? mutation.error.message
      : mutation.isError
        ? "Не удалось проанализировать квитанцию."
        : null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
      <p className="text-xs font-medium tracking-[0.16em] text-emerald-600 uppercase">
        Квитанция
      </p>
      <h2 className="mt-2 text-xl font-medium text-slate-900">Загрузите PDF-счёт</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
        Файл уходит на API. Экстракция — ИИ, цифры считает только математическое ядро бэкенда.
      </p>

      {mutation.isPending ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-slate-50 px-6 py-16">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
          <p className="mt-4 text-center text-sm text-slate-600">
            ИИ-экстракция и расчет математического ядра...
          </p>
        </div>
      ) : (
        <label
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            onFile(event.dataTransfer.files[0]);
          }}
          className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 transition ${
            isDragging
              ? "border-emerald-600 bg-emerald-50/50"
              : "border-gray-200 bg-slate-50 hover:border-emerald-600"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => onFile(event.target.files?.[0])}
          />
          <span className="text-sm text-slate-800">Перетащите PDF сюда или нажмите, чтобы выбрать</span>
          <span className="mt-1 text-xs text-slate-400">POST /api/v1/analyze-bill</span>
        </label>
      )}

      {errorText ? (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {errorText}
        </p>
      ) : null}
    </section>
  );
}
