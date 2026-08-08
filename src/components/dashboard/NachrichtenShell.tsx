"use client";

import { usePathname } from "next/navigation";

/**
 * Geteilte Ansicht für den Nachrichten-Bereich: Konversationsliste links,
 * aktiver Chat rechts, nebeneinander statt als eigene Seiten (kein
 * Seitenwechsel mehr, siehe /nachrichten/layout.tsx). Auf dem Handy ist
 * dafür kein Platz – dort zeigt diese Komponente je nach Route immer nur
 * eine der beiden Spalten (Liste ODER Chat), erkannt über den aktuellen
 * Pfad. Ab dem sm-Breakpoint sind immer beide sichtbar.
 */
export function NachrichtenShell({ list, children }: { list: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname();
  const isIndex = pathname === "/nachrichten";

  return (
    <div className="flex h-[calc(100vh-4.5rem)]">
      <div
        className={`${isIndex ? "flex" : "hidden"} w-full flex-col border-r border-border bg-card sm:flex sm:w-[340px] sm:shrink-0`}
      >
        {list}
      </div>
      <div className={`${isIndex ? "hidden" : "flex"} min-w-0 flex-1 flex-col sm:flex`}>{children}</div>
    </div>
  );
}
