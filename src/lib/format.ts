// Gemeinsame Formatierungs-Hilfsfunktionen, die modulübergreifend genutzt
// werden (z. B. Kundentabelle, Rechnungen).

export function formatEuro(value: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
}
