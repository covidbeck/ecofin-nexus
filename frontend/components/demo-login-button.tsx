"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/lib/auth-context";

export function DemoLoginButton({
  className = "btn-primary",
  fullWidth = false,
  tone = "on-dark",
}: {
  className?: string;
  fullWidth?: boolean;
  tone?: "on-dark" | "on-light";
}) {
  const router = useRouter();
  const { demoLogin, isAuthenticated } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) return null;

  const handleClick = async () => {
    setError(null);
    setBusy(true);
    try {
      await demoLogin();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось подключиться к сервису. Попробуйте обновить страницу.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={fullWidth ? "w-full" : undefined}>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={busy}
        className={`${className} ${fullWidth ? "w-full" : ""}`}
      >
        {busy ? "Открываем демо…" : "Открыть демо"}
      </button>
      {error ? (
        <p
          className={`mt-2 text-sm ${tone === "on-dark" ? "text-red-100" : "text-red-800"}`}
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
