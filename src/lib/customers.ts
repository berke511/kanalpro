export const CUSTOMER_KINDS = ["privat", "gewerbe", "industrie", "kommune", "sonstige"] as const;
export type CustomerKind = (typeof CUSTOMER_KINDS)[number];

export const CUSTOMER_KIND_LABELS: Record<string, string> = {
  privat: "Privat",
  gewerbe: "Gewerbe",
  industrie: "Industrie",
  kommune: "Kommune",
  sonstige: "Sonstige",
};

// Kundenarten, bei denen Unternehmensfelder (Firmenname, Rechtsform, ...)
// angezeigt und erfasst werden.
export const COMPANY_KINDS = ["gewerbe", "industrie", "kommune", "sonstige"];

export const CUSTOMER_STATUSES = ["interessent", "aktiv", "inaktiv", "gesperrt"] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  interessent: "Interessent",
  aktiv: "Aktiv",
  inaktiv: "Inaktiv",
  gesperrt: "Gesperrt",
};

export const CUSTOMER_STATUS_BADGE_CLASS: Record<string, string> = {
  interessent: "bg-amber-50 text-amber-700",
  aktiv: "bg-green-50 text-green-700",
  inaktiv: "bg-gray-100 text-gray-600",
  gesperrt: "bg-red-50 text-red-700",
};

// Farbiger Punkt je Status, z. B. für Chips/Auswahl und Listenansichten.
export const CUSTOMER_STATUS_DOT_CLASS: Record<string, string> = {
  interessent: "bg-amber-400",
  aktiv: "bg-green-500",
  inaktiv: "bg-gray-400",
  gesperrt: "bg-red-500",
};

// Slots für die Pflichtfeld-Fortschrittsanzeige im Formular. "hard" wird beim
// Speichern serverseitig erzwungen (siehe actions.ts), "soft" ist empfohlen,
// aber nicht blockierend – zählt trotzdem in den Fortschritt.
export const CUSTOMER_REQUIRED_FIELD_SLOTS: Array<{
  key: string;
  label: string;
  hard: boolean;
  fieldNames: string[];
}> = [
  { key: "kind", label: "Kundenart", hard: true, fieldNames: ["kind"] },
  { key: "status", label: "Status", hard: true, fieldNames: ["status"] },
  { key: "name", label: "Name", hard: true, fieldNames: ["first_name", "last_name", "company_name"] },
  { key: "contact", label: "Kontakt (E-Mail oder Telefon)", hard: false, fieldNames: ["email", "phone"] },
  { key: "street", label: "Straße", hard: false, fieldNames: ["street"] },
  { key: "postal_code", label: "PLZ", hard: false, fieldNames: ["postal_code"] },
  { key: "city", label: "Ort", hard: false, fieldNames: ["city"] },
];

export function isCompanyKind(kind: string) {
  return COMPANY_KINDS.includes(kind);
}

export function customerDisplayName(fields: {
  kind: string;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
}) {
  if (isCompanyKind(fields.kind)) {
    return (fields.company_name ?? "").trim() || "Unbenannter Kunde";
  }
  const full = `${fields.first_name ?? ""} ${fields.last_name ?? ""}`.trim();
  return full || "Unbenannter Kunde";
}

/**
 * Best-effort Geokodierung über die öffentliche Nominatim-API (OpenStreetMap).
 * Läuft serverseitig, blockiert das Speichern nicht: Fehler/Timeouts werden
 * abgefangen und führen lediglich dazu, dass keine Koordinaten gesetzt werden.
 */
export async function geocodeAddress(address: {
  street?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
}): Promise<{ latitude: number; longitude: number } | null> {
  const parts = [address.street, address.postal_code, address.city, address.country ?? "Deutschland"]
    .filter((p) => p && p.trim().length > 0)
    .join(", ");

  if (!address.street || !address.city) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(parts)}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "KanalPro/1.0 (Adressgeokodierung)" },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const results = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!results.length) return null;

    const lat = Number(results[0].lat);
    const lon = Number(results[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return null;

    return { latitude: lat, longitude: lon };
  } catch {
    return null;
  }
}
