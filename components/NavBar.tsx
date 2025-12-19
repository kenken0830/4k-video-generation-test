"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/products", label: "Products" },
  { href: "/assets", label: "Assets" },
  { href: "/compare", label: "Compare" },
  { href: "/trends", label: "Trends" },
  { href: "/decisions", label: "Decisions" },
  { href: "/templates", label: "Templates" },
  { href: "/import", label: "Import" },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm">
      {navItems.map((item) => {
        const active =
          item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-1 transition ${
              active
                ? "bg-slate-900 text-white shadow-sm"
                : "border border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
