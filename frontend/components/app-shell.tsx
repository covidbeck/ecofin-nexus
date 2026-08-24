"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { CopilotWidget } from "@/components/copilot-widget";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/lib/auth-context";

const AUTH_FORM_ROUTES = ["/login", "/register"];
const GUEST_ONLY_ROUTES = ["/", "/login", "/register"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuth();
  const isAuthForm = AUTH_FORM_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`),
  );
  const isLanding = pathname === "/";
  const inWorkspace = isAuthenticated && !isAuthForm && !isLanding;

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !pathname) return;
    if (GUEST_ONLY_ROUTES.includes(pathname)) {
      router.replace("/dashboard");
    }
  }, [isHydrated, isAuthenticated, pathname, router]);

  return (
    <div className={inWorkspace ? "app-workspace" : undefined}>
      <Navbar />
      {children}
      {inWorkspace ? <CopilotWidget /> : null}
    </div>
  );
}
