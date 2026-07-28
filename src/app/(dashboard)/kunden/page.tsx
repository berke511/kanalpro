import { ModulePlaceholder } from "@/components/dashboard/ModulePlaceholder";

export default function KundenPage() {
  return (
    <ModulePlaceholder
      title="Kundenverwaltung"
      description="Kompletter Kundenstamm mit Objekten, Ansprechpartnern und Auftragshistorie."
      upcoming={[
        "Kunden anlegen, suchen und filtern",
        "Firmenkunden und Privatkunden",
        "Mehrere Objekte/Standorte je Kunde",
        "Ansprechpartner & Kontaktdaten",
        "Vollständige Auftrags- und Dokumentenhistorie",
      ]}
    />
  );
}
