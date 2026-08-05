// Konstanten & kleine Hilfsfunktionen für die Mitarbeiterverwaltung –
// gleiches Muster wie src/lib/orders.ts (Label-Maps, Badge-Farben, keine
// Server-/Client-spezifische Logik, damit die Datei überall importiert
// werden kann).

export const EMPLOYEE_STATUSES = [
  "verfuegbar",
  "einsatz",
  "urlaub",
  "krank",
  "fortbildung",
  "feierabend",
] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  verfuegbar: "Verfügbar",
  einsatz: "Im Einsatz",
  urlaub: "Urlaub",
  krank: "Krank",
  fortbildung: "Fortbildung",
  feierabend: "Feierabend",
};

export const EMPLOYEE_STATUS_BADGE_CLASS: Record<string, string> = {
  verfuegbar: "bg-green-50 text-green-700",
  einsatz: "bg-blue-50 text-blue-700",
  urlaub: "bg-amber-50 text-amber-700",
  krank: "bg-red-50 text-red-700",
  fortbildung: "bg-purple-50 text-purple-700",
  feierabend: "bg-gray-100 text-gray-600",
};

export const EMPLOYEE_STATUS_DOT_CLASS: Record<string, string> = {
  verfuegbar: "bg-green-500",
  einsatz: "bg-blue-500",
  urlaub: "bg-amber-500",
  krank: "bg-red-500",
  fortbildung: "bg-purple-500",
  feierabend: "bg-gray-400",
};

export const WORK_TIME_MODELS = ["vollzeit", "teilzeit", "minijob", "werkstudent", "ausbildung"] as const;
export type WorkTimeModel = (typeof WORK_TIME_MODELS)[number];

export const WORK_TIME_MODEL_LABELS: Record<string, string> = {
  vollzeit: "Vollzeit",
  teilzeit: "Teilzeit",
  minijob: "Minijob",
  werkstudent: "Werkstudent",
  ausbildung: "Ausbildung",
};

export const QUALIFICATION_TYPES = [
  "rohrreinigung",
  "tv_inspektion",
  "kanalsanierung",
  "dichtheitspruefung",
  "fuehrerschein",
  "adr",
  "atemschutz",
  "erste_hilfe",
  "psaga",
  "gasmesstechnik",
  "sonstige",
] as const;
export type QualificationType = (typeof QUALIFICATION_TYPES)[number];

export const QUALIFICATION_TYPE_LABELS: Record<string, string> = {
  rohrreinigung: "Rohrreinigung",
  tv_inspektion: "TV-Inspektion",
  kanalsanierung: "Kanalsanierung",
  dichtheitspruefung: "Dichtheitsprüfung",
  fuehrerschein: "Führerschein",
  adr: "ADR (Gefahrgut)",
  atemschutz: "Atemschutz",
  erste_hilfe: "Erste Hilfe",
  psaga: "PSAgA (Absturzsicherung)",
  gasmesstechnik: "Gasmesstechnik",
  sonstige: "Sonstige",
};

export const DOCUMENT_CATEGORIES = [
  "arbeitsvertrag",
  "fuehrerschein",
  "zertifikat",
  "unterweisung",
  "psa_nachweis",
  "sonstiges",
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  arbeitsvertrag: "Arbeitsvertrag",
  fuehrerschein: "Führerschein",
  zertifikat: "Zertifikat",
  unterweisung: "Unterweisung",
  psa_nachweis: "PSA-Nachweis",
  sonstiges: "Weitere Dokumente",
};

/** Tage bis zum Ablaufdatum (negativ = bereits abgelaufen). */
export function daysUntil(dateISO: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateISO}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function isExpiringSoon(dateISO: string | null, withinDays = 30): boolean {
  if (!dateISO) return false;
  const days = daysUntil(dateISO);
  return days <= withinDays;
}

export function isExpired(dateISO: string | null): boolean {
  if (!dateISO) return false;
  return daysUntil(dateISO) < 0;
}

/** Kürzel für den Avatar-Platzhalter, wenn kein Foto hinterlegt ist. */
export function initialsFor(fullName: string | null): string {
  if (!fullName) return "?";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
