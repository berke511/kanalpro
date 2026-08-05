// Shared constants for the Fahrzeug- & Maschinenverwaltung module. Kept in
// a plain module (no "use server"/"use client") so it can be imported both
// from Server Actions (actions.ts) and from Client/Server Components alike.
// Gleiches Muster wie src/lib/employees.ts.

export const FLEET_KINDS = ["fahrzeug", "maschine"] as const;
export type FleetKind = (typeof FLEET_KINDS)[number];

export const FLEET_KIND_LABELS: Record<string, string> = {
  fahrzeug: "Fahrzeug",
  maschine: "Maschine",
};

export const FLEET_STATUSES = [
  "verfuegbar",
  "im_einsatz",
  "reserviert",
  "wartung",
  "werkstatt",
  "defekt",
  "ausser_betrieb",
] as const;
export type FleetStatus = (typeof FLEET_STATUSES)[number];

export const FLEET_STATUS_LABELS: Record<string, string> = {
  verfuegbar: "Verfügbar",
  im_einsatz: "Im Einsatz",
  reserviert: "Reserviert",
  wartung: "Wartung",
  werkstatt: "Werkstatt",
  defekt: "Defekt",
  ausser_betrieb: "Außer Betrieb",
};

export const FLEET_STATUS_BADGE_CLASS: Record<string, string> = {
  verfuegbar: "bg-green-50 text-green-700",
  im_einsatz: "bg-blue-50 text-blue-700",
  reserviert: "bg-purple-50 text-purple-700",
  wartung: "bg-amber-50 text-amber-700",
  werkstatt: "bg-orange-50 text-orange-700",
  defekt: "bg-red-50 text-red-700",
  ausser_betrieb: "bg-gray-100 text-gray-600",
};

export const FLEET_STATUS_DOT_CLASS: Record<string, string> = {
  verfuegbar: "bg-green-500",
  im_einsatz: "bg-blue-500",
  reserviert: "bg-purple-500",
  wartung: "bg-amber-500",
  werkstatt: "bg-orange-500",
  defekt: "bg-red-500",
  ausser_betrieb: "bg-gray-400",
};

export const OWNERSHIP_TYPES = ["eigentum", "leasing"] as const;
export const OWNERSHIP_LABELS: Record<string, string> = {
  eigentum: "Eigentum",
  leasing: "Leasing",
};

export const FUEL_TYPES = ["diesel", "benzin", "elektro", "hybrid", "gas", "sonstige"] as const;
export const FUEL_TYPE_LABELS: Record<string, string> = {
  diesel: "Diesel",
  benzin: "Benzin",
  elektro: "Elektro",
  hybrid: "Hybrid",
  gas: "Gas",
  sonstige: "Sonstige",
};

export const MAINTENANCE_RECORD_TYPES = ["wartung", "reparatur", "tuev", "uvv", "sonstige"] as const;
export const MAINTENANCE_RECORD_TYPE_LABELS: Record<string, string> = {
  wartung: "Wartung",
  reparatur: "Reparatur",
  tuev: "TÜV-Prüfung",
  uvv: "UVV-Prüfung",
  sonstige: "Sonstiges",
};

export const FLEET_COST_CATEGORIES = ["kraftstoff", "versicherung", "leasing", "sonstige"] as const;
export const FLEET_COST_CATEGORY_LABELS: Record<string, string> = {
  kraftstoff: "Kraftstoff",
  versicherung: "Versicherung",
  leasing: "Leasing",
  sonstige: "Sonstige",
};

export const FLEET_DOCUMENT_CATEGORIES = [
  "fahrzeugschein",
  "versicherung",
  "leasingvertrag",
  "tuev_bericht",
  "uvv_pruefung",
  "wartungsnachweis",
  "bedienungsanleitung",
  "rechnung",
  "sonstiges",
] as const;
export const FLEET_DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  fahrzeugschein: "Fahrzeugschein",
  versicherung: "Versicherung",
  leasingvertrag: "Leasingvertrag",
  tuev_bericht: "TÜV-Bericht",
  uvv_pruefung: "UVV-Prüfung",
  wartungsnachweis: "Wartungsnachweis",
  bedienungsanleitung: "Bedienungsanleitung",
  rechnung: "Rechnung",
  sonstiges: "Sonstiges",
};

/** Tage bis zum Zieldatum (negativ = bereits abgelaufen). */
export function daysUntil(dateISO: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateISO}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function isDueSoon(dateISO: string | null, withinDays = 30): boolean {
  if (!dateISO) return false;
  return daysUntil(dateISO) <= withinDays;
}

export function isOverdue(dateISO: string | null): boolean {
  if (!dateISO) return false;
  return daysUntil(dateISO) < 0;
}

/** Fortschritt (0-100) seit der letzten bis zur nächsten Wartung, für den Fortschrittsbalken. */
export function maintenanceProgress(lastISO: string | null, nextISO: string | null): number | null {
  if (!nextISO) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = new Date(`${nextISO}T00:00:00`);
  const last = lastISO ? new Date(`${lastISO}T00:00:00`) : null;
  if (!last) {
    // Ohne bekanntes letztes Datum: nur "läuft bald ab" grob anhand 90-Tage-Fenster einschätzen.
    const days = Math.round((next.getTime() - today.getTime()) / 86_400_000);
    return Math.max(0, Math.min(100, 100 - (days / 90) * 100));
  }
  const total = next.getTime() - last.getTime();
  if (total <= 0) return 100;
  const elapsed = today.getTime() - last.getTime();
  return Math.max(0, Math.min(100, (elapsed / total) * 100));
}

export function initialsFor(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
