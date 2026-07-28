import { ModulePlaceholder } from "@/components/dashboard/ModulePlaceholder";

export default function MitarbeiterPage() {
  return (
    <ModulePlaceholder
      title="Mitarbeiterverwaltung"
      description="Mitarbeiterstamm, Rollen und Rechte für Büro und Außendienst."
      upcoming={[
        "Mitarbeiter einladen und verwalten",
        "Rollen- und Rechteverwaltung (Owner, Admin, Mitarbeiter)",
        "Qualifikationen & Zertifikate",
        "Arbeitszeiten je Einsatz",
        "Verfügbarkeiten und Abwesenheiten",
      ]}
    />
  );
}
