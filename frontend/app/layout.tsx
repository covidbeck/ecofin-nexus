import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "Nexus — Resource Decision Engine",
  description:
    "Nexus превращает счета за ресурсы в объяснимый цифровой двойник предприятия: проверенные расчёты, аномалии, сценарии и лучший выполнимый план действий.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="min-h-screen antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
