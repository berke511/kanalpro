// Shared constants for the Auftragsmanagement (order management) module.
// Kept in a plain module (no "use server"/"use client") so it can be
// imported both from Server Actions (actions.ts) and from Client/Server
// Components (OrderForm.tsx, list/detail pages) alike.

export const ORDER_STATUSES = ["offen", "eingeplant", "in_arbeit", "abgeschlossen"] as const;

export const STATUS_LABELS: Record<string, string> = {
  offen: "Offen",
  eingeplant: "Eingeplant",
  in_arbeit: "In Arbeit",
  abgeschlossen: "Abgeschlossen",
};
