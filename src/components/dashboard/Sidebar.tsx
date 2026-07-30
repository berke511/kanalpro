"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Übersicht" },
  { href: "/kunden", label: "Kunden" },
  { href: "/auftraege", label: "Aufträge" },
  { href: "/einsatzplanung", label: "Einsatzplanung" },
  { href: "/mitarbeiter", label: "Mitarbeiter" },
  { href: "/fahrzeuge", label: "Fahrzeuge" },
  { href: "/material", label: "Material" },
  { href: "/rechnungen", label: "Angebote & Rechnungen" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-card p-4 sm:block">
      <div className="px-2 py-2">
        <Image src="/logo.svg" alt="KanalPro" width={349} height={214} className="h-11 w-auto" priority />
      </div>
      <nav className="mt-4 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-brand-soft text-brand"
                  : "text-muted hover:bg-background hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
