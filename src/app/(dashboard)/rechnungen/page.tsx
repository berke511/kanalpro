import { ModulePlaceholder } from "@/components/dashboard/ModulePlaceholder";

export default function RechnungenPage() {
  return (
    <ModulePlaceholder
      title="Angebote & Rechnungen"
      description="Aus abgeschlossenen Aufträgen direkt Angebote, Rechnungen und Abschlussberichte erstellen."
      upcoming={[
        "Angebote aus Aufträgen generieren",
        "Rechnungsstellung mit Positionen aus Material & Zeiten",
        "PDF-Export und Versand",
        "Zahlungsstatus verfolgen",
        "Digitale Kundenunterschrift auf Abschlussberichten",
      ]}
    />
  );
}
