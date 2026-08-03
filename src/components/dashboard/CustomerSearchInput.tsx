"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

// Live-Suche für die Kundenliste: tippt der Nutzer, wird die URL nach einer
// kurzen Debounce-Zeit per router.replace() aktualisiert (kein Formular-
// Submit mehr nötig). Alle übrigen Filter/Sortier-/Seiten-Parameter in der
// URL bleiben dabei unangetastet – nur "q" wird gesetzt/entfernt und "page"
// wird zurückgesetzt, da sich die Ergebnismenge ändert.
export function CustomerSearchInput({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [value, setValue] = useState(initialQuery);
  // Verfolgt den zuletzt von außen (URL) gesehenen Wert, damit eine externe
  // Änderung (z. B. Klick auf "Alle zurücksetzen") den Eingabewert
  // aktualisiert. Die Anpassung erfolgt direkt beim Rendern statt in einem
  // Effect – so entsteht kein set-state-in-effect-Lint-Fehler und der Fokus
  // geht beim Tippen nicht verloren.
  const [prevInitialQuery, setPrevInitialQuery] = useState(initialQuery);
  if (initialQuery !== prevInitialQuery) {
    setPrevInitialQuery(initialQuery);
    setValue(initialQuery);
  }

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value === initialQuery) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = value.trim();
      if (trimmed) {
        params.set("q", trimmed);
      } else {
        params.delete("q");
      }
      params.delete("page");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // Bewusst nur auf "value" reagieren: pathname/searchParams/router werden
    // im Zeitpunkt des Timer-Ablaufs aus dem Closure gelesen, ein Re-Trigger
    // bei jeder Fremdänderung der URL ist hier nicht gewünscht.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative min-w-[220px] flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Suche nach Name, Firma, Ansprechpartner, Telefon, E-Mail, Kundennummer…"
        className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-3 text-base outline-none focus:border-brand sm:text-sm"
      />
    </div>
  );
}
