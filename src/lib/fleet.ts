// Shared constants for the Fahrzeug- & Maschinenverwaltung module. Kept in
// a plain module (no "use server"/"use client") so it can be imported both
// from Server Actions (actions.ts) and from Client/Server Components alike.

export const FLEET_KINDS = ["fahrzeug", "maschine"] as const;

export const FLEET_KIND_LABELS: Record<string, string> = {
  fahrzeug: "Fahrzeug",
  maschine: "Maschine",
};

export const FLEET_STATUSES = ["verfuegbar", "im_einsatz", "wartung", "defekt"] as const;

export const FLEET_STATUS_LABELS: Record<string, string> = {
  verfuegbar: "Verfügbar",
  im_einsatz: "Im Einsatz",
  wartung: "In Wartung",
  defekt: "Defekt",
};
