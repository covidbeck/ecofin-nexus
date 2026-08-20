"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { verifyCaptcha } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState({ name: "", companyName: "", email: "", password: "" });
  const [notRobot, setNotRobot] = useState(false);
  const [captchaOk, setCaptchaOk] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleCaptcha = async (checked: boolean) => {
    setNotRobot(checked);
    if (!checked) {
      setCaptchaOk(false);
      return;
    }
    setVerifying(true);
    try {
      const result = await verifyCaptcha("demo-widget-token");
      const ok = result?.status === "success";
      setCaptchaOk(ok);
      if (!ok) {
        setNotRobot(false);
        showToast("Не удалось пройти проверку. Попробуйте ещё раз.", "error");
      }
    } catch {
      setCaptchaOk(false);
      setNotRobot(false);
      showToast("Проверка «Я не робот» недоступна. Попробуйте позже.", "error");
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!captchaOk) {
      setError("Подтвердите, что вы не робот.");
      return;
    }
    setSubmitting(true);
    register(form);
    showToast("Аккаунт создан. Добро пожаловать в Nexus!", "success");
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

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h1 className="text-lg font-semibold text-slate-900">Создать аккаунт</h1>
          <p className="mt-1 text-sm text-slate-500">
            Демо-регистрация: создаёт локальную сессию, без реальных платежей.
          </p>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Имя</span>
              <input
                required
                value={form.name}
                onChange={update("name")}
                placeholder="Азамат Тандыр"
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Компания</span>
              <input
                required
                value={form.companyName}
                onChange={update("companyName")}
                placeholder="Tandyr & Co"
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                required
                value={form.email}
                onChange={update("email")}
                placeholder="owner@company.kz"
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Пароль</span>
              <input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={update("password")}
                placeholder="Минимум 6 символов"
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
          </div>

          <label className="mt-5 flex items-center gap-3 rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3">
            <input
              type="checkbox"
              checked={notRobot}
              disabled={verifying}
              onChange={(event) => handleCaptcha(event.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="flex-1 text-sm text-slate-700">Я не робот</span>
            {verifying ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
            ) : captchaOk ? (
              <span className="text-sm font-medium text-emerald-600">✓ Проверено</span>
            ) : null}
          </label>

          {error ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
          >
            Зарегистрироваться
          </button>

          <p className="mt-4 text-center text-sm text-slate-500">
            Уже есть аккаунт?{" "}
            <Link href="/login" className="font-medium text-emerald-700 hover:text-emerald-800">
              Войти
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
