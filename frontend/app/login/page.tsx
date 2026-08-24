"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isHydrated, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.replace(user?.organization.onboarding_complete ? "/dashboard" : "/onboarding");
    }
  }, [isHydrated, isAuthenticated, router, user?.organization.onboarding_complete]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const loggedIn = await login(email, password);
      router.push(loggedIn.organization.onboarding_complete ? "/dashboard" : "/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось войти.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-base font-bold text-white">
            N
          </span>
          <span className="text-xl font-semibold tracking-tight text-slate-900">Nexus</span>
        </Link>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h1 className="text-lg font-semibold text-slate-900">Вход в аккаунт</h1>
          <p className="mt-1 text-sm text-slate-500">
            Личный кабинет вашей организации: данные изолированы и доступны только после
            входа.
          </p>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.kz"
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Пароль</span>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
          </div>

          {error ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="mt-5 w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
          >
            {busy ? "Входим…" : "Войти"}
          </button>

          <p className="mt-4 text-center text-sm text-slate-500">
            Нет аккаунта?{" "}
            <Link href="/register" className="font-medium text-emerald-700 hover:text-emerald-800">
              Зарегистрироваться
            </Link>
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Для демонстрации: зарегистрируйте организацию и загрузите демо-данные одним кликом
          на дашборде.
        </p>
      </div>
    </main>
  );
}
