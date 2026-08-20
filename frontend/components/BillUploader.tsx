"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

import { analyzeUtilityBill, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { BillAnalysisResponse } from "@/lib/types";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".docx", ".doc"];
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const ACCEPT = [
  ...ALLOWED_EXTENSIONS,
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
].join(",");

type BillUploaderProps = {
  onSuccess: (data: BillAnalysisResponse) => void;
};

function clientFileError(file: File): string | null {
  const name = file.name.toLowerCase();
  const allowedExt = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
  const allowedType = file.type ? ALLOWED_TYPES.has(file.type) : false;
  if (!allowedExt && !allowedType) {
    return "Неверный формат файла. Допустимы PDF, DOCX, DOC, PNG, JPG и WebP.";
  }
  if (file.size > MAX_BYTES) {
    return "Файл больше 10 МБ. Загрузите квитанцию меньшего размера.";
  }
  return null;
}

export function BillUploader({ onSuccess }: BillUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationKey: ["bill", "analyze"],
    mutationFn: analyzeUtilityBill,
    onSuccess: (data) => {
      showToast("Квитанция обработана. Формируем аналитику.", "success");
      onSuccess(data);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : "Не удалось проанализировать квитанцию.";
      showToast(message, "error");
    },
  });

  const mutate = mutation.mutate;
  const resetMutation = mutation.reset;

  const onFile = useCallback(
    (file: File | undefined) => {
      if (inputRef.current) inputRef.current.value = "";
      if (!file) return;
      const blocked = clientFileError(file);
      if (blocked) {
        resetMutation();
        showToast(blocked, "error");
        return;
      }
      mutate(file);
    },
    [mutate, resetMutation, showToast],
  );

  if (mutation.isPending) {
    return (
      <section className="card p-8 sm:p-10">
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 px-6 py-20 text-center">
          <span className="h-11 w-11 animate-spin rounded-full border-[3px] border-emerald-100 border-t-emerald-600" />
          <p className="mt-6 text-base font-medium text-slate-800">
            ИИ извлекает данные, затем математическое ядро формирует расчёт…
          </p>
          <p className="mt-2 text-sm text-slate-500">Обычно занимает несколько секунд</p>
        </div>
      </section>
    );
  }

  return (
    <section className="card p-8 sm:p-10">
      <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">
        Умная зона загрузки
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
        Превращаем киловатты в чистую прибыль
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
        Загрузите PDF-счёт или фото квитанции. ИИ безопасно оцифрует документ, а детерминированное
        математическое ядро посчитает арбитраж, Scope 2 и индекс для «Даму».
      </p>

      <label
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          onFile(event.dataTransfer.files?.[0]);
        }}
        className={`mt-8 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-16 text-center transition ${
          isDragging
            ? "border-emerald-500 bg-emerald-50"
            : "border-gray-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/40"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(event) => onFile(event.target.files?.[0])}
        />
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-2xl text-white shadow-sm">
          ↑
        </span>
        <span className="mt-5 text-base font-medium text-slate-800">
          Перетащите файл сюда или нажмите для выбора
        </span>
        <span className="mt-2 text-xs tracking-wide text-slate-400">
          PDF · DOCX · DOC · PNG · JPG · WebP — максимум 10 МБ
        </span>
      </label>
    </section>
  );
}
