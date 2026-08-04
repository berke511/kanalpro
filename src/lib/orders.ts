// Shared constants/helpers for the Auftragsmanagement (order management)
// module. Kept in a plain module (no "use server"/"use client") so it can
// be imported both from Server Actions and from Client/Server Components.

export const ORDER_STATUSES = [
  "entwurf",
  "offen",
  "geplant",
  "disposition_ausstehend",
  "einsatzbereit",
  "in_bearbeitung",
  "pausiert",
  "abschluss_ausstehend",
  "abgeschlossen",
  "storniert",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Beibehalten für Rückwärtskompatibilität (bestehende Importe erwarten
// diesen Namen) – enthält jetzt das vollständige, professionelle Status-Set.
export const STATUS_LABELS: Record<string, string> = {
  entwurf: "Entwurf",
  offen: "Offen",
  geplant: "Geplant",
  disposition_ausstehend: "Disposition ausstehend",
  einsatzbereit: "Einsatzbereit",
  in_bearbeitung: "In Bearbeitung",
  pausiert: "Pausiert",
  abschluss_ausstehend: "Abschluss ausstehend",
  abgeschlossen: "Abgeschlossen",
  storniert: "Storniert",
};

export const ORDER_STATUS_BADGE_CLASS: Record<string, string> = {
  entwurf: "bg-gray-100 text-gray-600",
  offen: "bg-blue-50 text-blue-700",
  geplant: "bg-indigo-50 text-indigo-700",
  disposition_ausstehend: "bg-amber-50 text-amber-700",
  einsatzbereit: "bg-cyan-50 text-cyan-700",
  in_bearbeitung: "bg-violet-50 text-violet-700",
  pausiert: "bg-orange-50 text-orange-700",
  abschluss_ausstehend: "bg-amber-50 text-amber-700",
  abgeschlossen: "bg-green-50 text-green-700",
  storniert: "bg-red-50 text-red-700",
};

export const ORDER_PRIORITIES = ["standard", "zeitkritisch", "notfall"] as const;
export type OrderPriority = (typeof ORDER_PRIORITIES)[number];

export const ORDER_PRIORITY_LABELS: Record<string, string> = {
  standard: "Standard",
  zeitkritisch: "Zeitkritisch",
  notfall: "Notfall",
};

// Bewusst dezent gehalten (keine kräftigen Signalfarben) – siehe Vorgabe.
export const ORDER_PRIORITY_BADGE_CLASS: Record<string, string> = {
  standard: "bg-gray-100 text-gray-600",
  zeitkritisch: "bg-amber-50 text-amber-700",
  notfall: "bg-red-50 text-red-700",
};

export const ORDER_KINDS = [
  "rohrreinigung",
  "kanalreinigung",
  "tv_inspektion",
  "dichtheitspruefung",
  "fraesarbeiten",
  "ortung",
  "notdienst",
  "sanierung",
  "schachtreinigung",
  "sinkkastenreinigung",
  "pumpwerk",
  "sonstige",
] as const;
export type OrderKind = (typeof ORDER_KINDS)[number];

export const ORDER_KIND_LABELS: Record<string, string> = {
  rohrreinigung: "Rohrreinigung",
  kanalreinigung: "Kanalreinigung",
  tv_inspektion: "TV-Inspektion",
  dichtheitspruefung: "Dichtheitsprüfung",
  fraesarbeiten: "Fräsarbeiten",
  ortung: "Ortung",
  notdienst: "Notdienst",
  sanierung: "Sanierung",
  schachtreinigung: "Schachtreinigung",
  sinkkastenreinigung: "Sinkkastenreinigung",
  pumpwerk: "Pumpwerk",
  sonstige: "Sonstige",
};

// Farbcodierung nach Auftragsart – für die Einsatzplanung (Kalenderkarten:
// linker Rand + Punkt) und überall sonst, wo Aufträge nach Art statt nach
// Status eingefärbt werden sollen. Bewusst als eigenes Mapping getrennt von
// ORDER_STATUS_BADGE_CLASS/ORDER_PRIORITY_BADGE_CLASS.
export const ORDER_KIND_COLOR: Record<string, { dot: string; border: string; bg: string; text: string }> = {
  rohrreinigung: { dot: "bg-emerald-500", border: "border-l-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  kanalreinigung: { dot: "bg-green-500", border: "border-l-green-500", bg: "bg-green-50", text: "text-green-700" },
  tv_inspektion: { dot: "bg-purple-500", border: "border-l-purple-500", bg: "bg-purple-50", text: "text-purple-700" },
  dichtheitspruefung: { dot: "bg-blue-500", border: "border-l-blue-500", bg: "bg-blue-50", text: "text-blue-700" },
  fraesarbeiten: { dot: "bg-amber-500", border: "border-l-amber-500", bg: "bg-amber-50", text: "text-amber-700" },
  ortung: { dot: "bg-cyan-500", border: "border-l-cyan-500", bg: "bg-cyan-50", text: "text-cyan-700" },
  notdienst: { dot: "bg-red-500", border: "border-l-red-500", bg: "bg-red-50", text: "text-red-700" },
  sanierung: { dot: "bg-pink-500", border: "border-l-pink-500", bg: "bg-pink-50", text: "text-pink-700" },
  schachtreinigung: { dot: "bg-teal-500", border: "border-l-teal-500", bg: "bg-teal-50", text: "text-teal-700" },
  sinkkastenreinigung: { dot: "bg-lime-500", border: "border-l-lime-500", bg: "bg-lime-50", text: "text-lime-700" },
  pumpwerk: { dot: "bg-orange-500", border: "border-l-orange-500", bg: "bg-orange-50", text: "text-orange-700" },
  sonstige: { dot: "bg-gray-400", border: "border-l-gray-400", bg: "bg-gray-50", text: "text-gray-600" },
};

// Anzeige-Labels für die Aktionen im Auftrags-Audit-Log (order_audit_log.action,
// siehe Migration 0019_orders_foundation.sql) – gemeinsam genutzt vom
// Aktivitäten-Tab und der "Letzte Aktivität"-Anzeige im Detailpanel.
export const ORDER_AUDIT_ACTION_LABELS: Record<string, string> = {
  created: "Auftrag erstellt",
  updated: "Auftrag aktualisiert",
  status_changed: "Status geändert",
  assigned: "Mitarbeiter zugewiesen",
  unassigned: "Mitarbeiter entfernt",
  resource_assigned: "Fahrzeug/Maschine zugewiesen",
  resource_unassigned: "Fahrzeug/Maschine entfernt",
  material_added: "Material hinzugefügt",
  document_uploaded: "Dokument hochgeladen",
  note_added: "Notiz hinzugefügt",
  archived: "Archiviert",
  unarchived: "Dearchiviert",
  deleted: "Gelöscht",
};

// Statuswerte, die einen laufenden bzw. bereits gestarteten Einsatz
// kennzeichnen (für "Einsatz begonnen"-Fortschrittsschritt und KPIs).
export const IN_PROGRESS_STATUSES: readonly string[] = [
  "in_bearbeitung",
  "pausiert",
  "abschluss_ausstehend",
];

/**
 * Die 7 Prozessschritte, aus denen sich der Auftragsfortschritt
 * zusammensetzt (siehe Vorgabe "Fortschritt"). Reihenfolge = Anzeigereihenfolge.
 */
export const ORDER_PROGRESS_STEP_DEFS = [
  { key: "created", label: "Auftrag erstellt" },
  { key: "resources_assigned", label: "Ressourcen zugewiesen" },
  { key: "started", label: "Einsatz begonnen" },
  { key: "documentation_completed", label: "Dokumentation abgeschlossen" },
  { key: "signature_captured", label: "Kundenunterschrift erfasst" },
  { key: "report_created", label: "Abschlussbericht erstellt" },
  { key: "completed", label: "Auftrag abgeschlossen" },
] as const;

export type OrderProgressStepKey = (typeof ORDER_PROGRESS_STEP_DEFS)[number]["key"];

export type OrderProgressStep = {
  key: OrderProgressStepKey;
  label: string;
  done: boolean;
  timestamp: string | null;
};

export type OrderProgressInput = {
  createdAt: string;
  status: string;
  hasResources: boolean; // mind. 1 zugewiesener Mitarbeiter ODER Fahrzeug/Maschine
  resourcesAssignedAt: string | null;
  startedAt: string | null;
  documentationCompletedAt: string | null;
  firstReportAt: string | null; // frühester Einsatz-/Abschlussbericht
  signedAt: string | null; // früheste Kundenunterschrift über alle Berichte
  completedAt: string | null;
};

/**
 * Berechnet den Auftragsfortschritt (0–100 %) und den Status jedes
 * einzelnen Prozessschritts anhand echter Auftragsdaten – bewusst ohne
 * eigene "Checkliste"-Tabelle, sondern aus vorhandenen/neuen Zeitstempeln
 * und verknüpften Datensätzen abgeleitet (siehe Migration
 * 0019_orders_foundation.sql).
 */
export function computeOrderProgress(input: OrderProgressInput): {
  percent: number;
  steps: OrderProgressStep[];
} {
  const started = Boolean(input.startedAt) || IN_PROGRESS_STATUSES.includes(input.status) || input.status === "abgeschlossen";
  const completed = input.status === "abgeschlossen";

  const steps: OrderProgressStep[] = [
    { key: "created", label: "Auftrag erstellt", done: true, timestamp: input.createdAt },
    {
      key: "resources_assigned",
      label: "Ressourcen zugewiesen",
      done: input.hasResources,
      timestamp: input.hasResources ? input.resourcesAssignedAt : null,
    },
    {
      key: "started",
      label: "Einsatz begonnen",
      done: started,
      timestamp: input.startedAt,
    },
    {
      key: "documentation_completed",
      label: "Dokumentation abgeschlossen",
      done: Boolean(input.documentationCompletedAt),
      timestamp: input.documentationCompletedAt,
    },
    {
      key: "signature_captured",
      label: "Kundenunterschrift erfasst",
      done: Boolean(input.signedAt),
      timestamp: input.signedAt,
    },
    {
      key: "report_created",
      label: "Abschlussbericht erstellt",
      done: Boolean(input.firstReportAt),
      timestamp: input.firstReportAt,
    },
    {
      key: "completed",
      label: "Auftrag abgeschlossen",
      done: completed,
      timestamp: input.completedAt,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const percent = Math.round((doneCount / steps.length) * 100);

  return { percent, steps };
}
