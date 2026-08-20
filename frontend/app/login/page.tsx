"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DEMO_CREDENTIALS, useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginAsDemo, isAuthenticated, isHydrated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.replace("/analytics");
    }
  }, [isHydrated, isAuthenticated, router]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      login(email, password);
      router.push("/analytics");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось войти.");
    }
  };

  const handleDemo = () => {
    setError(null);
    loginAsDemo();
    router.push("/analytics");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/about" className="flex items-center justify-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-base font-bold text-white">
            N
          </span>
          <span className="text-xl font-semibold tracking-tight text-slate-900">Nexus</span>
        </Link>

        <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">
            Демо-доступ для жюри
          </p>
          <dl className="mt-3 space-y-1 text-sm text-emerald-900">
            <div className="flex justify-between gap-3">
              <dt className="text-emerald-700">Email</dt>
              <dd className="font-medium">{DEMO_CREDENTIALS.email}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-emerald-700">Пароль</dt>
              <dd className="font-medium">{DEMO_CREDENTIALS.password}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-emerald-700">Компания</dt>
              <dd className="font-medium">{DEMO_CREDENTIALS.companyName}</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={handleDemo}
            className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            Войти как Tandyr &amp; Co
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h1 className="text-lg font-semibold text-slate-900">Вход в аккаунт</h1>
          <p className="mt-1 text-sm text-slate-500">Или войдите вручную по данным выше.</p>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="demo@nexus.kz"
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
            className="mt-5 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Войти
          </button>

          <p className="mt-4 text-center text-sm text-slate-500">
            Нет аккаунта?{" "}
            <Link href="/register" className="font-medium text-emerald-700 hover:text-emerald-800">
              Зарегистрироваться
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
