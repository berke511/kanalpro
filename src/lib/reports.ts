// Shared constants for the Einsatzberichte module. Kept in a plain module
// (no "use server"/"use client") so it can be imported both from Server
// Actions (actions.ts) and from Client/Server Components alike. Gleiches
// Muster wie src/lib/materials.ts / src/lib/fleet.ts.

export const REPORT_STATUSES = [
  "entwurf",
  "in_bearbeitung",
  "zur_pruefung",
  "unterschrieben",
  "abgeschlossen",
  "archiviert",
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_STATUS_LABELS: Record<string, string> = {
  entwurf: "Entwurf",
  in_bearbeitung: "In Bearbeitung",
  zur_pruefung: "Zur Prüfung",
  unterschrieben: "Unterschrieben",
  abgeschlossen: "Abgeschlossen",
  archiviert: "Archiviert",
};

export const REPORT_STATUS_BADGE_CLASS: Record<string, string> = {
  entwurf: "bg-gray-100 text-gray-600",
  in_bearbeitung: "bg-blue-50 text-blue-700",
  zur_pruefung: "bg-amber-50 text-amber-700",
  unterschrieben: "bg-purple-50 text-purple-700",
  abgeschlossen: "bg-green-50 text-green-700",
  archiviert: "bg-gray-100 text-gray-500",
};

export const REPORT_STATUS_DOT_CLASS: Record<string, string> = {
  entwurf: "bg-gray-400",
  in_bearbeitung: "bg-blue-500",
  zur_pruefung: "bg-amber-500",
  unterschrieben: "bg-purple-500",
  abgeschlossen: "bg-green-500",
  archiviert: "bg-gray-300",
};

export const WORK_TYPES = [
  "kanalreinigung",
  "tv_inspektion",
  "dichtheitspruefung",
  "fraesarbeiten",
  "spuelarbeiten",
  "reparatur",
  "sanierung",
  "sonstige",
] as const;
export type WorkType = (typeof WORK_TYPES)[number];

export const WORK_TYPE_LABELS: Record<string, string> = {
  kanalreinigung: "Kanalreinigung",
  tv_inspektion: "TV-Inspektion",
  dichtheitspruefung: "Dichtheitsprüfung",
  fraesarbeiten: "Fräsarbeiten",
  spuelarbeiten: "Spülarbeiten",
  reparatur: "Reparatur",
  sanierung: "Sanierung",
  sonstige: "Sonstige",
};

export const REPORT_PHOTO_CATEGORIES = ["vorher", "nachher", "schaden", "baustelle"] as const;
export type ReportPhotoCategory = (typeof REPORT_PHOTO_CATEGORIES)[number];

export const REPORT_PHOTO_CATEGORY_LABELS: Record<string, string> = {
  vorher: "Vorher",
  nachher: "Nachher",
  schaden: "Schaden",
  baustelle: "Baustelle",
};

// Vorlagen für häufige Einsatzarten – befüllt Schritt 3 (Durchgeführte
// Arbeiten) im Assistenten mit sinnvollen Vorbelegungen, damit wiederkehrende
// Einsätze schneller dokumentiert werden können.
export const REPORT_TEMPLATES: { key: string; label: string; workTypes: WorkType[]; workPerformed: string }[] = [
  {
    key: "kanalreinigung_standard",
    label: "Kanalreinigung (Standard)",
    workTypes: ["kanalreinigung", "spuelarbeiten"],
    workPerformed: "Kanalleitung mit Hochdruck gespült und gereinigt. Ablagerungen entfernt, Durchfluss geprüft.",
  },
  {
    key: "tv_inspektion_standard",
    label: "TV-Inspektion (Standard)",
    workTypes: ["tv_inspektion"],
    workPerformed: "Kanalleitung mit TV-Kamera befahren und dokumentiert. Schäden und Zustand protokolliert.",
  },
  {
    key: "dichtheitspruefung_standard",
    label: "Dichtheitsprüfung (Standard)",
    workTypes: ["dichtheitspruefung"],
    workPerformed: "Dichtheitsprüfung der Leitung nach DIN durchgeführt und protokolliert.",
  },
  {
    key: "notdienst_verstopfung",
    label: "Notdienst – Verstopfung",
    workTypes: ["kanalreinigung", "reparatur"],
    workPerformed: "Akute Verstopfung beseitigt, Leitung gespült und Funktion wiederhergestellt.",
  },
];

export function calculateWorkedMinutes(
  startTime: string | null,
  endTime: string | null,
  breakMinutes: number | null,
): number | null {
  if (!startTime || !endTime) return null;
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  if (startH === undefined || startM === undefined || endH === undefined || endM === undefined) return null;
  let minutes = endH * 60 + endM - (startH * 60 + startM);
  if (minutes < 0) minutes += 24 * 60;
  minutes -= breakMinutes ?? 0;
  return Math.max(0, minutes);
}

export function formatMinutesAsHours(minutes: number | null): string {
  if (minutes === null) return "–";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function initialsFor(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
