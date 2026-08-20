import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AiFaqWidget } from "@/components/ai-faq-widget";
import { Navbar } from "@/components/navbar";
import { Providers } from "@/components/providers";

import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nexus — Zero-CapEx AI Энергоаудит",
  description:
    "Предиктивное управление энергией и ESG-андеррайтинг для МСБ Казахстана: тарифный арбитраж, Scope 2 и заявка в фонд «Даму».",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${inter.className} min-h-screen text-emerald-50 antialiased`}>
        <Providers>
          <Navbar />
          {children}
          <AiFaqWidget />
        </Providers>
      </body>
    </html>
  );
}
