# KanalPro — Datenbankstruktur & Architektur

## Multi-Tenant Architektur

Jedes Unternehmen ist vollständig isoliert. Alle Datentabellen tragen eine `company_id`, und Supabase Row Level Security (RLS) stellt sicher, dass kein Benutzer Daten eines anderen Unternehmens sehen oder ändern kann.

---

## Kern-Tabellen

### `companies` — Unternehmen (Mandanten)

| Spalte          | Typ       | Beschreibung                        |
|-----------------|-----------|-------------------------------------|
| id              | UUID (PK) | Primärschlüssel                     |
| name            | TEXT      | Unternehmensname                    |
| slug            | TEXT      | URL-freundlicher Kurzname (unique)  |
| logo_url        | TEXT      | Logo-URL                            |
| adresse         | TEXT      | Straße + Hausnummer                 |
| plz             | TEXT      | Postleitzahl                        |
| ort             | TEXT      | Stadt                               |
| bundesland      | TEXT      | Bundesland                          |
| land            | TEXT      | Land (Standard: Deutschland)        |
| telefon         | TEXT      | Telefonnummer                       |
| email           | TEXT      | Unternehmens-E-Mail                 |
| website         | TEXT      | Webseite                            |
| steuernummer    | TEXT      | Steuernummer                        |
| ust_id          | TEXT      | Umsatzsteuer-ID                     |
| handelsregister | TEXT      | Handelsregisternummer               |
| iban            | TEXT      | IBAN für Rechnungen                 |
| bic             | TEXT      | BIC                                 |
| bank            | TEXT      | Bankname                            |
| created_at      | TIMESTAMP | Erstellungsdatum                    |
| updated_at      | TIMESTAMP | Zuletzt aktualisiert                |

---

### `company_members` — Benutzer & Mitarbeiter

Enthält sowohl Login-fähige Benutzer (`kann_login = true`, `user_id` gesetzt) als auch reine Mitarbeiterdatensätze ohne Systemzugang (`user_id = NULL`).

| Spalte        | Typ           | Beschreibung                            |
|---------------|---------------|-----------------------------------------|
| id            | UUID (PK)     | Primärschlüssel                         |
| company_id    | UUID (FK)     | → companies.id                          |
| user_id       | UUID (FK)     | → auth.users.id (nullable)              |
| role          | company_role  | Rolle (siehe Rollenmodell)              |
| vorname       | TEXT          | Vorname                                 |
| nachname      | TEXT          | Nachname                                |
| email         | TEXT          | E-Mail                                  |
| telefon       | TEXT          | Telefon                                 |
| mobil         | TEXT          | Mobilnummer                             |
| position      | TEXT          | Berufsbezeichnung                       |
| abteilung     | TEXT          | Abteilung                               |
| avatar_url    | TEXT          | Profilbild-URL                          |
| is_active     | BOOLEAN       | Aktiv/inaktiv                           |
| kann_login    | BOOLEAN       | Hat Systemzugang                        |
| eingestellt_am| DATE          | Einstellungsdatum                       |
| notizen       | TEXT          | Interne Notizen                         |
| created_at    | TIMESTAMP     | Erstellungsdatum                        |
| updated_at    | TIMESTAMP     | Zuletzt aktualisiert                    |

---

## Datentabellen (alle mit company_id)

### `kunden` — Kundenverwaltung
- `company_id` FK → companies
- Alle Kundendaten gehören exklusiv einem Unternehmen

### `auftraege` — Auftragsverwaltung
- `company_id` FK → companies
- Aufträge sind unternehmensintern

### `infrastruktur` — Objekte / Liegenschaften
- `company_id` FK → companies
- Rohrnetzdaten und Gebäude-Objekte

### `rohr_ereignisse` — Digitaler Zwilling / Rohrlebenslauf
- `company_id` FK → companies
- Ereignisse und Inspektionen pro Objekt

### `abonnements` — Abonnements & Trial
- `company_id` FK → companies
- Plan, Status, Trial-Zeitraum

### `rechnungen` — Rechnungsverwaltung
- `company_id` FK → companies

### `einstellungen` — Unternehmenseinstellungen
- `company_id` FK → companies

### `objekte` — Verknüpfte Objekte
- `company_id` FK → companies

---

## Neue Tabellen

### `fahrzeuge` — Fuhrparkverwaltung

| Spalte        | Typ       | Beschreibung                                             |
|---------------|-----------|-----------------------------------------------------------|
| id            | UUID (PK) |                                                           |
| company_id    | UUID (FK) | → companies                                               |
| kennzeichen   | TEXT      | KFZ-Kennzeichen                                          |
| marke         | TEXT      | Fahrzeugmarke                                             |
| modell        | TEXT      | Modellbezeichnung                                         |
| typ           | TEXT      | PKW / LKW / Transporter / Anhänger / Spezialfahrzeug     |
| baujahr       | INT       |                                                           |
| farbe         | TEXT      |                                                           |
| tuev_bis      | DATE      | TÜV-Fälligkeit                                           |
| hu_bis        | DATE      | HU-Fälligkeit                                            |
| km_stand      | INT       | Kilometerstand                                           |
| kraftstoff    | TEXT      | Diesel / Benzin / Elektro / Hybrid / Gas                 |
| zustand       | TEXT      | verfügbar / in_einsatz / wartung / defekt / außer_betrieb|
| zugewiesen_an | UUID (FK) | → company_members                                        |
| versicherung  | TEXT      | Versicherungsgesellschaft                                 |
| notizen       | TEXT      |                                                           |

### `maschinen` — Maschinen & Geräte

| Spalte                  | Typ       | Beschreibung                                              |
|-------------------------|-----------|-----------------------------------------------------------|
| id                      | UUID (PK) |                                                           |
| company_id              | UUID (FK) | → companies                                               |
| name                    | TEXT      | Bezeichnung                                               |
| typ                     | TEXT      | Kamera / Hochdruckspøler / Fräse / Roboter / Pumpe etc.  |
| hersteller              | TEXT      |                                                           |
| modell                  | TEXT      |                                                           |
| seriennummer            | TEXT      |                                                           |
| baujahr                 | INT       |                                                           |
| anschaffungsdatum       | DATE      |                                                           |
| anschaffungspreis       | NUMERIC   |                                                           |
| letzter_service         | DATE      |                                                           |
| naechster_service       | DATE      |                                                           |
| service_intervall_tage  | INT       |                                                           |
| zustand                 | TEXT      | verfügbar / in_einsatz / wartung / defekt / außer_betrieb|
| zugewiesen_an           | UUID (FK) | → company_members                                         |
| lagerort                | TEXT      |                                                           |
| notizen                 | TEXT      |                                                           |

### `dokumente` — Dokumentenverwaltung

| Spalte          | Typ       | Beschreibung                                                      |
|-----------------|-----------|-------------------------------------------------------------------|
| id              | UUID (PK) |                                                                   |
| company_id      | UUID (FK) | → companies                                                       |
| name            | TEXT      | Dateiname / Bezeichnung                                           |
| typ             | TEXT      | Rechnung / Angebot / Protokoll / Bericht / Zertifikat / Foto etc.|
| datei_url       | TEXT      | URL in Supabase Storage                                           |
| datei_pfad      | TEXT      | Storage-Pfad                                                      |
| datei_groesse   | BIGINT    | Dateigröße in Bytes                                               |
| mime_type       | TEXT      |                                                                   |
| beschreibung    | TEXT      |                                                                   |
| referenz_typ    | TEXT      | auftrag / kunde / infrastruktur / mitarbeiter / fahrzeug / maschine|
| referenz_id     | UUID      | ID des verknüpften Datensatzes                                    |
| tags            | TEXT[]    | Suchbegriffe                                                      |
| hochgeladen_von | UUID (FK) | → company_members                                                 |
| created_at      | TIMESTAMP |                                                                   |

---

## Rollenmodell

### Rollen (Enum `company_role`)

| Rolle         | Rang | Beschreibung                                          |
|---------------|------|-------------------------------------------------------|
| inhaber       | 6    | Vollzugriff, Abrechnung, kann Unternehmen löschen     |
| administrator | 5    | Vollzugriff außer Abrechnung                          |
| disponent     | 4    | Aufträge, Einsatzplanung, Fahrzeuge, Kunden (lesend)  |
| buero         | 3    | Kunden, Rechnungen, Aufträge (kein Löschen)           |
| techniker     | 2    | Eigene Aufträge, Dokumente hochladen                  |
| fahrer        | 1    | Eigene Routen und Aufträge (lesend)                   |

### Berechtigungsmatrix

| Berechtigung         | Inhaber | Admin | Disponent | Büro | Techniker | Fahrer |
|----------------------|:-------:|:-----:|:---------:|:----:|:---------:|:------:|
| Unternehmen bearbeiten | ✓     | ✓     |           |      |           |        |
| Mitglieder einladen  | ✓       | ✓     |           |      |           |        |
| Mitglieder verwalten | ✓       | ✓     |           |      |           |        |
| Kunden erstellen     | ✓       | ✓     | ✓         | ✓    |           |        |
| Kunden löschen       | ✓       | ✓     |           |      |           |        |
| Aufträge erstellen   | ✓       | ✓     | ✓         | ✓    |           |        |
| Aufträge zuweisen    | ✓       | ✓     | ✓         |      |           |        |
| Aufträge löschen     | ✓       | ✓     | ✓         |      |           |        |
| Aufträge bearbeiten  | ✓       | ✓     | ✓         | ✓    | ✓         |        |
| Einsatzplanung       | ✓       | ✓     | ✓         | ✓ (r)|           |        |
| Rechnungen           | ✓       | ✓     |           | ✓    |           |        |
| Digitaler Zwilling   | ✓       | ✓     | ✓         | ✓    | ✓ (r)     |        |
| Fahrzeuge verwalten  | ✓       | ✓     | ✓         |      |           |        |
| Maschinen verwalten  | ✓       | ✓     | ✓         |      |           |        |
| Dokumente hochladen  | ✓       | ✓     | ✓         | ✓    | ✓         |        |
| Einstellungen        | ✓       | ✓     |           | ✓ (r)|           |        |
| Abrechnung/Billing   | ✓       |       |           |      |           |        |

*(r) = nur lesen*

---

## Row Level Security (RLS)

### Prinzip

Alle Tabellen haben RLS aktiviert. Die zentrale Funktion `get_my_company_id()` gibt die `company_id` des aktuell eingeloggten Users zurück. Alle Policies filtern auf dieser Basis — ein User sieht **ausschließlich** Daten seiner eigenen Company.

### Helper-Funktionen

```sql
-- Gibt company_id des eingeloggten Users zurück
get_my_company_id() → UUID

-- Gibt Rolle des eingeloggten Users zurück  
get_my_role() → company_role

-- Prüft ob User mindestens eine bestimmte Rolle hat
has_min_role(min_role company_role) → BOOLEAN
```

### Policy-Prinzip

```sql
-- Beispiel: Kunden
CREATE POLICY "kunden_all" ON kunden
  FOR ALL USING (company_id = get_my_company_id());
```

Datentabellen (kunden, auftraege, infrastruktur, etc.) haben eine einfache ALL-Policy: Zugriff wenn `company_id` übereinstimmt.

Verwaltungstabellen (companies, company_members) haben granulare Policies nach Rolle.

---

## Automatisierung

### Trigger: Neue Registrierung

Wenn ein neuer User in `auth.users` angelegt wird:
1. Neues `companies`-Eintrag mit `firmenname` aus Registrierungsformular
2. `company_members`-Eintrag: User wird als **Inhaber** eingetragen
3. `kann_login = true`, `is_active = true`

Die Metadaten (`vorname`, `nachname`, `firmenname`) werden beim Signup über `options.data` übergeben.

---

## Frontend-Integration

### `lib/roles.js`

```js
import { roleHasPermission, hasMinRole, getMyCompanyAndRole } from '@/lib/roles';

// Berechtigung prøfen
const canDelete = roleHasPermission(userRole, 'kunden.delete');

// Minimum-Rolle prøfen
const isAtLeastAdmin = hasMinRole(userRole, 'administrator');

// Aktuelle Rolle laden
const { companyId, role, member } = await getMyCompanyAndRole();
```

### Verwendung in Komponenten

```js
'use client';
import { useEffect, useState } from 'react';
import { getMyCompanyAndRole, roleHasPermission } from '@/lib/roles';

export default function Page() {
  const [role, setRole] = useState(null);

  useEffect(() => {
    getMyCompanyAndRole().then(({ role }) => setRole(role));
  }, []);

  return (
    <div>
      {roleHasPermission(role, 'kunden.delete') && (
        <button>Kunden löschen</button>
      )}
    </div>
  );
}
```

---

## Datenbankdiagramm (vereinfacht)

```
auth.users
    │
    ▼
company_members ──────────────── companies
    │                                │
    │         ┌──────────────────────┤
    │         │                      │
    ▼         ▼                      ▼
  (role)   kunden              abonnements
           auftraege
           infrastruktur
           rohr_ereignisse
           rechnungen
           einstellungen
           objekte
           fahrzeuge ◄── company_members (zugewiesen_an)
           maschinen ◄── company_members (zugewiesen_an)
           dokumente ◄── company_members (hochgeladen_von)
```

---

## Skalierbarkeit

- **Mehrere User pro Unternehmen**: `company_members` unterstützt beliebig viele User je Company
- **Mehrere Rollen**: Erweiterbar durch ALTER TYPE auf dem ENUM
- **Mandantentrennung**: Vollständig durch RLS auf DB-Ebene — kein App-Code nötig
- **Performance**: Alle `company_id`-Spalten sind indexiert
