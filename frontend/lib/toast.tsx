"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

export type ToastKind = "error" | "success" | "info";

type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
};

type ToastContextValue = {
  showToast: (message: string, kind?: ToastKind) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE: Record<ToastKind, string> = {
  error: "border-red-400/40 bg-red-950/80 text-red-100",
  success: "border-lime-200/40 bg-emerald-950/90 text-lime-100",
  info: "border-emerald-200/30 bg-emerald-950/90 text-emerald-50",
};

const ICON_TONE: Record<ToastKind, string> = {
  error: "bg-red-500/30 text-red-100",
  success: "bg-lime-200/20 text-lime-100",
  info: "bg-emerald-400/20 text-emerald-50",
};

const ICON: Record<ToastKind, string> = {
  error: "!",
  success: "✓",
  info: "i",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, kind, message }]);
      window.setTimeout(() => dismiss(id), 6000);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed top-20 right-4 z-[70] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className={`animate-fade-in pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${TONE[toast.kind]}`}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${ICON_TONE[toast.kind]}`}
            >
              {ICON[toast.kind]}
            </span>
            <p className="flex-1 leading-5">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Закрыть уведомление"
              className="shrink-0 opacity-50 transition hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
