"use client";

import { usePathname } from "next/navigation";

import { CopilotWidget } from "@/components/copilot-widget";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/lib/auth-context";

const BARE_ROUTES = ["/login", "/register"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const isBare = BARE_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`),
  );

  if (isBare) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      {children}
      {isAuthenticated ? <CopilotWidget /> : null}
    </>
  );
}
