# KanalPro Product Specification

> Version: 1.0
> Letzte Aktualisierung: 2026-07-03
> Status: In Entwicklung

---

## 1. Produktvision

### Zielgruppe

KanalPro richtet sich an kleine und mittelständische Unternehmen im Bereich Kanalsanierung, Rohrreinigung und Tiefbau. Typische Unternehmensgrößen: 5–100 Mitarbeiter, 1–20 Fahrzeuge, mehrere aktive Aufträge gleichzeitig.

### Welche Probleme löst KanalPro?

- **Medienbrüche:** Aufträge werden auf Papier, in Excel und per Telefon koordiniert — KanalPro digitalisiert diesen gesamten Prozess.
- **Doppelte Datenerfassung:** Kundendaten, Auftragsdaten und Rechnungsdaten werden heute mehrfach eingegeben — in KanalPro einmal erfassen, überall nutzen.
- **Fehlende Nachkalkulation:** Betriebe wissen oft nicht, ob ein Auftrag profitabel war — KanalPro liefert erstmals eine vollständige Kostenübersicht je Auftrag.
- **Zeiterfassung auf der Baustelle:** Monteure erfassen Zeiten auf Papier — KanalPro ermöglicht die mobile Zeiterfassung direkt am Einsatzort.
- **Rechnungsstellung:** Rechnungen werden manuell in Word oder Excel erstellt — KanalPro automatisiert die Rechnungsstellung auf Basis des Einsatzberichts.

### Welche Unternehmensgrößen werden unterstützt?

- **Kleinstbetriebe:** 1–5 Mitarbeiter, 1 Standort, einfache Strukturen
- **Kleinbetriebe:** 5–20 Mitarbeiter, mehrere Teams, einfache Disposition
- **Mittlere Betriebe:** 20–100 Mitarbeiter, mehrere Standorte, komplexere Strukturen

### Welche Kernprozesse werden digitalisiert?

1. Kundenmanagement (CRM)
2. Angebotserstellung
3. Auftragsabwicklung
4. Einsatzplanung und -bericht
5. Materialmanagement
6. Fahrzeug- und Maschinenmanagement
7. Mitarbeiterverwaltung
8. Rechnungsstellung
9. Nachkalkulation

---

## 2. Benutzerrollen

### Geschäftsführer

**Aufgaben:**
- Überblick über alle laufenden Aufträge
- Umsatz- und Ergebniskontrolle
- Strategische Entscheidungen

**Verantwortlichkeiten:**
- Genehmigung von Angeboten und Rechnungen
- Qualitätskontrolle der Nachkalkulation

**Genutzte Module:**
- Dashboard, Controlling, Nachkalkulation, Rechnungen, CRM

---

### Disponent

**Aufgaben:**
- Auftragsplanung und Zuweisung
- Ressourcenplanung (Mitarbeiter, Fahrzeuge, Maschinen)
- Einsatzterminierung

**Verantwortlichkeiten:**
- Sicherstellung der Kapazitätsauslastung
- Koordination zwischen Büro und Monteur

**Genutzte Module:**
- Disposition, Aufträge, Mitarbeiter, Fahrzeuge, Maschinen, Dashboard

---

### Büro

**Aufgaben:**
- Kundenpflege und Angebotserstellung
- Rechnungsstellung und Mahnwesen
- Stammdatenpflege

**Verantwortlichkeiten:**
- Vollständigkeit der Auftragsdaten
- Korrektheit der Rechnungen

**Genutzte Module:**
- CRM, Angebote, Aufträge, Rechnungen, Dokumente, Einstellungen

---

### Monteur

**Aufgaben:**
- Einsatz vor Ort durchführen
- Zeiten und Material erfassen
- Einsatzbericht ausfüllen

**Verantwortlichkeiten:**
- Korrekte Zeiterfassung
- Vollständiger Einsatzbericht

**Genutzte Module:**
- Mobile App, Einsatzberichte, Material

---

### Lager

**Aufgaben:**
- Materialbestand pflegen
- Wareneingänge und -ausgänge buchen
- Mindestbestände überwachen

**Verantwortlichkeiten:**
- Aktualität des Lagerbestands
- Rechtzeitige Nachbestellung

**Genutzte Module:**
- Material, Dashboard (Warnhinweise)

---

### Administrator

**Aufgaben:**
- Systemkonfiguration
- Benutzerverwaltung
- Stammdaten pflegen

**Verantwortlichkeiten:**
- Datensicherheit und Zugriffsrechte
- Systemverfügbarkeit

**Genutzte Module:**
- Administration, Einstellungen, alle Module

---

## 3. Geschäftsprozess

```
Interessent
  ↓  (Kontaktaufnahme, Anfrage)
Kunde (CRM)
  ↓  (Bedarfsanalyse, Besichtigung)
Angebot
  ↓  (Kalkulation, Versand, Genehmigung)
Auftrag
  ↓  (Auftragsbestätigung, Ressourcenplanung)
Planung / Disposition
  ↓  (Mitarbeiter, Fahrzeug, Maschine zuweisen)
Einsatz
  ↓  (Monteur vor Ort, Zeiterfassung)
Material
  ↓  (Materialentnahme aus Lager, Buchung auf Auftrag)
Einsatzbericht
  ↓  (Fotos, Zeiten, Bemerkungen, Unterschrift)
Rechnung
  ↓  (Automatische Erstellung aus Auftrag + Einsatzbericht)
Nachkalkulation
  ↓  (Vergleich Angebot vs. tatsächliche Kosten)
Archiv
```

---

## 4. Module

### Dashboard

**Zweck:** Zentraler Überblick über den aktuellen Betriebsstatus.

**Hauptfunktionen:**
- Kennzahlen: offene Aufträge, Umsatz, überfällige Rechnungen
- Warnhinweise: kritische Fahrzeuge, ablaufende Zertifikate
- Schnellaktionen: direkter Zugang zu häufigen Aufgaben
- Aktivitäten-Feed: aktuelle Vorgänge im Betrieb

**Eingaben:** Daten aus allen anderen Modulen (nur lesend)
**Ausgaben:** Aggregierte Übersicht
**Abhängigkeiten:** Alle Module
**Rollen:** Alle

---

### CRM

**Zweck:** Verwaltung von Kunden und Interessenten.

**Hauptfunktionen:**
- Kundenstammdaten (Name, Adresse, Kontakt, Typ)
- Kundenhistorie (Aufträge, Angebote, Rechnungen)
- Notizen und Aktivitäten

**Eingaben:** Kundendaten manuell oder aus Angebot
**Ausgaben:** Kundendaten für Angebote, Aufträge, Rechnungen
**Abhängigkeiten:** keine
**Rollen:** Büro, Disponent, Geschäftsführer

---

### Angebote

**Zweck:** Erstellung und Verwaltung von Angeboten.

**Hauptfunktionen:**
- Angebotspositionen mit Menge, Einheit, Einzelpreis
- PDF-Erstellung und Versand
- Status: Entwurf → Versendet → Angenommen → Abgelehnt
- Konvertierung in Auftrag

**Eingaben:** Kundendaten (aus CRM), Leistungspositionen
**Ausgaben:** Angebots-PDF, Auftrag
**Abhängigkeiten:** CRM
**Rollen:** Büro, Geschäftsführer

---

### Aufträge

**Zweck:** Vollständige Abwicklung eines Auftrags vom Eingang bis zur Rechnung.

**Hauptfunktionen:**
- Auftragsdaten (Kunde, Standort, Leistung, Termine)
- Ressourcenzuweisung (Mitarbeiter, Fahrzeug, Maschine)
- Einsatzberichte und Materialverbrauch
- Nachkalkulation
- Direkter Link zur Rechnung

**Eingaben:** Angebot (optional), Kundendaten, Ressourcen
**Ausgaben:** Einsatzbericht, Materialverbrauch, Rechnung
**Abhängigkeiten:** CRM, Angebote, Mitarbeiter, Fahrzeuge, Maschinen, Material
**Rollen:** Disponent, Büro, Monteur, Geschäftsführer

---

### Einsatzberichte

**Zweck:** Dokumentation des tatsächlichen Einsatzes vor Ort.

**Hauptfunktionen:**
- Zeiterfassung (Beginn, Ende, Pause)
- Materialverbrauch buchen
- Fotos und Notizen
- Digitale Unterschrift
- Statusbericht

**Eingaben:** Auftragsdaten, Materialbestand, Mitarbeiterdaten
**Ausgaben:** Bericht für Rechnung und Nachkalkulation
**Abhängigkeiten:** Aufträge, Material, Mitarbeiter
**Rollen:** Monteur, Disponent, Büro

---

### Material

**Zweck:** Verwaltung von Materialien, Verbrauchsmitteln und Lagerbestand.

**Hauptfunktionen:**
- Materialkatalog mit Stammdaten
- Bestandsführung (Eingang, Ausgang, Umbuchung)
- Mindestbestand und Warnhinweise
- Buchung auf Aufträge
- Bewegungshistorie

**Eingaben:** Wareneingänge, Auftragsverbrauch
**Ausgaben:** Materialkosten für Nachkalkulation
**Abhängigkeiten:** Aufträge, Einsatzberichte
**Rollen:** Lager, Monteur, Büro

---

### Fahrzeuge

**Zweck:** Verwaltung des Fuhrparks.

**Hauptfunktionen:**
- Fahrzeugstammdaten (Kennzeichen, Typ, Baujahr)
- Zustandsüberwachung
- TÜV- und Wartungstermine
- Zuweisung zu Aufträgen

**Eingaben:** Fahrzeugdaten manuell
**Ausgaben:** Verfügbarkeit für Disposition
**Abhängigkeiten:** Aufträge
**Rollen:** Disponent, Administrator

---

### Maschinen

**Zweck:** Verwaltung von Geräten und Maschinen (z.B. Fräsen, Kameras, Pumpen).

**Hauptfunktionen:**
- Maschinenstammdaten
- Prüftermine (UVV, DGUV)
- Zustandsüberwachung
- Zertifikatsverwaltung
- Zuweisung zu Aufträgen

**Eingaben:** Maschinendaten manuell
**Ausgaben:** Verfügbarkeit für Disposition
**Abhängigkeiten:** Aufträge
**Rollen:** Disponent, Administrator

---

### Mitarbeiter

**Zweck:** Verwaltung von Mitarbeiterstammdaten und Qualifikationen.

**Hauptfunktionen:**
- Stammdaten (Name, Position, Kontakt)
- Zertifikate und Qualifikationen
- Abwesenheiten (Urlaub, Krank)
- Arbeitszeitübersicht

**Eingaben:** Mitarbeiterdaten manuell
**Ausgaben:** Verfügbarkeit für Disposition, Stundensatz für Nachkalkulation
**Abhängigkeiten:** Aufträge, Einsatzberichte
**Rollen:** Büro, Administrator, Geschäftsführer

---

### Rechnungen

**Zweck:** Erstellung, Verwaltung und Versand von Rechnungen.

**Hauptfunktionen:**
- Automatische Übernahme aus Auftrag + Einsatzbericht
- Positionen (Arbeitszeit, Material, Sonstiges)
- PDF-Erstellung
- E-Mail-Versand
- Status: Entwurf → Versendet → Bezahlt → Überfällig
- Mahnwesen

**Eingaben:** Auftragsdaten, Einsatzbericht, Materialpositionen
**Ausgaben:** Rechnungs-PDF, Zahlungsstatus
**Abhängigkeiten:** CRM, Aufträge, Material
**Rollen:** Büro, Geschäftsführer

---

### Nachkalkulation

**Zweck:** Vergleich der geplanten vs. tatsächlichen Kosten je Auftrag.

**Hauptfunktionen:**
- Materialkosten (aus Materialverbrauch)
- Lohnkosten (Arbeitszeit × Stundensatz)
- Rechnungsbetrag
- Deckungsbeitrag (Rechnungsbetrag − Materialkosten − Lohnkosten)
- Auftragsergebnis-Übersicht

**Eingaben:** Material, Einsatzbericht, Rechnungen
**Ausgaben:** Deckungsbeitrag, Kostenaufstellung
**Abhängigkeiten:** Aufträge, Material, Rechnungen, Mitarbeiter
**Rollen:** Geschäftsführer, Büro

---

### Disposition

**Zweck:** Planung und Koordination von Einsätzen.

**Hauptfunktionen:**
- Kalenderansicht der Aufträge
- Ressourcenzuweisung (Monteur, Fahrzeug, Maschine)
- Kapazitätsübersicht
- Benachrichtigungen

**Eingaben:** Aufträge, Verfügbarkeit Ressourcen
**Ausgaben:** Einsatzplan für Monteure
**Abhängigkeiten:** Aufträge, Mitarbeiter, Fahrzeuge, Maschinen
**Rollen:** Disponent
**Status:** ⬜ Geplant — Version 1.0

---

### Mobile

**Zweck:** Mobiler Zugang für Monteure vor Ort.

**Hauptfunktionen:**
- Tagesplanung anzeigen
- Zeiterfassung starten/stoppen
- Materialentnahme buchen
- Einsatzbericht ausfüllen
- Fotos hochladen

**Eingaben:** Auftragsdaten, Dispositionsplan
**Ausgaben:** Einsatzbericht, Materialverbrauch
**Abhängigkeiten:** Aufträge, Einsatzberichte, Material
**Rollen:** Monteur
**Status:** ⬜ Geplant — Version 1.0

---

### Kundenportal

**Zweck:** Transparenz für Kunden über laufende Aufträge.

**Hauptfunktionen:**
- Auftragsstatus einsehen
- Einsatzberichte herunterladen
- Rechnungen herunterladen

**Eingaben:** Auftrags- und Rechnungsdaten
**Ausgaben:** Kundeninformationen
**Abhängigkeiten:** CRM, Aufträge, Rechnungen
**Rollen:** Kunde (externer Zugang)
**Status:** ⬜ Geplant — Version 1.0

---

### Administration

**Zweck:** Systemverwaltung und Konfiguration.

**Hauptfunktionen:**
- Benutzerverwaltung
- Rollenzuweisung
- Firmendaten
- Systemeinstellungen

**Eingaben:** Administrator-Eingaben
**Ausgaben:** Systemkonfiguration
**Abhängigkeiten:** alle Module
**Rollen:** Administrator

---

### Dokumente

**Zweck:** Zentrale Dokumentenverwaltung.

**Hauptfunktionen:**
- Verträge, Zertifikate, Fotos speichern
- Dokumente Kunden oder Aufträgen zuordnen
- Versionierung

**Status:** ⬜ Geplant — Version 1.0

---

### Controlling

**Zweck:** Betriebswirtschaftliche Auswertungen.

**Hauptfunktionen:**
- Umsatzberichte
- Kostenauswertungen
- Deckungsbeitragsanalyse
- Vergleich Perioden

**Abhängigkeiten:** Rechnungen, Nachkalkulation, Material
**Rollen:** Geschäftsführer
**Status:** ⬜ Geplant — Version 1.0

---

### Einstellungen

**Zweck:** Konfiguration des Systems durch den Betrieb.

**Hauptfunktionen:**
- Firmenstammdaten
- Steuersätze
- Zahlungskonditionen
- E-Mail-Vorlagen
- Nummernkreise (Rechnungen, Angebote)

**Rollen:** Administrator, Büro

---

## 5. Produktprinzipien

1. **Mobile First** — alle Ansichten funktionieren auf dem Smartphone
2. **Möglichst wenige Klicks** — häufige Aufgaben in maximal 3 Klicks erreichbar
3. **Keine doppelte Datenerfassung** — Kundendaten, Auftragsdaten und Materialdaten werden einmal erfasst und überall genutzt
4. **Einmal erfassen – überall nutzen** — Daten aus dem Einsatzbericht fließen automatisch in Rechnung und Nachkalkulation
5. **Einheitliches UI** — konsistentes Design über alle Module
6. **Mandantenfähig** — jedes Unternehmen hat eigene, isolierte Daten
7. **DSGVO-konform** — personenbezogene Daten werden nur mit Rechtsgrundlage gespeichert und können gelöscht werden
8. **Offline-fähig (Mobile)** — Einsatzberichte können auch ohne Internetverbindung ausgefüllt werden

---

## 6. Nicht-Ziele Version 1.0

Folgende Funktionen sind bewusst **nicht** Bestandteil von Version 1.0:

| Funktion | Begründung |
|---|---|
| KI-Automatisierung | Zu komplex für V1.0, folgt in V2.0 |
| IoT-Integration | Keine Kundennachfrage für V1.0 |
| Barcode-/QR-Scan | Mobile V1.0 ohne Scanner-Hardware |
| Mehrlagerverwaltung | Einfache Lagerstruktur für V1.0 ausreichend |
| Predictive Maintenance | Datenbasis fehlt noch für V1.0 |
| ERP-Integration | Zu spezifisch je Kunde |
| Lohnabrechnung | Separate Fachsoftware empfohlen |
| Buchhaltung | DATEV-Export geplant für V2.0 |
| Multisprache | Nur Deutsch für V1.0 |
| White-Label | Folgt als separates Produkt |

---

## 7. Qualitätsziele

### Geschwindigkeit
- Seitenaufbau unter 2 Sekunden
- API-Antworten unter 500ms
- Mobile Nutzung auch bei schlechter Verbindung

### Benutzerfreundlichkeit
- Neue Mitarbeiter ohne Schulung in unter 30 Minuten nutzbar
- Klare Fehlermeldungen in verständlicher Sprache
- Konsistentes Design über alle Module

### Sicherheit
- Alle Daten verschlüsselt (TLS 1.3)
- Row-Level Security (RLS) für Mandantentrennung
- Keine Klartextpasswörter
- Regelmäßige Backups

### Skalierbarkeit
- Unterstützung von bis zu 100 gleichzeitigen Nutzern pro Mandant
- Bis zu 10.000 Aufträge pro Mandant und Jahr
- Bis zu 1.000 Materialien pro Mandant

### Wartbarkeit
- Micro-Task-Architektur (max. 1-2 Dateien pro Feature)
- Vollständige Dokumentation (Roadmap, Product Spec, Changelog)
- Automatische Deployments via Vercel

---

*Dieses Dokument beschreibt das Produkt aus Anwendersicht.*
*Technische Architektur, Coding Standards und QA-Checklisten folgen als eigene Sprints.*