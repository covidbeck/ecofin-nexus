"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Аналитика ресурсов" },
  { href: "/pricing", label: "Тарифы и подписка" },
  { href: "/profile", label: "Профиль компании" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="glass border-x-0 border-t-0 border-b border-emerald-400/15">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-500/20 ring-1 ring-accent-400/40">
              <span className="h-2.5 w-2.5 rounded-full bg-accent-400 shadow-[0_0_12px_2px_rgba(52,211,153,0.7)]" />
            </span>
            <span className="text-base font-semibold tracking-[0.28em] text-white uppercase">
              Nexus
            </span>
          </Link>

          <nav className="flex items-center gap-1 text-sm">
            {links.map((link) => {
              const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-3 py-2 transition sm:px-4 ${
                    active
                      ? "bg-accent-500/15 text-accent-400 ring-1 ring-accent-400/30"
                      : "text-emerald-100/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="hidden sm:inline">{link.label}</span>
                  <span className="sm:hidden">{link.label.split(" ")[0]}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
