// Shared constants for the Materialverwaltung module. Kept in a plain
// module (no "use server"/"use client") so it can be imported both from
// Server Actions (actions.ts) and from Client/Server Components alike.
// Gleiches Muster wie src/lib/fleet.ts.

export const MATERIAL_CATEGORIES = [
  "rohre",
  "schlaeuche",
  "dichtungen",
  "fraeswerkzeuge",
  "duesen",
  "tv_kamera_zubehoer",
  "psa",
  "verbrauchsmaterial",
  "ersatzteile",
  "reinigungsmittel",
  "kraftstoffe",
  "sonstige",
] as const;
export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

export const MATERIAL_CATEGORY_LABELS: Record<string, string> = {
  rohre: "Rohre",
  schlaeuche: "Schläuche",
  dichtungen: "Dichtungen",
  fraeswerkzeuge: "Fräswerkzeuge",
  duesen: "Düsen",
  tv_kamera_zubehoer: "TV-Kamera-Zubehör",
  psa: "PSA (Schutzausrüstung)",
  verbrauchsmaterial: "Verbrauchsmaterial",
  ersatzteile: "Ersatzteile",
  reinigungsmittel: "Reinigungsmittel",
  kraftstoffe: "Kraftstoffe",
  sonstige: "Sonstiges",
};

export const MATERIAL_STATUSES = [
  "verfuegbar",
  "niedriger_bestand",
  "reserviert",
  "nachbestellt",
  "nicht_verfuegbar",
  "auslaufartikel",
] as const;
export type MaterialStatus = (typeof MATERIAL_STATUSES)[number];

export const MATERIAL_STATUS_LABELS: Record<string, string> = {
  verfuegbar: "Verfügbar",
  niedriger_bestand: "Niedriger Bestand",
  reserviert: "Reserviert",
  nachbestellt: "Nachbestellt",
  nicht_verfuegbar: "Nicht verfügbar",
  auslaufartikel: "Auslaufartikel",
};

export const MATERIAL_STATUS_BADGE_CLASS: Record<string, string> = {
  verfuegbar: "bg-green-50 text-green-700",
  niedriger_bestand: "bg-amber-50 text-amber-700",
  reserviert: "bg-purple-50 text-purple-700",
  nachbestellt: "bg-blue-50 text-blue-700",
  nicht_verfuegbar: "bg-red-50 text-red-700",
  auslaufartikel: "bg-gray-100 text-gray-600",
};

export const MATERIAL_STATUS_DOT_CLASS: Record<string, string> = {
  verfuegbar: "bg-green-500",
  niedriger_bestand: "bg-amber-500",
  reserviert: "bg-purple-500",
  nachbestellt: "bg-blue-500",
  nicht_verfuegbar: "bg-red-500",
  auslaufartikel: "bg-gray-400",
};

export const MOVEMENT_TYPES = ["wareneingang", "entnahme", "rueckgabe", "umlagerung", "inventur"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  wareneingang: "Wareneingang",
  entnahme: "Entnahme",
  rueckgabe: "Rückgabe",
  umlagerung: "Umlagerung",
  inventur: "Inventuranpassung",
};

export const MATERIAL_DOCUMENT_CATEGORIES = [
  "datenblatt",
  "sicherheitsdatenblatt",
  "bedienungsanleitung",
  "lieferanteninformation",
  "rechnung",
  "sonstiges",
] as const;
export type MaterialDocumentCategory = (typeof MATERIAL_DOCUMENT_CATEGORIES)[number];

export const MATERIAL_DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  datenblatt: "Datenblatt",
  sicherheitsdatenblatt: "Sicherheitsdatenblatt",
  bedienungsanleitung: "Bedienungsanleitung",
  lieferanteninformation: "Lieferanteninformation",
  rechnung: "Rechnung",
  sonstiges: "Sonstiges",
};

export const RESERVATION_TARGET_TYPES = ["fahrzeug", "mitarbeiter"] as const;
export type ReservationTargetType = (typeof RESERVATION_TARGET_TYPES)[number];

export const RESERVATION_TARGET_TYPE_LABELS: Record<string, string> = {
  fahrzeug: "Fahrzeug",
  mitarbeiter: "Mitarbeiter",
};

/** Verfügbare Menge = Bestand abzüglich aller offenen Reservierungen. */
export function availableQuantity(quantity: number, reservedQuantity: number): number {
  return Math.max(0, quantity - reservedQuantity);
}

export function isLowStock(quantity: number, minQuantity: number | null): boolean {
  if (minQuantity === null) return false;
  return quantity > 0 && quantity <= minQuantity;
}

export function isOutOfStock(quantity: number): boolean {
  return quantity <= 0;
}

/**
 * Schlägt eine sinnvolle Nachbestellmenge vor: auffüllen auf das Doppelte
 * des Mindestbestands, mindestens aber 1 Einheit über dem aktuellen Fehl.
 */
export function suggestedReorderQuantity(quantity: number, minQuantity: number | null): number | null {
  if (minQuantity === null || quantity > minQuantity) return null;
  const target = minQuantity * 2;
  return Math.max(target - quantity, minQuantity - quantity + 1);
}

export function initialsFor(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
