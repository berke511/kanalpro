// Zentrale Datums-/Zeit-Hilfsfunktionen für KanalPro.
//
// KanalPro wird ausschließlich von Unternehmen in Deutschland genutzt, die
// Server-Komponenten laufen auf Vercel jedoch standardmäßig in UTC. Ohne
// explizite Zeitzone würden Zeitstempel (z. B. "Erstellt am") in UTC statt
// in der für die Nutzer relevanten Zeitzone angezeigt, und tagesgenaue
// Berechnungen (z. B. "heute" in der Einsatzplanung) könnten rund um
// Mitternacht (MEZ/MESZ) um einen Tag danebenliegen. Alle Formatierungen
// und "heute"-Berechnungen laufen daher zentral über diese Datei und sind
// fest auf Europe/Berlin gepinnt.
const TIME_ZONE = "Europe/Berlin";

/**
 * Formatiert einen Zeitstempel (z. B. eine `timestamptz`-Spalte wie
 * `created_at`, `updated_at`, `signed_at`) als deutsches Datum inkl.
 * Uhrzeit in der Zeitzone Europe/Berlin.
 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TIME_ZONE,
  });
}

/**
 * Formatiert ein reines Datum (z. B. eine `date`-Spalte wie
 * `scheduled_date`, `issue_date`, `due_date`, `report_date`) als
 * TT.MM.JJJJ. Diese Spalten enthalten keine Uhrzeit/Zeitzone – der Wert
 * wird deshalb direkt aus dem ISO-String (`YYYY-MM-DD`) gebildet, ohne
 * über ein `Date`-Objekt (und damit eine Zeitzonen-Umrechnung) zu gehen,
 * damit sich das angezeigte Kalenderdatum niemals verschiebt.
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    const [, year, month, day] = match;
    return `${day}.${month}.${year}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("de-DE", { timeZone: TIME_ZONE });
}

/**
 * Liefert das heutige Kalenderdatum in der Zeitzone Europe/Berlin als
 * `YYYY-MM-DD`. Bewusst NICHT `new Date().toISOString().slice(0, 10)`,
 * da das den UTC-Tag liefert – in den ersten ein bis zwei Stunden nach
 * Mitternacht Berliner Zeit wäre das noch der Vortag.
 */
export function todayBerlinISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

/**
 * Baut aus einem `YYYY-MM-DD`-Kalenderdatum ein `Date`-Objekt für reine
 * Datums-Arithmetik (z. B. Wochenberechnung in der Einsatzplanung). Das
 * Objekt wird bewusst auf UTC-Mitternacht verankert, damit
 * Tagesberechnungen (`setUTCDate`, `getUTCDay`, …) unabhängig von der
 * Zeitzone des ausführenden Prozesses immer dasselbe Kalenderdatum
 * ergeben.
 */
export function dateFromISO(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
}

/** Aktuelles Jahr in der Zeitzone Europe/Berlin, z. B. für Copyright-Footer. */
export function currentBerlinYear(): number {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric" }).format(new Date()));
}

/**
 * Formatiert eine reine `time`-Spalte (z. B. `orders.start_time`, Format
 * `HH:MM:SS` aus Postgres) als `HH:MM`. Keine Zeitzonenumrechnung nötig,
 * da `time` (ohne "with time zone") keine Zeitzoneninformation trägt.
 */
export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const match = /^(\d{2}):(\d{2})/.exec(value);
  return match ? `${match[1]}:${match[2]}` : value;
}

/**
 * Gestriges Kalenderdatum in Europe/Berlin als `YYYY-MM-DD` – für
 * Tag-über-Tag-Vergleiche bei KPI-Kacheln (z. B. "Heute" vs. "Gestern").
 */
export function yesterdayBerlinISO(): string {
  const [y, m, d] = todayBerlinISO().split("-").map(Number);
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, (d ?? 1) - 1));
  return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(date);
}

/**
 * Start (inklusiv) und Ende (exklusiv) eines Kalendermonats in
 * Europe/Berlin als `YYYY-MM-DD`, für KPI-Vormonatsvergleiche.
 * `offsetMonths = 0` ist der aktuelle Monat, `-1` der Vormonat.
 */
export function monthRangeBerlin(offsetMonths: number): { start: string; end: string } {
  const [y, m] = todayBerlinISO().split("-").map(Number);
  const startDate = new Date(Date.UTC(y, (m ?? 1) - 1 + offsetMonths, 1));
  const endDate = new Date(Date.UTC(y, (m ?? 1) + offsetMonths, 1));
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" });
  return { start: fmt.format(startDate), end: fmt.format(endDate) };
}
