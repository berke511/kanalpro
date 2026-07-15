# ST-001 — Production Stabilization Audit

**Branch:** rebuild-ui-v2  
**Commit:** 137291c (Stand: 2026-07-15)  
**Prüfmethode:** Quellcode-Analyse via GitHub raw API — Live-Tests nicht möglich, da Preview-URL durch **Vercel Deployment Protection (SSO)** vollständig gesperrt ist (alle Routen leiten auf `vercel.com/login` um, bevor die App lädt). Auth-Guard-Status basiert auf `app/dashboard/layout.js`.

---

## Routen-Übersicht

| Route | Erreichbar | Lädt vollständig | Runtime Error | Console Error | Daten sichtbar | Umlaute korrekt | Desktop | Mobile (375px) | Nav zurück | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| /dashboard | Auth-Guard aktiv | ja | nein | n.a. | nein | ja | ja | ja | ja | P2 |
| /dashboard/kunden | Auth-Guard aktiv | ja | nein | n.a. | nein | ❌ 3 Stellen | ja | ja | ja | P1 |
| /dashboard/auftraege | Auth-Guard aktiv | ja | nein | n.a. | nein | ❌ Titel/Subtitle | ja | ⚠️ kein Mobile-Layout | ja | P1 |
| /dashboard/rechnungen | Auth-Guard aktiv | ja | nein | n.a. | nein | ❌ Mojibake (â) | ja | ja | ja | P1 |
| /dashboard/einstellungen | Auth-Guard aktiv | ja | nein | n.a. | nein | ja | ja | ja | ja | STABIL |
| /dashboard/finanzen | Auth-Guard aktiv | ja | nein | n.a. | nein | ja | ja | ja | ja | P2 |
| /dashboard/disposition | Auth-Guard aktiv | ja | nein | n.a. | nein | ❌ Vollständige Mojibake | ja | ja | ja | P1 |
| /dashboard/mein-tag | Auth-Guard aktiv | ja | nein | n.a. | nein | ❌ Weitreichende Mojibake | ja | ja | ja | P1 |
| /dashboard/fahrzeuge | Auth-Guard aktiv | ja | nein | n.a. | nein | ❌ Mojibake + Transkription | ja | ja | ja | P1 |
| /dashboard/mitarbeiter | Auth-Guard aktiv | ja | nein | n.a. | nein | ja | ja | ja | ja | STABIL |
| /dashboard/angebote | Auth-Guard aktiv | ja | nein | n.a. | nein | ja | ja | ⚠️ kein Mobile-Layout | ja | **P0** |

> Auth-Guard aktiv = Route existiert, `layout.js` leitet bei fehlendem Login korrekt auf `/login` um.

---

## Detailbefunde je Route

### /dashboard — P2
- Queries nutzen noch `user_id` statt `company_id` (laut Commit RB-003 sollte fix bereits erfolgt sein — tatsächlicher Code weicht ab)
- KPI-Zahlen können bei Mehrbenutzer-Companies falsche Werte liefern
- Komponenten: `PageHeader`, `KpiCard` korrekt importiert ✅
- Schnellzugriff-Links korrekt ✅

### /dashboard/kunden — P1
- **Umlaut-Fehler (sichtbar im UI):**
  - Tabellenkopf: `Auftraege` → sollte `Aufträge` sein
  - Lösch-Bestätigung: `Loeschen?` → sollte `Löschen?` sein
  - Lösch-Button: `Endgueltig` → sollte `Endgültig` sein
- Abfrage noch mit `user_id` statt `company_id`
- Desktop-Tabelle + Mobile-Cards vorhanden ✅

### /dashboard/auftraege — P1
- **Umlaut-Fehler (sichtbar im UI):**
  - PageHeader title: `"Auftraege"` → sollte `"Aufträge"` sein
  - Subtitle: `"Auftraege gesamt"` → sollte `"Aufträge gesamt"` sein
- Kein dediziertes Mobile-Layout — nur horizontale Scrolltabelle
- Abfrage mit `user_id` statt `company_id`

### /dashboard/rechnungen — P1
- **Mojibake sichtbar im UI:** Fallback-Text `'â'` wird in Tabellen angezeigt statt `'–'`
  - `r.kunden?.name ?? 'â'` — sichtbar wenn kein Kundenname vorhanden
  - `r.datum ? ... : 'â'` — sichtbar wenn kein Datum gesetzt
  - Mobile-Cards betroffen: `r.kunden?.name ?? 'â'`
- Kommentar im Code ebenfalls betroffen: `â vorbereitet fuer PX-004`
- PlanGate korrekt eingebunden ✅
- Desktop-Tabelle mit Bulk-Selection + Mobile-Cards ✅

### /dashboard/einstellungen — STABIL
- 4 Tabs vollständig: Team, Firmendaten, Konto & Sicherheit, Rollen & Rechte ✅
- Einladungs-Modal, Rollen-Management, Passwort-Änderung ✅
- Umlaute korrekt ✅

### /dashboard/finanzen — P2
- Queries korrekt mit `company_id` ✅
- **Stray-Character:** `2` erscheint als sichtbarer Text-Node im JSX an 2 Stellen:
  - Im Angebots-Betrag-Block: `2 </div>` rendert als "2"
  - Vor Schnellaktionen: `2 {/* BEREICH 6 */}` rendert als "2"
- Route ist nicht über Desktop-Sidebar erreichbar (Navigation-Gap)

### /dashboard/disposition — P1
- **Vollständige Mojibake:** ALLE deutschen Sonderzeichen in sämtlichen UI-Strings betroffen
  - `EinsÃ¤tze` statt `Einsätze`
  - `Ã¼bersichtlich` statt `übersichtlich`
  - `Ãberblick` statt `Überblick`
  - `Tagesplanung Ã¶ffnen` statt `Tagesplanung öffnen`
  - `VerfÃ¼gbarkeit`, `KapazitÃ¤ten`, `fÃ¼r EinsÃ¤tze` etc.
  - Trennzeichen `ââ` statt `––`
  - Alle 6 Modul-Button-Labels garbled
- Root-Cause: Datei mit falscher Encoding-Konfiguration gespeichert (UTF-8 als Latin-1 interpretiert)

### /dashboard/mein-tag — P1
- **Weitreichende Mojibake** in Checklist-Labels, Button-Texten, Empty-States:
  - `Ankunft bestÃ¤tigen` statt `Ankunft bestätigen`
  - `EinsÃ¤tze` (KPI-Label), `LÃ¤uftâ¦` (Timer-Status)
  - `Keine EinsÃ¤tze heute` / `FÃ¼r heute sind keine AuftrÃ¤ge geplant.`
  - Buttons: `LÃ¶schen`, `Ãbernehmen`, `HinzufÃ¼gen`
  - Modal-Titel: `Notiz hinzufÃ¼gen`
  - Abschließen-Button: `Einsatz abschlieÃen` statt `Einsatz abschließen`
  - Schnellzugriff: `Alle AuftrÃ¤ge`

### /dashboard/fahrzeuge — P1
- **Encoding-Fehler (gemischte Mojibake und ASCII-Transkriptionen):**
  - Fallback-Text: `'â'` statt `'–'` in Tabellenzellen
  - Punkt-Trenner: `Â·` statt `·`
  - Beschreibungstext: `TUeV-Termine` statt `TÜV-Termine`
  - Filter-Label: `Ausser Betrieb` statt `Außer Betrieb`
  - Typ-Label: `Anhaenger` statt `Anhänger`
  - Bulk-Selection: `ausgewaehlt` statt `ausgewählt`
- Queries korrekt mit `company_id` ✅

### /dashboard/mitarbeiter — STABIL
- Queries mit `company_id` ✅
- Lade-Zustand: `Lädt…` korrekt ✅
- Responsive Grid-Layout ✅

### /dashboard/angebote — P0
- **KRITISCH — Cross-Tenant Datenleck:**
  - Query: `supabase.from('angebote').select('*, kunden(...)').order('erstellt_am', ...)`
  - **Kein `company_id`-Filter, kein `user_id`-Filter** → liefert Angebote ALLER Mandanten
  - Eingeloggte Nutzer sehen potenziell Angebote fremder Unternehmen
- Kein dediziertes Mobile-Card-Layout (nur horizontal scrollbare Tabelle)

---

## Globale Systemprüfung

### Auth-Guard
- ✅ Vorhanden: `app/dashboard/layout.js` → `supabase.auth.getUser()` → Redirect auf `/login`
- ✅ Trial-Ablauf: Redirect auf `/dashboard/upgrade` bei `tage === 0`
- ✅ `einstellungen/page.js` und `mein-tag/page.js` haben zusätzliche eigene Auth-Prüfungen

### Sidebar-Navigation (Desktop)
- ✅ Vorhanden mit 5 Links: Übersicht, Kunden, Aufträge, Rechnungen, Einstellungen
- ❌ **P1 — Navigation-Gap:** Folgende 6 Routen sind NICHT in der Desktop-Sidebar verlinkt:
  - `/dashboard/finanzen`
  - `/dashboard/disposition`
  - `/dashboard/mein-tag`
  - `/dashboard/fahrzeuge`
  - `/dashboard/mitarbeiter`
  - `/dashboard/angebote`

### Mobile Bottom Navigation
- ✅ Vorhanden mit 5 Items: Übersicht, Aufträge, Kunden, Disposition, Mein Tag
- ❌ Nicht in Mobile-Nav: Rechnungen, Einstellungen, Finanzen, Fahrzeuge, Mitarbeiter, Angebote

### Notification Center
- ✅ Vorhanden: `<NotificationCenter companyId={companyId} />` in Desktop- und Mobile-Topbar

### Connection Status
- ✅ Vorhanden: `<ConnectionStatus />` in Desktop- und Mobile-Topbar

### Command Palette (Cmd+K)
- ✅ Vorhanden: `useCommandPalette` Hook + `<CommandPalette companyId={companyId} />`
- Suchfeld-Button mit ⌘K-Hint in Desktop-Sidebar öffnet die Palette

### Logout
- ✅ Vorhanden: `handleLogout()` → `supabase.auth.signOut()` → Redirect auf `/login`
- Desktop-Sidebar: Abmelden-Button mit LogOut-Icon
- `einstellungen/page.js`: zusätzliche Sitzung-beenden-Sektion

---

## Prioritäten-Zusammenfassung

| Priorität | Anzahl | Betroffene Routen / Komponenten |
|---|---|---|
| P0 | 1 | /dashboard/angebote (Cross-Tenant Datenleck — fehlender Tenant-Filter) |
| P1 | 6 | disposition (Mojibake), mein-tag (Mojibake), fahrzeuge (Encoding), rechnungen (Mojibake), kunden (Umlaute), Sidebar Navigation-Gap (6 Routen fehlen) |
| P2 | 3 | /dashboard (user_id-Abfragen), /dashboard/auftraege (kein Mobile-Layout, Umlaut-Titel), /dashboard/finanzen (Stray-Character) |
| STABIL | 3 | /dashboard/einstellungen, /dashboard/mitarbeiter, /dashboard (Struktur) |

---

## Empfohlener Fix-Sprint #1

1. **P0 — Sofort:** `angebote/page.js` — company_id-Filter zur Query hinzufügen + RLS-Policy prüfen
2. **P1 — Tag 1:** `disposition/page.js` und `mein-tag/page.js` — Dateien mit korrektem UTF-8 neu speichern (iconv/re-encode)
3. **P1 — Tag 1:** `fahrzeuge/page.js` und `rechnungen/page.js` — Mojibake-Fallbacks (`'â'`, `'Â·'`) und ASCII-Transkriptionen korrigieren
4. **P1 — Tag 2:** Desktop-Sidebar um alle 6 fehlenden Routen ergänzen
5. **P2 — Tag 3:** `auftraege/page.js` Mobile-Cards ergänzen; `finanzen/page.js` stray `2` entfernen
6. **P2 — Tag 4:** user_id → company_id Migration in `dashboard/page.js` + `kunden/page.js` + `auftraege/page.js` abschließen

---

*Prüfmethode: Quellcode-Analyse via GitHub raw API, Branch rebuild-ui-v2, Commit 137291c (2026-07-15). Live-Tests waren nicht möglich: Preview-URL hinter Vercel Deployment Protection.*
