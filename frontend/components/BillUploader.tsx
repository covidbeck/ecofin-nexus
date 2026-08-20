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
      showToast("Квитанция проанализирована. Результаты готовы.", "success");
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

  return (
    <section className="glass rounded-3xl p-8 shadow-2xl shadow-black/30 sm:p-10">
      <p className="text-[11px] font-medium tracking-[0.18em] text-accent-400 uppercase">
        Smart Upload Zone
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-white">Загрузите счёт или квитанцию</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100/60">
        PDF, DOCX, DOC, PNG, JPG, WebP · до 10 МБ. Экстракцию делает AI, все цифры считает
        детерминированное математическое ядро.
      </p>

      {mutation.isPending ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-accent-400/30 bg-nexus-900/50 px-6 py-20">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-100/15 border-t-accent-400" />
          <p className="mt-5 text-center text-sm text-emerald-100/80">
            AI-экстракция квитанции и расчёт математического ядра…
          </p>
          <p className="mt-1 text-xs text-emerald-100/40">Обычно занимает около 3 секунд</p>
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
            onFile(event.dataTransfer.files?.[0]);
          }}
          className={`mt-8 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-20 text-center transition ${
            isDragging
              ? "border-accent-400 bg-accent-500/10"
              : "border-emerald-300/20 bg-nexus-900/40 hover:border-accent-400/60 hover:bg-accent-500/5"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(event) => onFile(event.target.files?.[0])}
          />
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500/15 text-2xl text-accent-400 ring-1 ring-accent-400/30">
            ↑
          </span>
          <span className="mt-5 text-base font-medium text-white">
            Перетащите файл сюда или нажмите для выбора
          </span>
          <span className="mt-2 text-xs tracking-wide text-emerald-100/40">
            .pdf · .docx · .doc · .png · .jpg · .jpeg · .webp — максимум 10 МБ
          </span>
        </label>
      )}
    </section>
  );
}
