// Gemeinsame Konstanten/Helfer für die Angebots-/Rechnungsverwaltung.
// Beide Dokumenttypen leben in derselben `invoices`-Tabelle (Spalte
// `kind`), haben aber bewusst unterschiedliche, branchenübliche
// Status-Sets – siehe 0027_angebote_rechnungen.sql. Kein "use server"/
// "use client", damit die Datei sowohl von Server Actions als auch von
// Client-/Server-Components importiert werden kann (gleiches Muster wie
// src/lib/materials.ts, src/lib/reports.ts).

export const INVOICE_KINDS = ["angebot", "rechnung"] as const;
export type InvoiceKind = (typeof INVOICE_KINDS)[number];

export const INVOICE_KIND_LABELS: Record<string, string> = {
  angebot: "Angebot",
  rechnung: "Rechnung",
};

export const QUOTE_STATUSES = ["entwurf", "versendet", "in_pruefung", "angenommen", "abgelehnt", "abgelaufen"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const INVOICE_STATUSES = ["entwurf", "offen", "teilbezahlt", "bezahlt", "ueberfaellig", "storniert"] as const;
export type BillStatus = (typeof INVOICE_STATUSES)[number];

export function statusesForKind(kind: string): readonly string[] {
  return kind === "angebot" ? QUOTE_STATUSES : INVOICE_STATUSES;
}

// Alle Status kombiniert (für Filter, die kind-übergreifend anzeigen).
export const ALL_STATUSES = Array.from(new Set<string>([...QUOTE_STATUSES, ...INVOICE_STATUSES]));

export const STATUS_LABELS: Record<string, string> = {
  entwurf: "Entwurf",
  versendet: "Versendet",
  in_pruefung: "In Prüfung",
  angenommen: "Angenommen",
  abgelehnt: "Abgelehnt",
  abgelaufen: "Abgelaufen",
  offen: "Offen",
  teilbezahlt: "Teilbezahlt",
  bezahlt: "Bezahlt",
  ueberfaellig: "Überfällig",
  storniert: "Storniert",
};

// Farbschema wie vorgegeben: Grau/Blau/Gelb/Grün/Rot/Orange, in dieser
// Reihenfolge auf beide Status-Listen angewendet (Position 1–6).
export const STATUS_BADGE_CLASS: Record<string, string> = {
  entwurf: "bg-gray-100 text-gray-600",
  versendet: "bg-blue-50 text-blue-700",
  in_pruefung: "bg-amber-50 text-amber-700",
  angenommen: "bg-green-50 text-green-700",
  abgelehnt: "bg-red-50 text-red-700",
  abgelaufen: "bg-orange-50 text-orange-700",
  offen: "bg-blue-50 text-blue-700",
  teilbezahlt: "bg-amber-50 text-amber-700",
  bezahlt: "bg-green-50 text-green-700",
  ueberfaellig: "bg-red-50 text-red-700",
  storniert: "bg-orange-50 text-orange-700",
};

export const STATUS_DOT_CLASS: Record<string, string> = {
  entwurf: "bg-gray-400",
  versendet: "bg-blue-500",
  in_pruefung: "bg-amber-500",
  angenommen: "bg-green-500",
  abgelehnt: "bg-red-500",
  abgelaufen: "bg-orange-500",
  offen: "bg-blue-500",
  teilbezahlt: "bg-amber-500",
  bezahlt: "bg-green-500",
  ueberfaellig: "bg-red-500",
  storniert: "bg-orange-500",
};

// Status, in denen ein Angebot noch auf eine Kundenentscheidung wartet.
export const QUOTE_PENDING_STATUSES: readonly string[] = ["versendet", "in_pruefung"];
// Status, in denen eine Rechnung noch (teilweise) offen ist.
export const BILL_OPEN_STATUSES: readonly string[] = ["offen", "teilbezahlt"];

export const PAYMENT_METHODS = ["ueberweisung", "lastschrift", "bar", "kreditkarte", "paypal", "sonstige"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  ueberweisung: "Überweisung",
  lastschrift: "Lastschrift",
  bar: "Bar",
  kreditkarte: "Kreditkarte",
  paypal: "PayPal",
  sonstige: "Sonstige",
};

export const DUNNING_LABELS: Record<number, string> = {
  0: "Keine Mahnung",
  1: "1. Mahnung",
  2: "2. Mahnung",
  3: "3. Mahnung / Inkasso",
};

/**
 * Es gibt in diesem Projekt keine Hintergrundjobs/Cron, die den
 * gespeicherten Status automatisch auf "ueberfaellig"/"abgelaufen"
 * umschalten könnten (anders als z. B. bei TÜV-Erinnerungen, die beim
 * nächsten Seitenaufruf per RPC nachgezogen werden). Für Anzeige/KPIs
 * wird der "wirksame" Status daher zur Anzeigezeit berechnet, ohne den in
 * der DB gespeicherten Wert zu verändern: eine offene/teilbezahlte
 * Rechnung nach Fälligkeitsdatum gilt als überfällig, ein versendetes/in
 * Prüfung befindliches Angebot nach Ablaufdatum als abgelaufen.
 */
export function effectiveStatus(params: {
  kind: string;
  status: string;
  dueDate: string | null;
  validUntil: string | null;
  todayISO: string;
}): string {
  const { kind, status, dueDate, validUntil, todayISO } = params;
  if (kind === "rechnung" && BILL_OPEN_STATUSES.includes(status) && dueDate && dueDate < todayISO) {
    return "ueberfaellig";
  }
  if (kind === "angebot" && QUOTE_PENDING_STATUSES.includes(status) && validUntil && validUntil < todayISO) {
    return "abgelaufen";
  }
  return status;
}

export function isBillOverdue(status: string, dueDate: string | null, todayISO: string): boolean {
  return BILL_OPEN_STATUSES.includes(status) && !!dueDate && dueDate < todayISO;
}

export function isQuoteExpired(status: string, validUntil: string | null, todayISO: string): boolean {
  return QUOTE_PENDING_STATUSES.includes(status) && !!validUntil && validUntil < todayISO;
}

/** Tage zwischen zwei YYYY-MM-DD-Daten (b - a), positiv wenn b nach a liegt. */
export function daysBetweenISO(aISO: string, bISO: string): number {
  const a = new Date(`${aISO}T00:00:00Z`).getTime();
  const b = new Date(`${bISO}T00:00:00Z`).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export type InvoiceItemLike = { quantity: number; unit_price: number };

export function calculateNetTotal(items: InvoiceItemLike[]): number {
  return items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0);
}

export function calculateTotals(items: InvoiceItemLike[], taxRatePercent: number) {
  const net = calculateNetTotal(items);
  const tax = net * (taxRatePercent / 100);
  return { net, tax, gross: net + tax };
}

export function initialsFor(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
