// Generischer Lade-Platzhalter für alle Dashboard-Seiten (siehe
// loading.tsx in den jeweiligen Routen-Ordnern). Next.js zeigt dieses
// Skelett sofort an, während die eigentliche Seite (Server-Component mit
// Supabase-Abfragen) im Hintergrund lädt – sorgt für unmittelbares
// visuelles Feedback statt eines leeren/eingefrorenen Bildschirms beim
// Navigieren. Bewusst generisch statt pro Seite individuell gestaltet.
export function PageSkeleton() {
  return (
    <div className="p-4 sm:p-6" aria-hidden="true">
      {/* Platzhalter für den Hero-Header, den fast alle Modul-Seiten haben. */}
      <div className="h-28 animate-pulse rounded-[20px] bg-card/60" />

      {/* Platzhalter für die KPI-Kachelreihe. */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-card" />
        ))}
      </div>

      {/* Platzhalter für Listen-/Tabelleninhalte. */}
      <div className="mt-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-2xl border border-border bg-card" />
        ))}
      </div>
    </div>
  );
}
