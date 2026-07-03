# KanalPro 1.0 Master Roadmap

> Letzte Aktualisierung: 2026-07-03
> Status: In Entwicklung

---

## Projektübersicht

KanalPro ist eine digitale Betriebssoftware für Kanalsanierungsunternehmen. Die Plattform deckt den vollständigen Betriebszyklus ab: von der Angebotserstellung über die Auftragsabwicklung und den Einsatzbericht bis zur Rechnungsstellung und Nachkalkulation.

---

## Produktstatus

**Version:** 1.0 (In Entwicklung)
**Gesamtfortschritt:** ca. 40 %

---

## Module

| Modul | Status | Produktreife | Nächster Sprint |
|---|---|---|---|
| Dashboard | 🟨 In Entwicklung | 🟦 Funktion fertig | Dashboard 3.0 |
| CRM | 🟨 In Entwicklung | 🟦 Funktion fertig | CRM 2.0 |
| Angebote | 🟨 In Entwicklung | 🟦 Funktion fertig | Angebote 2.0 |
| Aufträge | 🟨 In Entwicklung | 🟦 Funktion fertig | Auftragsakte 3.0 |
| Einsatzberichte | 🟨 In Entwicklung | 🟦 Funktion fertig | Einsatzbericht 2.0 |
| Material | 🟨 In Entwicklung | 🟦 Funktion fertig | Material 3.0 |
| Fahrzeuge | 🟨 In Entwicklung | 🟦 Funktion fertig | Fahrzeugakte 2.0 |
| Maschinen | 🟨 In Entwicklung | 🟦 Funktion fertig | Maschinenakte 2.0 |
| Mitarbeiter | 🟨 In Entwicklung | 🟦 Funktion fertig | Mitarbeiterakte 3.0 |
| Rechnungen | 🟨 In Entwicklung | 🟦 Funktion fertig | Rechnungen 3.0 |
| Nachkalkulation | 🟨 In Entwicklung | 🟨 In Entwicklung | Nachkalkulation 1.0 Phase 3 |
| Disposition | ⬜ Geplant | ⬜ Geplant | Disposition 1.0 |
| Mobile | ⬜ Geplant | ⬜ Geplant | Mobile 1.0 |
| Kundenportal | ⬜ Geplant | ⬜ Geplant | Kundenportal 1.0 |
| Administration | 🟨 In Entwicklung | 🟨 In Entwicklung | Admin 2.0 |
| Controlling | ⬜ Geplant | ⬜ Geplant | Controlling 1.0 |
| Dokumente | ⬜ Geplant | ⬜ Geplant | Dokumente 1.0 |
| Einstellungen | 🟨 In Entwicklung | 🟨 In Entwicklung | Einstellungen 2.0 |

---

## Prioritäten

### Must Have

- Aufträge vollständig (Einsatzbericht, Material, Nachkalkulation)
- Rechnungen vollständig (PDF, Versand, Mahnwesen)
- Material & Lager vollständig (Bestand, Bewegungen, Auftragsbuchung)
- Nachkalkulation 1.0 (Auftragsergebnis, Lohnkosten, Deckungsbeitrag)

### Should Have

- Disposition (Einsatzplanung, Schichtplanung)
- Controlling (Umsatz, Kosten, Berichte)
- Mobile App (Einsatzbericht unterwegs)

### Nice To Have

- Kundenportal (Auftragseinblick für Kunden)
- Dokumente (Vertragsmanagement)
- KI-gestützte Auswertungen

---

## Sprintplanung

### Sprint 0 — Fundament
- [x] Sprint 0.1: Master Roadmap

### Sprint 1 — Dashboard 2.0
- [x] Sprint 1.1: Rechnungen-Query
- [x] Sprint 1.2: Fahrzeuge-Query
- [x] Sprint 2.1: Kritische Fahrzeuge
- [x] Sprint 2.2: Offene Angebote
- [x] Sprint 2.3: Kritische Maschinen
- [x] Sprint 3.1: Ablaufende Zertifikate
- [x] Sprint 3.2: Schnellaktionen + Aktivitäten-Feed

### Sprint 2 — Akten 2.0
- [x] Mitarbeiterakte (Übersicht, Nächster Schritt, Warnhinweise, Kennzahlen, Quick Actions)
- [x] Fahrzeugakte (Kennzahlen, Quick Actions)
- [x] Maschinenakte (Warn-Banner, Nächster Schritt, Warnhinweise, Kennzahlen, Quick Actions)

### Sprint 3 — Material & Lager 2.0
- [x] Sprint 1.1: DB-Tabelle materialien
- [x] Sprint 1.2: Materialübersicht
- [x] Sprint 2.1: Material-Detailseite
- [x] Sprint 2.2: Materialbewegungen
- [x] Sprint 3.1: Material auf Auftrag buchen

### Sprint 4 — Auftragsakte 2.0
- [x] Sprint 2.1: Materialkosten im Auftrag

### Sprint 5 — Rechnung 2.0
- [x] Sprint 2.1: Materialpositionen aus Auftrag übernehmen

### Sprint 6 — Nachkalkulation 1.0
- [x] Phase 1: Auftragsergebnis-Karte
- [x] Phase 2: Interne Lohnkosten
- [ ] Phase 3: Stundensatz-Pflege + automatische Berechnung
- [ ] Phase 4: Deckungsbeitrag

### Geplante Sprints
- Disposition 1.0
- Mobile 1.0
- Controlling 1.0
- Kundenportal 1.0

---

## Produktreife

| Symbol | Bedeutung |
|---|---|
| ⬜ | Geplant — noch nicht begonnen |
| 🟨 | In Entwicklung — aktiv in Arbeit |
| 🟦 | Funktion fertig — technisch implementiert |
| 🟪 | Fachlich getestet — vom Betrieb geprüft |
| 🟩 | Produktreif — stabil, dokumentiert, live |

---

## Roadmap-Regeln

Neue Features dürfen nur entwickelt werden wenn:

1. **Modul existiert** — in dieser Roadmap gelistet
2. **Sprint definiert** — Sprintnummer und -ziel festgelegt
3. **Product Spec vorhanden** — Anforderungen schriftlich definiert
4. **Abhängigkeiten geprüft** — keine blockierenden Vorbedingungen offen

---

## Definition of Done

Ein Sprint gilt erst als abgeschlossen wenn:

- [ ] Build erfolgreich
- [ ] Vercel READY
- [ ] Dokumentation aktualisiert
- [ ] Roadmap aktualisiert
- [ ] Changelog aktualisiert
- [ ] Tests durchgeführt
- [ ] Fachlich geprüft

---

## Änderungsprozess

```
Idee
  ↓
Bewertung (Priorität + Aufwand)
  ↓
Roadmap (Modul + Sprint eintragen)
  ↓
Product Spec (Anforderungen + Akzeptanzkriterien)
  ↓
Micro-Task (max. 1-2 Dateien, 1 DB-Änderung)
  ↓
Implementierung
  ↓
Tests (Build + Vercel + fachlich)
  ↓
Produktreif
```

---

*Dieses Dokument ist die einzige Quelle für Projektstatus, Roadmap und Prioritäten.*
*Weitere Dokumente (Product Specs, Changelog, QA) folgen als eigene Sprints.*