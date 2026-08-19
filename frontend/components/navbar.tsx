"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/subscription", label: "Подписка" },
  { href: "/profile", label: "Профиль" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-emerald-600" />
          <span className="text-sm font-semibold tracking-[0.2em] text-slate-900 uppercase">
            EcoFin Nexus
          </span>
        </Link>
        <nav className="flex items-center gap-8 text-sm">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  active
                    ? "text-slate-900"
                    : "text-slate-500 transition hover:text-slate-900"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
