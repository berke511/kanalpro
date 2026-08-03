// Rollenmodell für KanalPro. Bisher gab es nur owner/admin/mitarbeiter; für
// die Auftragsverwaltung wurde das Set um die branchenüblichen Rollen
// Geschäftsführer/Büro/Disponent/Techniker erweitert (siehe Migration
// 0019_orders_foundation.sql). "owner" bleibt zusätzlich bestehen
// (Firmenersteller, tief im Registrierungs-Bootstrap verankert) und hat
// dieselben vollen Rechte wie Admin/Geschäftsführer.
export const ROLES = ["owner", "admin", "geschaeftsfuehrer", "buero", "disponent", "techniker"] as const;
export type Role = (typeof ROLES)[number];

// Rollen, die per Einladungslink vergeben werden können (kein "owner" –
// davon gibt es je Unternehmen nur den Ersteller).
export const INVITABLE_ROLES = ["admin", "geschaeftsfuehrer", "buero", "disponent", "techniker"] as const;

export const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  geschaeftsfuehrer: "Geschäftsführer",
  buero: "Büro",
  disponent: "Disponent",
  techniker: "Techniker",
};

// Rollen mit uneingeschränktem Zugriff auf alle Aufträge der Firma.
const FULL_ACCESS_ROLES: readonly string[] = ["owner", "admin", "geschaeftsfuehrer"];

export function hasFullAccess(role: string | null | undefined) {
  return FULL_ACCESS_ROLES.includes(role ?? "");
}

export function isTechniker(role: string | null | undefined) {
  return role === "techniker";
}

// Techniker dürfen laut Vorgabe nur ihre zugewiesenen Aufträge sehen und
// dokumentieren – wird zusätzlich zur DB-seitigen RLS (can_view_order/
// can_edit_order) auch im Frontend genutzt, um Aktionen gar nicht erst
// anzuzeigen, die serverseitig ohnehin verweigert würden.
export function canSeeAllOrders(role: string | null | undefined) {
  return !isTechniker(role);
}

export function canCreateOrders(role: string | null | undefined) {
  return !isTechniker(role);
}

// Disponenten verwalten Ressourcen (Mitarbeiter/Fahrzeuge/Maschinen) und
// Termine; Admin/Geschäftsführer/Owner dürfen ohnehin alles.
export function canManageResourcesAndSchedule(role: string | null | undefined) {
  return role === "disponent" || hasFullAccess(role);
}

// Büro darf Aufträge erstellen und kaufmännische Dokumente (Angebote/
// Rechnungen) verknüpfen.
export function canCreateOrdersAndLinkCommercialDocuments(role: string | null | undefined) {
  return role === "buero" || hasFullAccess(role);
}

// Lösch-/Archivierungsrechte werden gesondert geprüft (siehe Vorgabe) –
// nur volle Rechte-Rollen dürfen Aufträge endgültig löschen oder archivieren.
export function canDeleteOrArchiveOrders(role: string | null | undefined) {
  return hasFullAccess(role);
}
