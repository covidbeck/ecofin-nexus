import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EcoFin Nexus",
  description: "ESG underwriting and resource arbitrage for SMEs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
