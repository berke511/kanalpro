export const INVOICE_KINDS = ["angebot", "rechnung"] as const;

export const INVOICE_KIND_LABELS: Record<string, string> = {
  angebot: "Angebot",
  rechnung: "Rechnung",
};

export const INVOICE_STATUSES = ["entwurf", "versendet", "bezahlt", "storniert"] as const;

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  entwurf: "Entwurf",
  versendet: "Versendet",
  bezahlt: "Bezahlt",
  storniert: "Storniert",
};
