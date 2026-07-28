import { ModulePlaceholder } from "@/components/dashboard/ModulePlaceholder";

export default function EinsatzplanungPage() {
  return (
    <ModulePlaceholder
      title="Einsatzplanung & Disposition"
      description="Fahrzeuge, Maschinen und Teams übersichtlich für anstehende Aufträge einplanen."
      upcoming={[
        "Kalender- und Tagesansicht der Einsätze",
        "Drag-and-drop Disposition von Mitarbeitern",
        "Fahrzeug- und Maschinenzuweisung je Einsatz",
        "Konfliktprüfung bei Doppelbuchungen",
        "Push-Benachrichtigung an den Außendienst",
      ]}
    />
  );
}
