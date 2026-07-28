import { ModulePlaceholder } from "@/components/dashboard/ModulePlaceholder";

export default function AuftraegePage() {
  return (
    <ModulePlaceholder
      title="Auftragsmanagement"
      description="Aufträge anlegen, Mitarbeitern zuweisen und den Status vom Eingang bis zum Abschluss verfolgen."
      upcoming={[
        "Auftrag aus Kundenstamm erstellen",
        "Zuweisung an einen oder mehrere Mitarbeiter",
        "Statusverfolgung (offen, eingeplant, in Arbeit, abgeschlossen)",
        "Verknüpfung mit Angeboten und Rechnungen",
        "Automatische Sichtbarkeit im Außendienst",
      ]}
    />
  );
}
