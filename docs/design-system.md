# KanalPro Design System — PX-100

**Version:** 1.0.0  
**Branch:** clean-rebuild-v3  
**Erstellt:** 23.07.2026  
**Gilt ab:** PX-100 (Grundlage für PX-200+)

---

## Philosophie

KanalPro V3 richtet sich an Geschäftsführer und Disponenten in Rohr-/Kanal-/Industrieservicebetrieben. Das Design orientiert sich an modernen Premium-SaaS-Produkten (Linear, Vercel, Notion, Stripe) hinsichtlich **Klarheit, Weißraum, Typografie und Informationshierarchie**.

**Prinzipien:**
1. **Klarheit über Kreativität** — jede Seite beantwortet sofort eine Frage
2. **Konsistenz** — gleiche Abstände, gleiche Radien, gleiche Interaktionen überall
3. **Dringlichkeit sichtbar machen** — Rot für Kritisches, Gelb für Warnungen, Grün für Positives
4. **Minimal, aber vollständig** — kein Platzhaltertext, keine leeren Karten ohne Inhalt

---

## 1. Farben

### Primärfarbe — Indigo
Ausgewählt, weil sie modern, professionell und nicht zu generisch blau ist. Bereits in `einstellungen/page.jsx` als `#6366f1` verwendet.

| Token       | HEX       | Tailwind      | Verwendung                              |
|-------------|-----------|---------------|-----------------------------------------|
| primary-50  | `#eef2ff` | `primary-50`  | Hover-Hintergrund, aktive Sidebar       |
| primary-100 | `#e0e7ff` | `primary-100` | Focus-Ringe, subtile Highlights         |
| primary-500 | `#6366f1` | `primary-500` | Sekundäre Aktionen, Icons               |
| primary-600 | `#4f46e5` | `primary-600` | **Haupt-CTA-Buttons**                   |
| primary-700 | `#4338ca` | `primary-700` | Hover-State CTA-Buttons                 |

### Status-Farben

| Status  | HEX (500) | Hintergrund | Tailwind-Klassen                                     |
|---------|-----------|-------------|------------------------------------------------------|
| success | `#22c55e` | `#f0fdf4`   | `text-green-700 bg-green-50 border-green-200`        |
| warning | `#f59e0b` | `#fffbeb`   | `text-amber-700 bg-amber-50 border-amber-200`        |
| danger  | `#f43f5e` | `#fff1f2`   | `text-rose-700 bg-rose-50 border-rose-200`           |
| info    | `#0ea5e9` | `#f0f9ff`   | `text-blue-700 bg-blue-50 border-blue-200`           |

> **Regel:** Überfällige Rechnungen → `danger`. Ausstehende Zahlungen → `warning`. Bezahlt → `success`.

### Neutral-Farben (Surfaces, Text, Borders)

| Rolle             | HEX       | CSS Var                    | Verwendung                        |
|-------------------|-----------|----------------------------|-----------------------------------|
| Background        | `#f8fafc` | `--color-bg`               | Seitenhintergrund (slate-50)      |
| Surface           | `#ffffff` | `--color-surface`          | Karten, Sidebar                   |
| Surface Muted     | `#f1f5f9` | `--color-surface-muted`    | Tabellen-Header, Inputs disabled  |
| Border            | `#e2e8f0` | `--color-border`           | Karten, Inputs, Tabellen          |
| Border Subtle     | `#f1f5f9` | `--color-border-subtle`    | Tabellen-Divider, Card-Footer     |
| Border Strong     | `#cbd5e1` | `--color-border-strong`    | Hover-Borders                     |
| Text Primary      | `#0f172a` | `--color-text-primary`     | Headlines, wichtiger Content      |
| Text Secondary    | `#64748b` | `--color-text-secondary`   | Labels, Beschreibungen            |
| Text Tertiary     | `#94a3b8` | `--color-text-tertiary`    | Platzhalter, Hints                |
| Text Disabled     | `#cbd5e1` | `--color-text-disabled`    | Deaktivierte Felder               |

---

## 2. Typografie

### Font-Stack
```
Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", ...
```
Inter wird bevorzugt. Falls nicht geladen, greift der Systemfont.

### Typografie-Scale

| Rolle           | Klassen                                          | Beispiel-Kontext                 |
|-----------------|--------------------------------------------------|----------------------------------|
| Page Title (H1) | `text-2xl font-semibold tracking-tight`          | Seitenüberschrift                |
| Section Title   | `text-xl font-semibold`                          | Card-Überschriften (groß)        |
| Card Title      | `text-base font-semibold`                        | Card.Title                       |
| Body            | `text-sm text-gray-700`                          | Tabellen, Formulare, Listen      |
| Small           | `text-xs text-gray-500`                          | Labels, Helper-Text, Timestamps  |
| Table Header    | `text-xs font-semibold uppercase tracking-wide`  | Tabellenspalten-Überschriften    |
| KPI-Zahl        | `text-3xl font-bold tabular-nums tracking-tight` | KPI-karten, Dashboard-Werte      |
| Badge/Label     | `text-xs font-medium`                            | Status-Badges                    |

### Regeln
- Niemals `font-bold` für Body-Text → zu schwer
- `tabular-nums` für alle Zahlen (verhindert Layout-Sprünge bei Wertänderungen)
- `tracking-tight` für große Headlines (≥ 1.5rem)
- `leading-relaxed` für mehrzeiligen Beschreibungstext

---

## 3. Spacing (8px-Raster)

Alle Abstände sind Vielfache von 4px (Tailwind) oder 8px.

| Token    | px  | Tailwind    | Verwendung                         |
|----------|-----|-------------|------------------------------------|
| space-1  | 4   | `p-1`       | Icon-Padding, Badge-Gap           |
| space-2  | 8   | `p-2`       | Kompakte Elemente                 |
| space-3  | 12  | `p-3`       | Sidebar-Link-Padding              |
| space-4  | 16  | `p-4`       | Card-Content (kompakt)            |
| space-5  | 20  | `p-5`       | **Card-Content (Standard)**       |
| space-6  | 24  | `p-6`       | Card-Header, Formulare            |
| space-8  | 32  | `p-8`       | Seitenrand (Desktop)              |
| space-10 | 40  | `p-10`      | Empty State Padding               |

**Hauptregel:** Cards haben `px-6 py-5` Content, `px-6 pt-5 pb-0` Header. Page.Content nutzt `space-y-5`.

---

## 4. Border-Radius

| Token   | px  | Tailwind     | Verwendung                           |
|---------|-----|--------------|-------------------------------------|
| xs      | 4   | `rounded-xs` | Icons in Tags                       |
| sm      | 6   | `rounded-sm` | Kompakte Elemente                   |
| md      | 8   | `rounded-md` | Buttons (xs/sm), Input              |
| lg      | 12  | `rounded-lg` | **Buttons (md/lg), Inputs Standard**|
| xl      | 16  | `rounded-xl` | **Cards Standard**                  |
| 2xl     | 20  | `rounded-2xl`| **Dialoge, Modals**                 |
| 3xl     | 24  | `rounded-3xl`| Große Feature-Cards                 |
| full    | ∞   | `rounded-full`| Badges, Avatare, Circular Icons    |

---

## 5. Schatten

| Token       | Verwendung                             | CSS-Wert                                                          |
|-------------|----------------------------------------|-------------------------------------------------------------------|
| shadow-xs   | Sehr subtil (Inputs ruhig)             | `0 1px 2px 0 rgba(0,0,0,0.04)`                                   |
| shadow-sm   | Cards (Standard)                       | `0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)` |
| shadow      | Cards (erhöht)                         | `0 2px 6px -1px rgba(0,0,0,0.08), ...`                           |
| shadow-md   | Buttons Hover, Card Hover              | `0 4px 12px -2px rgba(0,0,0,0.10), ...`                          |
| shadow-lg   | Dropdowns, Popovers                    | `0 10px 24px -4px rgba(0,0,0,0.10), ...`                         |
| shadow-xl   | Dialoge, Modals                        | `0 20px 32px -8px rgba(0,0,0,0.12), ...`                         |
| shadow-focus| Focus-Ring auf Buttons/Inputs          | `0 0 0 3px rgba(99,102,241,0.18)`                                 |

**Regel:** Kein Schatten auf Sidebar oder Topbar (sie sitzen auf dem Hintergrund). Schatten nur auf "schwebenden" Elementen.

---

## 6. Animationen

Alle Animationen sind dezent und zweckgebunden. Keine verspielten Effekte.

| Animation       | Dauer  | Easing               | Verwendung                     |
|-----------------|--------|----------------------|--------------------------------|
| `fade-in`       | 200ms  | ease-out             | Inhalte die erscheinen         |
| `scale-in`      | 200ms  | ease-out-expo        | Dialoge, Modals                |
| `shimmer`       | 1.8s   | ease-in-out infinite | Skeleton-Loading-States        |
| `slide-in`      | 250ms  | ease-out-expo        | Mobile Sidebar                 |
| Hover (Card)    | 200ms  | ease                 | `translateY(-1px)` + shadow-md |
| Hover (Button)  | 150ms  | ease-out             | Hintergrundfarbe dunkler       |
| Focus Ring      | 150ms  | ease-out             | Indigo Ring (3px, 18% opacity) |

**Tailwind-Klassen:** `transition-all duration-150`, `duration-200`, `duration-300`.  
**Keyframes:** definiert in `tailwind.config.js` → `animate-fade-in`, `animate-scale-in`, `animate-shimmer`.

---

## 7. Komponenten-Referenz

### `Button`
```jsx
import Button from '@/components/ui/v2/Button';

<Button variant="primary">Speichern</Button>
<Button variant="secondary" size="sm">Abbrechen</Button>
<Button variant="ghost" size="sm"><Pencil size={14} /> Bearbeiten</Button>
<Button variant="danger">Löschen</Button>
<Button variant="primary" loading={true}>Wird gespeichert...</Button>
<Button variant="primary" fullWidth>Anmelden</Button>
```

**Varianten:** `primary` · `secondary` · `ghost` · `danger` · `success` · `outline` · `warning`  
**Größen:** `xs` · `sm` · `md` (Standard) · `lg` · `xl` · `icon`

---

### `Card`
```jsx
import Card from '@/components/ui/v2/Card';

<Card>
  <Card.Header>
    <Card.Title>Aufträge</Card.Title>
    <Card.Description>Aktuelle offene Aufträge</Card.Description>
  </Card.Header>
  <Card.Content>...</Card.Content>
  <Card.Footer>...</Card.Footer>
</Card>

// Interaktive Karte (klickbar, hover-lift)
<Card interactive onClick={() => router.push('/detail')}>...</Card>
```

---

### `Badge`
```jsx
import Badge from '@/components/ui/v2/Badge';

<Badge variant="success">Bezahlt</Badge>
<Badge variant="warning">Ausstehend</Badge>
<Badge variant="danger">Überfällig</Badge>
<Badge variant="info">In Bearbeitung</Badge>
<Badge variant="primary">Aktiv</Badge>
<Badge variant="default">Entwurf</Badge>

// Mit Dot-Indikator:
<Badge variant="success" dot>Online</Badge>

// Größen: sm (Standard), xs, md
```

---

### `Table`
```jsx
import Table from '@/components/ui/v2/Table';

<Table striped>
  <Table.Head>
    <Table.Row>
      <Table.HeaderCell>Name</Table.HeaderCell>
      <Table.HeaderCell>Status</Table.HeaderCell>
    </Table.Row>
  </Table.Head>
  <Table.Body>
    <Table.Row onClick={() => router.push('/item/1')}>
      <Table.Cell className="font-medium text-gray-900">Müller GmbH</Table.Cell>
      <Table.Cell><Badge variant="success">Aktiv</Badge></Table.Cell>
    </Table.Row>
  </Table.Body>
</Table>
```

Klickbare Zeilen: `onClick` auf `Table.Row` → automatisch `cursor-pointer` + Hover-Highlight.

---

### `Input`
```jsx
import Input from '@/components/ui/v2/Input';

<Input
  label="E-Mail-Adresse"
  id="email"
  type="email"
  placeholder="name@firma.de"
  required
  helperText="Wird für Login verwendet."
/>

// Mit Fehler:
<Input
  label="Passwort"
  id="pw"
  type="password"
  error="Passwort zu kurz (min. 8 Zeichen)"
/>
```

---

### `Select`
```jsx
import Select from '@/components/ui/v2/Select';

<Select label="Status" id="status" required>
  <option value="">Bitte wählen...</option>
  <option value="offen">Offen</option>
  <option value="abgeschlossen">Abgeschlossen</option>
</Select>
```

---

### `Dialog`
```jsx
import Dialog from '@/components/ui/v2/Dialog';

<Dialog open={offen} onClose={() => setOffen(false)} size="md">
  <Dialog.Header>
    <Dialog.Title>Kunde löschen?</Dialog.Title>
    <Dialog.Description>
      Diese Aktion kann nicht rückgängig gemacht werden.
    </Dialog.Description>
  </Dialog.Header>
  <Dialog.Content>...</Dialog.Content>
  <Dialog.Footer>
    <Button variant="secondary" onClick={() => setOffen(false)}>Abbrechen</Button>
    <Button variant="danger" onClick={handleDelete}>Löschen</Button>
  </Dialog.Footer>
</Dialog>
```

**Größen:** `sm` · `md` (Standard) · `lg` · `xl` · `2xl`  
**Automatisch:** Escape-Taste schließt. Body-Scroll wird gesperrt. Backdrop-Blur.

---

### `KpiCard`
```jsx
import KpiCard from '@/components/ui/v2/KpiCard';
import { FileText } from 'lucide-react';

<KpiCard
  title="Offene Aufträge"
  value={12}
  trend={8}
  trendLabel="vs. letzte Woche"
  icon={FileText}
  iconBg="bg-blue-50"
  iconColor="text-blue-600"
/>

// Ladestate:
<KpiCard title="..." value={null} loading={true} />

// Klickbar:
<KpiCard title="..." value={5} onClick={() => router.push('/auftraege')} />
```

**trend:** positiv (+) → grüner Aufwärts-Pfeil. negativ (-) → roter Abwärts-Pfeil. 0 → neutral.

---

### `EmptyState`
```jsx
import EmptyState from '@/components/ui/v2/EmptyState';
import { Users } from 'lucide-react';

// In Table.Body:
<Table.Row>
  <Table.Cell colSpan={5}>
    <EmptyState
      icon={Users}
      title="Keine Kunden vorhanden"
      description="Legen Sie Ihren ersten Kunden an, um loszulegen."
      action={() => router.push('/dashboard-v2/kunden/neu')}
      actionLabel="Kunden anlegen"
    />
  </Table.Cell>
</Table.Row>

// In Card.Content:
<Card.Content>
  <EmptyState
    title="Keine Mahnungen"
    description="Alle Rechnungen sind bezahlt."
  />
</Card.Content>
```

---

### `Skeleton` / `SkeletonCard` / `SkeletonTable` / `SkeletonKpiGrid`
```jsx
import Skeleton, { SkeletonCard, SkeletonTable, SkeletonKpiGrid } from '@/components/ui/v2/Skeleton';

// KPI-Grid Ladestate:
{laden && <SkeletonKpiGrid count={4} />}

// Tabellen-Ladestate:
{laden && <SkeletonTable rows={5} cols={4} />}

// Karten-Ladestate:
{laden && <SkeletonCard lines={4} />}

// Einzelne Zeile:
<Skeleton height="h-4" width="w-48" />
```

---

### `ErrorState`
```jsx
import ErrorState from '@/components/ui/v2/ErrorState';

<Card.Content>
  <ErrorState
    title="Kunden konnten nicht geladen werden"
    message="Bitte prüfe die Verbindung und versuche es erneut."
    onRetry={ladeKunden}
    retryLabel="Erneut laden"
  />
</Card.Content>
```

---

### `Page`
```jsx
import Page from '@/components/ui/v2/Page';

<Page>
  <Page.Header>
    <Page.Title>Kunden</Page.Title>
    <Page.Description>Verwalte alle Kundendaten an einem Ort.</Page.Description>
  </Page.Header>
  <Page.Content>
    {/* Cards, Tables etc. */}
  </Page.Content>
</Page>
```

---

## 8. Konsistenz-Regeln

### Verboten
- ❌ Hardcoded Farben im JSX: `className="text-[#6366f1]"` → stattdessen `text-primary-500`
- ❌ `font-bold` für normalen Body-Text
- ❌ Schatten auf Sidebar/Topbar
- ❌ Emojis im UI (Ausnahme: explizit vom Nutzer gewünscht)
- ❌ Placeholder-Text wie "Willkommen in KanalPro V3." auf produktiven Seiten
- ❌ Leere Buttons (kein Label, kein Icon)
- ❌ `<div>` als Buttonersatz (immer `<Button>` oder `<button>` verwenden)
- ❌ Betragsspalten ohne `€`-Suffix und `tabular-nums`

### Gebot
- ✅ `'use client';` exakt auf Zeile 1 bei allen Client-Komponenten
- ✅ Alle Ladestaaten mit `Skeleton*` abbilden
- ✅ Alle Fehlerzustände mit `ErrorState` abbilden
- ✅ Alle leeren Listen mit `EmptyState` + Lucide-Icon + CTA abbilden
- ✅ Statusfelder immer mit `Badge` mit passendem `variant` (nie reiner grauer Text für Kritisches)
- ✅ Klickbare Tabellenzeilen: `Table.Row onClick={...}` (kein separater "Ansehen"-Button nötig)
- ✅ Destructive Actions im Dialog bestätigen (Dialog.Footer mit `Button variant="danger"`)
- ✅ Formulare mit `Form.Row` für 2-spaltige Layouts auf Desktop

---

## 9. Responsive-Regeln

- **Mobile first:** Default-Klassen gelten für Mobile (< 640px)
- **sm:** Tablet (≥ 640px) — 2-spaltige Grids statt 1-spaltig
- **md:** Desktop (≥ 768px) — Sidebar sichtbar, 3–4-spaltige Grids
- **lg:** Large Desktop (≥ 1024px) — volle Breite, Seitenleiste permanent

Tabellen erhalten `overflow-x-auto` (via `Table`-komponente automatisch). Formulare nutzen `grid-cols-1 sm:grid-cols-2`. KPI-Grids nutzen `grid-cols-2 sm:grid-cols-4`.

---

## 10. Verzeichnisstruktur Design System

```
components/
└── ui/
    └── v2/
        ├── Badge.jsx       # Status-Badges
        ├── Button.jsx      # Alle Button-Varianten
        ├── Card.jsx        # Content-Karten
        ├── Dialog.jsx      # Modals (Confirm, Form, Info)
        ├── EmptyState.jsx  # Leere Listen-/Inhalts-States
        ├── ErrorState.jsx  # Fehlerzustände
        ├── Form.jsx        # Formular-Layout-Wrapper
        ├── Input.jsx       # Text-Inputs
        ├── KpiCard.jsx     # Dashboard KPI-karten mit Trend
        ├── Page.jsx        # Seitenrahmen
        ├── Select.jsx      # Styled Select-Felder
        ├── Skeleton.jsx    # Lade-Skelette
        └── Table.jsx       # Datentabellen

docs/
└── design-system.md        # Diese Datei

app/
└── globals.css             # Design Tokens (CSS Vars) + Base Styles

tailwind.config.js          # Extended Tokens (Colors, Radius, Shadow, Animation)
```

---

## 11. Nächste Schritte (PX-200+)

PX-200 wird die Module schrittweise auf das neue Design-System umstellen:

1. **PX-200: Dashboard** — KpiCard mit echten Farben, Mein-Tag als Startseite
2. **PX-201: Navigation** — Gruppen, Icons, Umlaut-Fix, Billing-Label anpassen
3. **PX-202: Listen-Seiten** — KPI-Header, EmptyState, Badge-Farben, Betragsspalten
4. **PX-203: Formulare** — Select-Komponente, einheitliches Layout
5. **PX-204: Dialoge** — Confirm-Dialoge für Delete-Aktionen
6. **PX-205: Mobile** — Tabellen-Cards auf < 640px, Touch-Targets

---

*Dieses Dokument ist die verbindliche Design-Grundlage für alle PX-Sprints.*
