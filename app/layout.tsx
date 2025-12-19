import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Product Intelligence OS",
  description: "KPI benchmarking and trend pipeline for multi-product ops",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
        <header className="border-b bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link href="/" className="text-xl font-bold text-slate-900">
                Product Intelligence OS
              </Link>
              <p className="text-sm text-slate-500">Unified KPIs, benchmarks, decisions, and trends</p>
            </div>
            <NavBar />
          </div>
        </header>
        <main className="mx-auto max-w-6xl space-y-6 px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
