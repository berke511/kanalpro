"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";

/**
 * Die Desktop-Sidebar (Sidebar.tsx) ist ab `sm:` sichtbar und darunter
 * komplett ausgeblendet – ohne diese Komponente gäbe es auf Mobilgeräten
 * keinerlei Möglichkeit, zwischen den Modulen zu wechseln. Trigger-Button
 * und Slide-in-Drawer sitzen bewusst in einer Komponente: der Button steht
 * inline in der Topbar, der Drawer legt sich per `fixed` unabhängig von der
 * Position im DOM über die gesamte Seite.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-ml-1 rounded-lg p-2 text-muted hover:bg-background hover:text-foreground sm:hidden"
        aria-label="Menü öffnen"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <button
            type="button"
            aria-label="Menü schließen"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-card p-4 shadow-xl">
            <div className="flex items-center justify-between px-2 py-2">
              <Image src="/logo.svg" alt="KanalPro" width={349} height={214} className="h-9 w-auto" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-muted hover:bg-background hover:text-foreground"
                aria-label="Menü schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-4 flex flex-1 flex-col gap-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active ? "bg-brand-soft text-brand" : "text-muted hover:bg-background hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
