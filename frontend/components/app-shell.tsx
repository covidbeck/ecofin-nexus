"use client";

import { usePathname } from "next/navigation";

import { AiFaqWidget } from "@/components/ai-faq-widget";
import { Navbar } from "@/components/navbar";

const BARE_ROUTES = ["/login", "/register"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBare = BARE_ROUTES.some((route) => pathname === route || pathname?.startsWith(`${route}/`));

  if (isBare) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      {children}
      <AiFaqWidget />
    </>
  );
}
