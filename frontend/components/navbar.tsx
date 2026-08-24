"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DemoLoginButton } from "@/components/demo-login-button";
import { useAuth } from "@/lib/auth-context";

const links = [
  { href: "/dashboard", label: "Дашборд" },
  { href: "/bills", label: "Счета" },
  { href: "/scenarios", label: "План экономии" },
  { href: "/subscription", label: "Подписка" },
  { href: "/profile", label: "Профиль" },
];

function NexusLogo({ href }: { href: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-lime-100 text-sm font-bold text-emerald-900 shadow-[0_0_20px_rgba(236,252,203,0.45)]">
        N
      </span>
      <span className="text-lg font-semibold tracking-tight text-emerald-50">Nexus</span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);
  const visibleLinks = isAuthenticated ? links : [];

  return (
    <header className="site-header sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <NexusLogo href={isAuthenticated ? "/dashboard" : "/"} />

        <nav className="hidden items-center gap-1 text-sm md:flex">
          {visibleLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`rounded-full px-3 py-2 font-medium transition ${
                isActive(link.href)
                  ? "bg-lime-100 text-emerald-900"
                  : "text-emerald-50 hover:bg-white/10 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <>
              <span className="max-w-[10rem] truncate text-sm text-emerald-100">
                {user?.organization.name}
              </span>
              <button type="button" onClick={handleLogout} className="btn-ghost">
                Выйти
              </button>
            </>
          ) : (
            <>
              <DemoLoginButton />
              <Link href="/login" className="btn-ghost">
                Войти
              </Link>
              <Link href="/register" className="btn-secondary">
                Регистрация
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label="Меню"
          aria-expanded={mobileOpen}
          className="flex h-10 w-10 items-center justify-center rounded-2xl text-emerald-50 transition hover:bg-white/10 md:hidden"
        >
          <span className="text-xl leading-none">{mobileOpen ? "✕" : "☰"}</span>
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-white/10 bg-emerald-900/40 md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4 text-sm">
            {visibleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-2xl px-3 py-2.5 font-medium transition ${
                  isActive(link.href)
                    ? "bg-lime-100 text-emerald-900"
                    : "text-emerald-50 hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-white/10 pt-3">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-ghost w-full"
                >
                  Выйти ({user?.organization.name})
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <DemoLoginButton fullWidth />
                  <Link href="/login" className="btn-ghost w-full">
                    Войти
                  </Link>
                  <Link href="/register" className="btn-secondary w-full">
                    Регистрация
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
