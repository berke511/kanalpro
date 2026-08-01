"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Lädt die aktuelle Server-Komponente periodisch neu (statt eines echten
 * Realtime-Kanals), damit neue Nachrichten von Kollegen ohne manuelles
 * Neuladen der Seite auftauchen. Bewusst einfach gehalten, konsistent mit
 * dem übrigen "Server Actions + Reload"-Muster der App.
 */
export function ChatAutoRefresh({ intervalMs = 4000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
