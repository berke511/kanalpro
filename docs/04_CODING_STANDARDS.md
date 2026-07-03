# KanalPro Coding Standards

> Version: 1.0
> Letzte Aktualisierung: 2026-07-03
> Verbindlich für alle Entwicklungen ab Version 1.0

---

## 1. Allgemeine Prinzipien

1. **Lesbarkeit vor Cleverness** — Code wird häufiger gelesen als geschrieben. Ein klarer, etwas längerer Code schlägt eine kompakte, schwer verständliche Lösung.
2. **Kleine, klar abgegrenzte Änderungen** — Max. 1–2 Dateien pro Sprint. Kein Scope-Creep. Jede Änderung ist isoliert und sofort deploybar.
3. **Keine unnötigen Abhängigkeiten** — Keine neuen npm-Pakete ohne klaren Bedarf. Lieber native Browser-APIs oder Supabase-eigene Features nutzen.
4. **Keine toten Codepfade** — Auskommentierter Code wird gelöscht, nicht eingecheckt. Git-History ist die Versionskontrolle.
5. **Konsistente Benennung** — Deutsche Variablennamen für fachliche Konzepte, englische für technische Patterns (state, handler, ref).

---

## 2. Projektstruktur

```
kanalpro/
├── app/              ← Next.js App Router — Seiten und Layouts
├── components/       ← Wiederverwendbare UI-Komponenten
├── lib/              ← Hilfsfunktionen, Supabase-Client, Konfiguration
├── docs/             ← Produktdokumentation (kein Code)
└── public/           ← Statische Assets (Logos, Favicons)
```

### Regeln für neue Dateien

| Situation | Aktion |
|---|---|
| Neue Seite (Liste oder Detail) | Neue Datei in `app/dashboard/[modul]/` |
| Neue Neuanlage-Seite | `app/dashboard/[modul]/neu/page.js` |
| Wiederverwendbare UI (>2 Nutzungen) | Neue Datei in `components/` |
| Hilfsfunktion (nicht React) | Neue Datei in `lib/` |
| Dokumentation | Neue Datei in `docs/` |
| Statisches Asset | In `public/` |

### Wann KEIN neuer Ordner

- Kein neuer Ordner für ein einzelnes Feature
- Kein `utils/` Ordner — Hilfsfunktionen gehören nach `lib/`
- Kein `pages/` Ordner — ausschließlich App Router (`app/`)
- Kein `styles/` Ordner — ausschließlich Tailwind CSS

---

## 3. React & Next.js

### Functional Components

Ausschließlich Functional Components. Keine Klassen-Komponenten.

```js
// ✅ Korrekt
export default function AuftragListe() {
  return <div>...</div>
}

// ❌ Falsch
class AuftragListe extends React.Component { ... }
```

### Hooks

```js
// ✅ Pflicht-Hooks
const [daten, setDaten] = useState([])        // Daten
const [laden, setLaden] = useState(true)      // Loading State
const [fehler, setFehler] = useState(null)    // Error State

// useEffect für Datenabruf
useEffect(() => {
  async function laden() {
    // ... Supabase-Abfragen
    setLaden(false)
  }
  laden()
}, [id]) // Dependency Array immer angeben
```

### Promise.all für unabhängige Queries

```js
// ✅ Korrekt — parallel
const [{ data: auftrag }, { data: material }] = await Promise.all([
  supabase.from('auftraege').select('*').eq('id', id).single(),
  supabase.from('auftrag_material').select('*').eq('auftrag_id', id)
])

// ❌ Falsch — sequenziell ohne Grund
const { data: auftrag } = await supabase.from('auftraege').select('*').eq('id', id).single()
const { data: material } = await supabase.from('auftrag_material').select('*').eq('auftrag_id', id)
```

### Loading und Error States

Jede Seite mit Datenabfragen muss Loading und Error State haben:

```js
if (laden) return <div className="text-center py-8">Laden...</div>
if (fehler) return <div className="text-red-600 p-4">{fehler}</div>
```

### Keine unnötigen Re-Renders

- State nicht in Render-Funktionen setzen
- Keine Inline-Objekte als Props (`style={{ color: 'red' }}` in Loops vermeiden)
- `useEffect` Dependency Array immer vollständig angeben

### Seitenstruktur (Standard)

```js
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/supabase'

export default function MeinModul() {
  const router = useRouter()
  const [daten, setDaten] = useState([])
  const [laden, setLaden] = useState(true)
  const [fehler, setFehler] = useState(null)

  useEffect(() => {
    async function laden() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      // ... weitere Abfragen
      setLaden(false)
    }
    laden()
  }, [])

  if (laden) return <div className="text-center py-8">Laden...</div>
  if (fehler) return <div className="text-red-600 p-4">{fehler}</div>

  return <div>...</div>
}
```

---

## 4. Supabase

### Client-Import

```js
// ✅ Korrekt — eigener Singleton-Client
import supabase from '@/lib/supabase'

// ❌ Falsch — kein auth-helpers
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
```

### company_id immer berücksichtigen

```js
// ✅ Korrekt — company_id aus member holen
const { data: member } = await supabase
  .from('company_members')
  .select('company_id')
  .eq('user_id', user.id)
  .single()

// Beim Einfügen immer company_id mitgeben
await supabase.from('auftraege').insert({ ...form, company_id: member.company_id })

// ❌ Falsch — company_id vergessen
await supabase.from('auftraege').insert({ ...form })
```

### RLS niemals umgehen

- Kein `supabase.rpc('set_claim', ...)` um RLS zu deaktivieren
- Kein Service-Role-Key im Frontend
- Alle Operationen über den Anon-Key (RLS greift automatisch)

### Nur benötigte Felder selektieren

```js
// ✅ Korrekt — nur was gebraucht wird
supabase.from('auftraege').select('id, titel, status, created_at')

// Akzeptabel bei Detailseiten wo alle Felder gebraucht werden
supabase.from('auftraege').select('*').eq('id', id).single()

// ❌ Vermeiden — select('*') in Listenseiten mit vielen Einträgen
supabase.from('auftraege').select('*')
```

### Fehlerbehandlung bei jeder Operation

```js
const { data, error } = await supabase.from('auftraege').select('*')
if (error) {
  setFehler('Fehler beim Laden der Aufträge: ' + error.message)
  setLaden(false)
  return
}
```

### Joins statt separate Queries

```js
// ✅ Korrekt — Join in einer Query
supabase.from('auftraege').select('*, kunden(name, email)')

// ❌ Vermeiden — separate Query für Kundendaten
const auftrag = await supabase.from('auftraege').select('*').eq('id', id)
const kunde = await supabase.from('kunden').select('*').eq('id', auftrag.kunde_id)
```

---

## 5. UI/UX

### Cards (Karten)

```jsx
<div className="bg-white rounded-lg border p-6">
  <h3 className="text-lg font-semibold mb-4">Kartenüberschrift</h3>
  {/* Inhalt */}
</div>
```

Alle Karten: weißer Hintergrund, abgerundete Ecken (`rounded-lg`), Border, Padding `p-6`.

### Buttons

```jsx
{/* Primärer Button (Hauptaktion) */}
<button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
  Speichern
</button>

{/* Sekundärer Button (Abbrechen, Zurück) */}
<button className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50">
  Abbrechen
</button>

{/* Gefährlicher Button (Löschen) */}
<button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
  Löschen
</button>
```

### Status-Badges

```jsx
{/* Grün: abgeschlossen, bezahlt, aktiv */}
<span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">Abgeschlossen</span>

{/* Gelb: in Bearbeitung, ausstehend */}
<span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">In Bearbeitung</span>

{/* Rot: überfällig, Fehler */}
<span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">Überfällig</span>

{/* Grau: Entwurf, inaktiv */}
<span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">Entwurf</span>
```

### Empty States

Jede Liste braucht einen Empty State:

```jsx
{daten.length === 0 && (
  <div className="text-center py-8 text-gray-500">
    Noch keine Einträge vorhanden.
  </div>
)}
```

### Responsive Design

- Mobile-first: Tailwind-Klassen ohne Prefix gelten für Mobile
- `md:` Prefix für Tablet und größer
- `lg:` Prefix für Desktop

```jsx
{/* ✅ Mobile-first Grid */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

### Umlaute und Texte

- Alle UI-Texte auf Deutsch
- Korrekte Umlaute: ä ö ü Ä Ö Ü ß — keine Ersetzungen (ae, oe, ue)
- Fehlermeldungen verständlich und auf Deutsch
- Keine englischen Texte in der Benutzeroberfläche (Ausnahme: technische Labels wie "ID")

---

## 6. Micro-Task-Regeln

Jeder Sprint-Task muss folgende Abschnitte enthalten:

```
# KANALPRO – SPRINT X.Y – TITEL

ARBEITSMODUS: [DOKUMENTATION | BACKEND | FRONTEND | FULLSTACK]

ROADMAP-REFERENZ
  Sprint X → Phase Y

BETROFFENE DATEIEN
  Geändert: [Dateipfade]
  Neu: [Dateipfade]

WAS NICHT GEÄNDERT WERDEN DARF
  [Explizite Einschränkungen]

ZIEL
  [Klare Beschreibung des Ergebnisses]

INHALT
  [Technische Spezifikation]

DEFINITION OF DONE
  ✓ [Messbare Kriterien]

DOKUMENTATION
  [Fragen die beantwortet werden müssen]

BENACHRICHTIGUNG
  Dispatch | Desktop | Keine

ABSCHLUSS
  [Commit, Push, Benachrichtigung]
```

### Grenzen eines Micro-Tasks

- Max. 1–2 Dateien geändert oder neu
- Keine Datenbankänderungen ohne explizite Anforderung
- Kein Refactoring bestehender Dateien ohne explizite Anforderung
- Kein Scope-Creep: nur was in der Spezifikation steht

---

## 7. Commit-Konvention

Format: `type: kurze beschreibung`

| Prefix | Verwendung | Beispiel |
|---|---|---|
| `feat:` | Neues Feature | `feat: Materialverbrauch auf Auftrag buchen` |
| `fix:` | Bugfix | `fix: Negativbestand-Validierung korrigiert` |
| `docs:` | Dokumentation | `docs: Sprint 0.5 Coding Standards erstellen` |
| `refactor:` | Code-Umstrukturierung ohne Funktionsänderung | `refactor: Datenbankabfragen in useEffect konsolidiert` |
| `perf:` | Performance-Verbesserung | `perf: Promise.all statt sequenzielle Queries` |
| `test:` | Tests hinzugefügt/geändert | `test: Smoke-Test für Rechnungsmodul` |
| `chore:` | Hilfstätigkeiten (Dependencies, Config) | `chore: next.config.js aktualisiert` |

### Regeln

- Commit-Nachricht auf Deutsch oder Englisch, konsistent im Projekt
- Keine langen Commit-Nachrichten in der ersten Zeile (max. 72 Zeichen)
- Kein `WIP`, `fix stuff`, `update` ohne Kontext
- Jeder Commit sollte für sich allein verständlich sein

---

## 8. Dokumentationspflicht

Nach jeder Änderung prüfen und ggf. aktualisieren:

| Dokument | Wann aktualisieren |
|---|---|
| `docs/00_MASTER_ROADMAP.md` | Sprint abgeschlossen, neuer Sprint geplant |
| `docs/01_PRODUCT_SPECIFICATION.md` | Neues Modul, geänderte Geschäftslogik |
| `docs/02_TECHNICAL_ARCHITECTURE.md` | Neue Tabelle, neues Muster, neue Seite |
| `docs/03_QA_CHECKLIST.md` | Neues Modul, neue Teststufe |
| `docs/04_CODING_STANDARDS.md` | Neues Pattern, neue Konvention |
| Changelog (geplant) | Jede funktionale Änderung |

**Faustregel:** Wenn ein Entwickler, der heute neu ins Projekt kommt, die Änderung aus der Dokumentation verstehen kann — ist die Dokumentation ausreichend.

---

## 9. Code Review Checkliste

Vor jedem Merge / Deployment prüfen:

### Lesbarkeit
- ✅ Variablennamen selbsterklärend
- ✅ Keine magic numbers (Werte als benannte Konstanten)
- ✅ Kommentare nur wo wirklich nötig (Code sollte sich selbst erklären)

### Wiederverwendbarkeit
- ✅ Keine duplizierte Logik (DRY: Don't Repeat Yourself)
- ✅ Wiederverwendbare UI in `components/` ausgelagert (wenn >2 Nutzungen)

### Performance
- ✅ Promise.all für unabhängige Queries
- ✅ Keine N+1-Queries
- ✅ Select nur benötigte Felder

### Sicherheit
- ✅ company_id bei allen Inserts gesetzt
- ✅ RLS nicht umgangen
- ✅ Auth-Check am Seitenanfang

### Fehlerbehandlung
- ✅ Jede Supabase-Operation hat Error-Handling
- ✅ Fehlermeldungen in der UI sichtbar
- ✅ Kein `console.log` in Production-Code

### Responsive
- ✅ Mobile-Viewport getestet (375px)
- ✅ Tabellen auf Mobile scrollbar

### Konsistenz
- ✅ Card-Styling einheitlich
- ✅ Button-Styling einheitlich
- ✅ Umlaute korrekt
- ✅ Texte auf Deutsch

---

## 10. Langfristige Leitlinien

### Single Source of Truth
Jeder Datenpunkt hat genau eine Quelle. Keine Datenkopien in verschiedenen Tabellen.

### Keine doppelte Datenhaltung
Kundendaten in `kunden`, nie redundant in `auftraege` oder `rechnungen` speichern. Referenzieren statt kopieren.

### Wiederverwendbare Komponenten
Wenn ein UI-Element in mehr als zwei Modulen vorkommt: in `components/` auslagern. Beispiele: Status-Badge, Warn-Banner, Kennzahlen-Karte.

### Fachliche Logik klar von UI trennen
Berechnungen (Nachkalkulation, Bestandsprüfung) nicht inline im JSX. Stattdessen:

```js
// ✅ Berechnung außerhalb des JSX
const materialkosten = auftragMaterial.reduce((s, m) => s + (m.gesamtpreis || 0), 0)
const arbeitsstunden = einsatz ? ((new Date(einsatz.arbeit_beendet_at) - new Date(einsatz.arbeit_begonnen_at)) / 3600000).toFixed(1) : null

// Dann im JSX nur Darstellung
return <div>{materialkosten.toFixed(2)} €</div>
```

### Erweiterbarkeit vor kurzfristigen Workarounds
Kein "Quick Fix" der die Architektur verschlechtert. Wenn ein sauberer Fix 30 Minuten mehr kostet — es ist die richtige Entscheidung.

---

*Diese Coding Standards gelten verbindlich für alle Entwicklungen ab Version 1.0.*
*Qualitätsprüfung: `docs/03_QA_CHECKLIST.md`*
*Technische Architektur: `docs/02_TECHNICAL_ARCHITECTURE.md`*
*Roadmap: `docs/00_MASTER_ROADMAP.md`*