"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DemoLoginButton } from "@/components/demo-login-button";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, isHydrated } = useAuth();
  const [form, setForm] = useState({
    name: "",
    organization_name: "",
    email: "",
    password: "",
  });
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
    if (form.password.length < 8) {
      setError("Пароль должен быть не короче 8 символов.");
      return;
    }
    setBusy(true);
    try {
      await register(form);
      router.push("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось зарегистрироваться.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="card p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
            Новая организация
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-emerald-950">
            Регистрация организации
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-emerald-900">
            Создаётся отдельное пространство вашей организации. После регистрации — короткий
            онбординг.
          </p>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-emerald-900">Ваше имя</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Айгерим"
                className="mt-1.5 w-full px-3.5 py-2.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-emerald-900">Название организации</span>
              <input
                required
                value={form.organization_name}
                onChange={(e) => setForm({ ...form, organization_name: e.target.value })}
                placeholder="ТОО «Ваша компания»"
                className="mt-1.5 w-full px-3.5 py-2.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-emerald-900">Email</span>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@company.kz"
                className="mt-1.5 w-full px-3.5 py-2.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-emerald-900">Пароль (мин. 8 символов)</span>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
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
            {busy ? "Создаём аккаунт…" : "Создать аккаунт"}
          </button>

          <div className="mt-4">
            <DemoLoginButton className="btn-secondary w-full py-3" fullWidth tone="on-light" />
          </div>

          <p className="mt-5 text-center text-sm text-emerald-900">
            Уже есть аккаунт?{" "}
            <Link href="/login" className="font-semibold text-emerald-800 hover:text-emerald-950">
              Войти
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
