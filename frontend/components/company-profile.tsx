"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchProfileMe } from "@/lib/api";

// Demo company card for the pitch. Static by design — the MVP has no tenant
// registry yet, only the mock JWT route below.
const COMPANY = {
  name: "Пекарня-кондитерская «Tandyr & Co»",
  city: "г. Астана",
  role: "Владелец",
  segment: "МСБ · Пищевое производство",
  contract: "Договорная мощность 60 кВт · КРЭМ, зонный тариф",
};

const BADGES = [
  { label: "Верифицирован", tone: "verified" as const },
  { label: "Сэкономлено: 1 020 000 ₸", tone: "accent" as const },
  { label: "Снижен CO₂: 12 тонн", tone: "accent" as const },
];

export function CompanyProfile() {
  const profileQuery = useQuery({
    queryKey: ["profile", "me"],
    queryFn: fetchProfileMe,
    retry: 0,
  });

  const authenticated = profileQuery.data?.authenticated === true;
  const user = profileQuery.data?.user;

  return (
    <div className="space-y-6">
      <section className="glass rounded-3xl p-8 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-5">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-500/15 text-2xl font-semibold text-accent-400 ring-1 ring-accent-400/30">
              T&C
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-white">{COMPANY.name}</h1>
              <p className="mt-1 text-sm text-emerald-100/60">
                {COMPANY.city} · {COMPANY.role}
              </p>
              <p className="mt-1 text-xs text-emerald-100/40">{COMPANY.segment}</p>
            </div>
          </div>

          <span
            className={`rounded-full px-4 py-2 text-xs font-medium tracking-wide ${
              authenticated
                ? "bg-accent-500/15 text-accent-400 ring-1 ring-accent-400/30"
                : "bg-white/5 text-emerald-100/50 ring-1 ring-white/10"
            }`}
          >
            {profileQuery.isPending
              ? "Проверяем сессию…"
              : authenticated
                ? "Сессия активна"
                : "Сессия не подтверждена"}
          </span>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {BADGES.map((badge) => (
            <span
              key={badge.label}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${
                badge.tone === "verified"
                  ? "bg-white/5 text-white ring-1 ring-white/15"
                  : "bg-accent-500/10 text-accent-400 ring-1 ring-accent-400/25"
              }`}
            >
              <span className="text-xs">{badge.tone === "verified" ? "✓" : "◆"}</span>
              {badge.label}
            </span>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass rounded-2xl p-6 sm:p-8">
          <p className="text-[11px] tracking-[0.16em] text-emerald-100/50 uppercase">
            Данные подключения
          </p>
          <h2 className="mt-2 text-lg font-medium text-white">Точка учёта</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
              <dt className="text-emerald-100/50">Регион</dt>
              <dd className="text-white">Астана</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
              <dt className="text-emerald-100/50">Тип бизнеса</dt>
              <dd className="text-white">Пекарня</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-emerald-100/50">Тариф</dt>
              <dd className="text-right text-white">{COMPANY.contract}</dd>
            </div>
          </dl>
        </section>

        <section className="glass rounded-2xl p-6 sm:p-8">
          <p className="text-[11px] tracking-[0.16em] text-emerald-100/50 uppercase">
            Статус авторизации
          </p>
          <h2 className="mt-2 text-lg font-medium text-white">GET /api/v1/profile/me</h2>

          {profileQuery.isPending ? (
            <p className="mt-5 text-sm text-emerald-100/50">Запрашиваем защищённый маршрут…</p>
          ) : profileQuery.isError ? (
            <p className="mt-5 text-sm text-red-200">
              {profileQuery.error instanceof Error
                ? profileQuery.error.message
                : "Не удалось получить статус авторизации."}
            </p>
          ) : (
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
                <dt className="text-emerald-100/50">authenticated</dt>
                <dd className="text-accent-400">{String(authenticated)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
                <dt className="text-emerald-100/50">sub</dt>
                <dd className="text-white">{user?.sub ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-emerald-100/50">role</dt>
                <dd className="text-white">{user?.role ?? "—"}</dd>
              </div>
            </dl>
          )}

          <p className="mt-5 text-xs text-emerald-100/40">
            Демо-сессия: заголовок Authorization: Bearer demo-jwt-token.
          </p>
        </section>
      </div>
    </div>
  );
}
