"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { fetchProfileMe } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const CYCLE_LABELS: Record<string, string> = { month: "месячный", year: "годовой" };

export function CompanyProfile() {
  const router = useRouter();
  const { user, subscription, logout } = useAuth();

  const profileQuery = useQuery({
    queryKey: ["profile", "me"],
    queryFn: fetchProfileMe,
    retry: 0,
  });

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const authOk = profileQuery.data?.authenticated === true;
  const initials = (user?.companyName ?? "N C")
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6">
      <section className="card p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-5">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-xl font-bold text-white">
              {initials}
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                {user?.companyName ?? "Tandyr & Co"}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {user?.name ?? "—"} · {user?.role ?? "Владелец бизнеса"}
              </p>
              <p className="mt-0.5 text-sm text-slate-400">{user?.email ?? "—"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-gray-300 hover:bg-slate-50"
          >
            Выйти
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-700">
            ✓ Верифицирован
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700">
            Сэкономлено: 1 020 000 ₸
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700">
            Снижен CO₂: 12 тонн
          </span>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6 sm:p-8">
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Текущий тариф</p>
          {subscription ? (
            <>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">{subscription.tierLabel}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {CYCLE_LABELS[subscription.cycle] ?? subscription.cycle} цикл · активирован{" "}
                {new Date(subscription.activatedAt).toLocaleDateString("ru-KZ")}
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Freemium</h2>
              <p className="mt-1 text-sm text-slate-500">
                Подписка не оформлена. Выберите тариф на странице «Подписка».
              </p>
            </>
          )}
          <a
            href="/subscription"
            className="mt-5 inline-flex rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Управлять подпиской
          </a>
        </section>

        <section className="card p-6 sm:p-8">
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
            Статус сессии
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">Защищённый профиль</h2>
          {profileQuery.isPending ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
              Проверяем защищённый маршрут…
            </p>
          ) : profileQuery.isError ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {profileQuery.error instanceof Error
                ? profileQuery.error.message
                : "Не удалось получить статус."}
            </p>
          ) : (
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-slate-500">Авторизация</span>
                <span className="font-medium text-emerald-600">
                  {authOk ? "подтверждена" : "нет"}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-slate-500">Роль</span>
                <span className="font-medium text-slate-800">
                  {profileQuery.data?.user?.role ?? "—"}
                </span>
              </div>
              <p className="pt-1 text-xs text-slate-400">
                Демо-сессия через заголовок Bearer. Не является production-механикой.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
