# KanalPro QA & Release Checklist

> Version: 1.0
> Letzte Aktualisierung: 2026-07-03
> Verbindlicher Qualitätsstandard für alle Sprints

---

## 1. Definition of Done

Ein Sprint gilt erst als abgeschlossen wenn alle folgenden Punkte erfüllt sind:

| Prüfpunkt | Verantwortlich |
|---|---|
| ✅ Build erfolgreich (Vercel READY, kein Build-Fehler) | Entwickler |
| ✅ Keine JavaScript-Konsolfehler (Console Errors) | Entwickler |
| ✅ Keine funktional relevanten Console-Warnings | Entwickler |
| ✅ Responsive Layout geprüft (Desktop + Mobile) | Entwickler |
| ✅ Fachlicher Workflow manuell getestet | Entwickler |
| ✅ Leere Zustände und Fehlermeldungen geprüft | Entwickler |
| ✅ Roadmap aktualisiert (wenn Sprint abgeschlossen) | Entwickler |
| ✅ Changelog aktualisiert (bei funktionalen Änderungen) | Entwickler |

---

## 2. UI-Prüfung

### Geräte und Viewports

Jede neue UI muss auf folgenden Viewports geprüft werden:

| Viewport | Mindestbreite | Typisches Gerät |
|---|---|---|
| Desktop | 1280px | MacBook, Windows-Laptop |
| Tablet | 768px | iPad |
| Mobile | 375px | iPhone SE, Android |

### Checkliste

- ✅ Layout bricht nicht bei schmalen Viewports
- ✅ Buttons sind auf Mobile bedienbar (min. 44px Tappable Area)
- ✅ Tabellen scrollen horizontal auf Mobile (kein horizontaler Overflow der Seite)
- ✅ Modals/Dialoge schließen sich korrekt
- ✅ Loading State wird angezeigt (kein leerer Screen)
- ✅ Leerer Zustand wird angezeigt (kein undefined / null sichtbar)
- ✅ Fehlermeldungen sind auf Deutsch und verständlich
- ✅ Umlaute werden korrekt angezeigt (ä ö ü Ä Ö Ü ß)
- ✅ Sonderzeichen in Kundennamen, Adressen, Titeln korrekt
- ✅ Buttons einheitlich (Stil, Farbe, Größe)
- ✅ Karten einheitlich (Border, Radius, Padding)
- ✅ Farben konsistent (kein Mischmasch aus verschiedenen Blautönen)
- ✅ Status-Badges lesbar und korrekt gefärbt

---

## 3. Fachliche Tests

### Vollständiger Workflow-Test

Vor einem Release muss der gesamte Kernprozess einmal vollständig durchgespielt werden:

```
Schritt 1: Interessent anlegen
  → CRM → Neuer Kunde → Typ: Interessent
  → Prüfen: Kunde in der Liste sichtbar

Schritt 2: Interessent zu Kunde konvertieren
  → Kundenakte → Typ auf "Kunde" ändern
  → Prüfen: Kundendaten vollständig

Schritt 3: Angebot erstellen
  → Angebote → Neues Angebot → Kunde verknüpfen
  → Positionen hinzufügen → Speichern
  → Prüfen: Status "Entwurf", Betrag korrekt

Schritt 4: Angebot in Auftrag umwandeln
  → Angebotsakte → "In Auftrag umwandeln"
  → Prüfen: Auftrag erscheint in Auftragsliste

Schritt 5: Auftrag disponieren
  → Auftragsakte → Mitarbeiter, Fahrzeug, Maschine zuweisen
  → Prüfen: Ressourcen korrekt hinterlegt

Schritt 6: Einsatz erfassen
  → Aufträge → Einsatzbericht → Auftrag auswählen
  → Beginn und Ende eingeben → Speichern
  → Prüfen: Zeitdifferenz korrekt berechnet

Schritt 7: Material buchen
  → Material → Materialakte → Wareneingang buchen
  → Einsatzbericht → Material auf Auftrag buchen
  → Prüfen: Bestand reduziert, Bewegung gespeichert

Schritt 8: Einsatzbericht abschließen
  → Auftragsakte → Tab "Einsatz" → Status prüfen
  → Prüfen: Materialliste in Auftragsakte sichtbar

Schritt 9: Rechnung erstellen
  → Rechnungen → Neu → mit ?auftrag=<id>
  → Prüfen: Materialpositionen automatisch übernommen
  → Betrag korrekt → Rechnung speichern

Schritt 10: Nachkalkulation prüfen
  → Auftragsakte → Tab "Abschluss"
  → Prüfen: Materialkosten, Arbeitszeit, Rechnungsbetrag korrekt
  → Deckungsbeitrag ergibt sich korrekt
```

---

## 4. Modul-Checklisten

### Dashboard
- ✅ Kennzahlen laden (offene Aufträge, Umsatz, überfällige Rechnungen)
- ✅ Warnhinweise erscheinen bei kritischen Fahrzeugen / Maschinen
- ✅ Ablaufende Zertifikate werden angezeigt
- ✅ Schnellaktionen funktionieren
- ✅ Aktivitäten-Feed aktuell
- ✅ Kein Fehler bei leerem Datenbestand (frischer Account)

### CRM (Kunden)
- ✅ Kundenliste lädt korrekt
- ✅ Suche / Filter funktioniert
- ✅ Neuer Kunde anlegen (alle Pflichtfelder)
- ✅ Kundenakte: Tabs Übersicht, Aufträge, Angebote, Rechnungen laden
- ✅ Verknüpfte Aufträge und Rechnungen in Kundenakte sichtbar
- ✅ Leerer Zustand bei neuem Kunden ohne Aufträge

### Angebote
- ✅ Angebotsliste lädt
- ✅ Neues Angebot mit Positionen anlegen
- ✅ Status-Änderung (Entwurf → Versendet → Angenommen)
- ✅ Betragsberechnung korrekt (Netto + MwSt + Brutto)
- ✅ Angebotsakte vollständig

### Aufträge
- ✅ Auftragsliste lädt mit Kundennamen
- ✅ Auftragsakte: alle Tabs laden (Übersicht, Einsatz, Material, Abschluss)
- ✅ Ressourcenzuweisung (Mitarbeiter, Fahrzeug, Maschine) speicherbar
- ✅ Materialkosten-Karte in Übersicht korrekt
- ✅ Nachkalkulation im Abschluss-Tab korrekt berechnet
- ✅ Link zu Einsatzbericht funktioniert
- ✅ Link zu neuer Rechnung mit ?auftrag=id funktioniert

### Material
- ✅ Materialliste mit aktuellem Bestand
- ✅ Warnhinweis bei Mindestbestand unterschritten
- ✅ Materialakte lädt korrekt
- ✅ Wareneingang buchen: Bestand erhöht sich
- ✅ Materialentnahme buchen: Bestand sinkt
- ✅ Negativbestand wird verhindert (Fehlermeldung)
- ✅ Bewegungsverlauf (letzte 10 Einträge) korrekt
- ✅ Material auf Auftrag buchen (via Einsatzbericht)

### Fahrzeuge
- ✅ Fahrzeugliste lädt
- ✅ Fahrzeugakte: Übersicht, Kennzahlen, Warnhinweise
- ✅ TÜV-Datum und nächste Wartung korrekt angezeigt
- ✅ Warnung bei abgelaufenem / baldigen TÜV

### Maschinen
- ✅ Maschinenliste lädt
- ✅ Maschinenakte: Übersicht, Prüftermine, Zertifikate
- ✅ UVV-Datum und nächste Prüfung korrekt
- ✅ Warnung bei ablaufenden Zertifikaten

### Mitarbeiter
- ✅ Mitarbeiterliste lädt
- ✅ Mitarbeiterakte: Stammdaten, Zertifikate, Einsätze
- ✅ Ablaufende Zertifikate werden als Warnung angezeigt

### Rechnungen
- ✅ Rechnungsliste mit Status
- ✅ Neue Rechnung ohne Auftragsbezug
- ✅ Neue Rechnung mit ?auftrag=id: Materialpositionen übernommen
- ✅ Rechnungsbetrag korrekt (Netto + MwSt + Brutto)
- ✅ Status-Änderung (Entwurf → Versendet → Bezahlt)
- ✅ Mahnungen: überfällige Rechnungen korrekt markiert

### Nachkalkulation
- ✅ Materialkosten = Summe auftrag_material.gesamtpreis
- ✅ Arbeitszeit = Differenz arbeit_begonnen_at / arbeit_beendet_at in Stunden
- ✅ Rechnungsbetrag = Summe rechnungen.betrag_brutto
- ✅ Lohnkosten: Hinweis "Nicht verfügbar" wenn kein Stundensatz hinterlegt
- ✅ Kein Fehler wenn kein Material / keine Rechnung vorhanden

### Dokumente
- ⬜ Noch nicht implementiert — Test ausstehend

### Controlling
- ⬜ Noch nicht implementiert — Test ausstehend

---

## 5. Sicherheit

### RLS und Mandantentrennung

Folgende Sicherheitstests müssen bestanden werden:

- ✅ Eingeloggter User sieht nur Daten seiner eigenen Company
- ✅ Direktaufruf einer fremden Auftrags-ID (/dashboard/auftraege/<fremde-id>) liefert leere Seite oder Fehler — keine Fremddaten
- ✅ Direktaufruf einer fremden Kunden-ID analog
- ✅ Supabase-API-Calls ohne gültige Session werden abgelehnt (401)
- ✅ company_id wird nie clientseitig gesetzt — nur aus get_my_company_id()
- ✅ Keine Daten ohne company_id in der Datenbank

### Rollenprüfung

- ✅ Admin-Funktionen (Einstellungen, Benutzerverwaltung) nur für Admins sichtbar
- ✅ Member kann keine Admin-Aktionen ausführen
- ✅ Logout funktioniert und bereinigt Session

---

## 6. Performance

### Datenbankabfragen

- ✅ Keine sequenziellen Abfragen wo Promise.all möglich (parallele Queries)
- ✅ Keine N+1-Queries (kein Abfragen in Schleifen)
- ✅ Joins statt separate Queries für verwandte Daten (`select('*, kunden(name)')`)
- ✅ Keine unnötigen Felder im Select (`select('*')` nur wo wirklich alle Felder gebraucht)

### Ladezeiten

- ✅ Seitenaufbau unter 3 Sekunden (gemessen in Chrome DevTools / Vercel Analytics)
- ✅ Loading Spinner sichtbar während Daten laden
- ✅ Keine Layout-Shifts (kein Flackern beim Laden)

### Große Datensätze

- ✅ Listen mit vielen Einträgen (>50) noch bedienbar
- ✅ Pagination oder Limit vorhanden bei potenziell großen Tabellen
- ✅ Bewegungsverlauf Material: nur letzte 10 Einträge geladen

---

## 7. Releaseprozess

```
Feature-Entwicklung
  ↓
Lokaler Test (Console, UI, Workflow)
  ↓
Commit + Push auf main (GitHub)
  ↓
Automatischer Vercel Build startet
  ↓
Build-Status prüfen (Vercel Dashboard)
  ↓
Bei READY: Smoke-Test auf Produktiv-URL
  ↓
Bei Fehler: Hotfix auf main, erneuter Push
  ↓
Produktiv ✅
```

### Build-Fehler-Protokoll

Tritt ein Vercel Build-Fehler auf:

1. Build-Logs in Vercel öffnen
2. Fehler identifizieren (meist Import-Fehler, Syntax-Fehler, fehlende Umgebungsvariablen)
3. Hotfix committen
4. Push auf main — automatischer Rebuild
5. Kein separater Feature-Branch nötig (Micro-Task-Architektur)

---

## 8. Smoke-Test

Nach jedem Deployment auf Produktiv muss der Smoke-Test bestanden werden:

| Test | Erwartetes Ergebnis |
|---|---|
| Login mit gültigen Zugangsdaten | Redirect zu Dashboard |
| Dashboard öffnet | Kennzahlen sichtbar, kein Fehler |
| Auftragsliste öffnet | Mindestens ein Auftrag sichtbar |
| Auftragsakte öffnet | Alle Tabs laden korrekt |
| Material → Materialakte | Bestand sichtbar |
| Rechnungen → Neue Rechnung | Formular lädt |
| Navigation (Sidebar) | Alle Links funktionieren |
| Logout | Session wird beendet, Redirect zu Login |

---

## 9. Fehlerklassifizierung

### Blocker 🔴

**Definition:** Fehler verhindert die Kernfunktion. Deployment darf nicht erfolgen.

Beispiele:
- Login funktioniert nicht
- Aufträge können nicht gespeichert werden
- Rechnung kann nicht erstellt werden
- Build schlägt fehl
- RLS-Lücke: Fremddaten sichtbar

**Handlung:** Sofort fixen. Kein Merge. Kein Deployment.

---

### Kritisch 🟠

**Definition:** Wichtige Funktion beeinträchtigt, aber Workaround vorhanden.

Beispiele:
- Material-Buchung schlägt in Sonderfällen fehl
- Nachkalkulation zeigt falsche Werte
- Umlaut-Fehler bei bestimmten Eingaben

**Handlung:** Fix im nächsten Sprint. Kann deployed werden wenn Blocker-frei.

---

### Mittel 🟡

**Definition:** Komfort- oder Darstellungsproblem ohne funktionalen Einfluss.

Beispiele:
- Loading State fehlt bei einer Aktion
- Fehlermeldung auf Englisch statt Deutsch
- Mobile Layout leicht verschoben

**Handlung:** Im übernächsten Sprint beheben oder in Backlog aufnehmen.

---

### Niedrig 🟢

**Definition:** Kleines UI-Detail, das den Workflow nicht beeinträchtigt.

Beispiele:
- Button-Farbe leicht inkonsistent
- Überschrift einen Pixel zu groß
- Leerzeichen fehlt in einem Label

**Handlung:** Sammeln und gebündelt beheben. Kein eigener Sprint nötig.

---

## 10. Produktreife

Ein Modul erhält den Status **"Produktreif"** erst wenn alle folgenden Kriterien erfüllt sind:

| Kriterium | Prüfung |
|---|---|
| ✅ Technisch fertig | Alle geplanten Features des Moduls implementiert |
| ✅ Fachlich getestet | Vollständiger Workflow-Test bestanden (Kapitel 3) |
| ✅ QA bestanden | Modul-Checkliste (Kapitel 4) vollständig abgehakt |
| ✅ Sicherheit geprüft | RLS und Mandantentrennung getestet (Kapitel 5) |
| ✅ Dokumentiert | Modul in docs/01_PRODUCT_SPECIFICATION.md beschrieben |
| ✅ Roadmap aktualisiert | Status in docs/00_MASTER_ROADMAP.md auf Produktreif gesetzt |

### Aktuelle Produktreife (Stand 2026-07-03)

| Modul | Status |
|---|---|
| Dashboard | 🔶 In Entwicklung |
| CRM (Kunden) | 🔶 In Entwicklung |
| Aufträge | 🔶 In Entwicklung |
| Angebote | 🔶 In Entwicklung |
| Rechnungen | 🔶 In Entwicklung |
| Material | 🔶 In Entwicklung |
| Fahrzeuge | 🔶 In Entwicklung |
| Maschinen | 🔶 In Entwicklung |
| Mitarbeiter | 🔶 In Entwicklung |
| Nachkalkulation | 🔶 In Entwicklung |
| Disposition | ⬜ Geplant |
| Dokumente | ⬜ Geplant |
| Controlling | ⬜ Geplant |

---

*Diese Checkliste ist verbindlich für alle Sprints ab Version 1.0.*
*Technische Architektur: `docs/02_TECHNICAL_ARCHITECTURE.md`*
*Produktspezifikation: `docs/01_PRODUCT_SPECIFICATION.md`*
*Roadmap: `docs/00_MASTER_ROADMAP.md`*