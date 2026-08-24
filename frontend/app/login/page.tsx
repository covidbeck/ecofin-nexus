"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DemoLoginButton } from "@/components/demo-login-button";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isHydrated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isHydrated, isAuthenticated, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось войти.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="card p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
            Личный кабинет
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-emerald-950">
            Вход в аккаунт
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-emerald-900">
            Личный кабинет вашей организации: данные изолированы и доступны только после
            входа.
          </p>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-emerald-900">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.kz"
                className="mt-1.5 w-full px-3.5 py-2.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-emerald-900">Пароль</span>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="mt-1.5 w-full px-3.5 py-2.5 text-sm"
              />
            </label>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={busy} className="btn-primary mt-6 w-full py-3">
            {busy ? "Входим…" : "Войти"}
          </button>

          <div className="mt-4">
            <DemoLoginButton className="btn-secondary w-full py-3" fullWidth tone="on-light" />
          </div>

          <p className="mt-5 text-center text-sm text-emerald-900">
            Нет аккаунта?{" "}
            <Link href="/register" className="font-semibold text-emerald-800 hover:text-emerald-950">
              Зарегистрироваться
            </Link>
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-emerald-800">
          Для демонстрации: зарегистрируйте организацию и загрузите демо-данные одним кликом
          на дашборде.
        </p>
      </div>
    </main>
  );
}
