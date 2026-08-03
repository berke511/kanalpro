// Auftragsvorlagen für den "Neuer Auftrag"-Assistenten (Schritt "Vorlage
// verwenden"). Jede Vorlage befüllt Titel-Suffix, Auftragsart, Standard-
// beschreibung, geplante Dauer und eine Standard-Checkliste (als interne
// Notiz) vor – alle Felder bleiben danach frei editierbar. Bewusst als
// statische, im Code gepflegte Liste (kein eigenes DB-Modul) gehalten, da
// der Umfang klein und unternehmensübergreifend identisch ist.

import type { OrderKind } from "@/lib/orders";

export type OrderTemplate = {
  key: string;
  label: string;
  order_kind: OrderKind;
  titleSuffix: string;
  description: string;
  planned_duration_minutes: number;
  vehicleKindHint: string;
  checklist: string[];
};

export const ORDER_TEMPLATES: OrderTemplate[] = [
  {
    key: "rohrreinigung",
    label: "Rohrreinigung",
    order_kind: "rohrreinigung",
    titleSuffix: "Rohrreinigung",
    description: "Verstopfung beseitigen, Rohrleitung mit Hochdruck spülen und auf freien Durchfluss prüfen.",
    planned_duration_minutes: 90,
    vehicleKindHint: "Spülfahrzeug",
    checklist: ["Zugang zum Rohrsystem prüfen", "Hochdruckspülung durchführen", "Durchfluss kontrollieren", "Arbeitsbereich säubern"],
  },
  {
    key: "tv_inspektion",
    label: "TV-Inspektion",
    order_kind: "tv_inspektion",
    titleSuffix: "TV-Inspektion",
    description: "Kanalabschnitt mit Kamera befahren, Zustand dokumentieren und Schäden klassifizieren.",
    planned_duration_minutes: 120,
    vehicleKindHint: "TV-Inspektionsfahrzeug",
    checklist: ["Kamerabefahrung starten", "Schäden fotografisch dokumentieren", "Zustandsbericht erstellen"],
  },
  {
    key: "dichtheitspruefung",
    label: "Dichtheitsprüfung",
    order_kind: "dichtheitspruefung",
    titleSuffix: "Dichtheitsprüfung",
    description: "Dichtheitsprüfung nach geltender Norm durchführen und Prüfprotokoll erstellen.",
    planned_duration_minutes: 90,
    vehicleKindHint: "Prüffahrzeug",
    checklist: ["Prüfabschnitt absperren", "Druck-/Wasserprüfung durchführen", "Prüfprotokoll erstellen"],
  },
  {
    key: "notdienst",
    label: "Notdienst",
    order_kind: "notdienst",
    titleSuffix: "Notdiensteinsatz",
    description: "Akuter Notfall – schnellstmögliche Anfahrt und Behebung der Störung vor Ort.",
    planned_duration_minutes: 60,
    vehicleKindHint: "Notdienstfahrzeug",
    checklist: ["Vor-Ort-Situation prüfen", "Sofortmaßnahme durchführen", "Kunden über weiteres Vorgehen informieren"],
  },
  {
    key: "fraesarbeiten",
    label: "Fräsarbeiten",
    order_kind: "fraesarbeiten",
    titleSuffix: "Fräsarbeiten",
    description: "Wurzeleinwuchs bzw. Ablagerungen mittels Fräse entfernen und Rohrquerschnitt freilegen.",
    planned_duration_minutes: 150,
    vehicleKindHint: "Fräsfahrzeug",
    checklist: ["Fräskopf auswählen", "Fräsarbeiten durchführen", "Ergebnis mit Kamera kontrollieren"],
  },
  {
    key: "sanierung",
    label: "Kanalsanierung",
    order_kind: "sanierung",
    titleSuffix: "Kanalsanierung",
    description: "Schadhaften Kanalabschnitt sanieren (z. B. Inliner-Verfahren) und Ergebnis dokumentieren.",
    planned_duration_minutes: 240,
    vehicleKindHint: "Sanierungsfahrzeug",
    checklist: ["Sanierungsverfahren festlegen", "Sanierung durchführen", "Abnahmeprüfung dokumentieren"],
  },
  {
    key: "sinkkastenreinigung",
    label: "Sinkkastenreinigung",
    order_kind: "sinkkastenreinigung",
    titleSuffix: "Sinkkastenreinigung",
    description: "Sinkkästen leeren, reinigen und auf Funktionsfähigkeit prüfen.",
    planned_duration_minutes: 45,
    vehicleKindHint: "Saugfahrzeug",
    checklist: ["Sinkkasten öffnen", "Ablagerungen absaugen", "Funktionsprüfung durchführen"],
  },
  {
    key: "schachtreinigung",
    label: "Schachtreinigung",
    order_kind: "schachtreinigung",
    titleSuffix: "Schachtreinigung",
    description: "Schachtbauwerk reinigen und auf Schäden bzw. Zustand prüfen.",
    planned_duration_minutes: 60,
    vehicleKindHint: "Saugfahrzeug",
    checklist: ["Schacht öffnen und sichern", "Reinigung durchführen", "Zustand dokumentieren"],
  },
];
