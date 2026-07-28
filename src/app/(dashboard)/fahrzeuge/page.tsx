import { ModulePlaceholder } from "@/components/dashboard/ModulePlaceholder";

export default function FahrzeugePage() {
  return (
    <ModulePlaceholder
      title="Fahrzeug- & Maschinenverwaltung"
      description="Fuhrpark, Maschinen und Geräte samt Wartungsstatus im Überblick."
      upcoming={[
        "Fahrzeug- und Maschinenstamm",
        "Zuordnung zu Einsätzen",
        "Wartungs- und Prüftermine",
        "Materialbestand je Fahrzeug",
        "Verfügbarkeitsübersicht",
      ]}
    />
  );
}
