# DESIGN_SYSTEM_AUDIT â KanalPro (rebuild-ui-v2)

**Branch:** rebuild-ui-v2  
**Basis:** Ausschliesslich aktueller Code auf rebuild-ui-v2 (Stand: 2026-07-15)  
**Quellen:** KanalProUI.js + 8 Dashboard-Seiten

---

## 1. Verbindliche Grundregel

> **Mobile und Desktop nutzen dieselben Komponenten und dieselbe Designsprache. Nur die Anordnung darf sich unterscheiden.**

Jede Komponente in KanalProUI.js ist fuer beide Breakpoints konzipiert. Separate Mobile-only- oder Desktop-only-Komponenten werden nicht eingefuehrt. Responsive Differenzierung erfolgt ausschliesslich ueber Tailwind-Breakpoint-Praefixe (`md:`, `lg:`) innerhalb bestehender Komponenten.

---

## 2. Named Exports von KanalProUI.js (vollstaendige Liste)

### Design Tokens (Konstanten)
| Export | Typ | Inhalt |
|--------|-----|--------|
| `COLORS` | const | primary, danger, success, warning, info |
| `STATUS_COLORS` | const | offen, in_bearbeitung, abgeschlossen |
| `PRIORITAET_COLORS` | const | notfall, hoch, normal, niedrig |

### Buttons
| Export | Variante |
|--------|----------|
| `PrimaryButton` | bg-blue-600, min-h-[44px], focus-ring |
| `SecondaryButton` | bg-white border-gray-300, dark-mode |
| `DangerButton` | bg-red-600, min-h-[44px] |
| `GhostButton` | transparent, hover:bg-gray-100 |
| `IconButton` | p-2, min-h-[44px] min-w-[44px] |

### Cards
| Export | Variante |
|--------|----------|
| `Card` | Standard-Container, optional hover |
| `KpiCard` | Kennzahl mit Icon, Trend, color-Prop |
| `InfoCard` | blue-50 Hintergrund |
| `WarningCard` | amber-50 Hintergrund |
| `SuccessCard` | green-50 Hintergrund |
| `StatHeader` | KPI mit Icon rechts, hover-Effekt |

### Badges
| Export | Variante |
|--------|----------|
| `StatusBadge` | offen / in_bearbeitung / abgeschlossen |
| `PrioritaetBadge` | notfall / hoch / normal / niedrig |
| `RechnungBadge` | offen / bezahlt / ueberfaellig |
| `NotdienstBadge` | bg-red-600 text-white font-bold |
| `SuccessBadge` | green-100, label-Prop |
| `WarningBadge` | amber-100, label-Prop |
| `TypeBadge` | firma vs. privat/sonstige |

### Formular
| Export | Variante |
|--------|----------|
| `FormInput` | text/email/tel/date etc., h-10 |
| `FormSelect` | h-10, options-Array |
| `FormTextarea` | resize-none, rows-Prop |
| `FormCheckbox` | w-4 h-4, label |

### Tabelle
| Export | Variante |
|--------|----------|
| `Table` | Wrapper mit sticky Header, overflow-x-auto |
| `TableRow` | group, cursor-pointer, hover:bg-gray-50 |
| `TableCell` | px-5 py-3.5, text-sm |

### Leer- und Ladezustaende
| Export | Variante |
|--------|----------|
| `EmptyState` | Icon + Titel + Beschreibung + optionaler CTA |
| `LoadingRow` | Skeleton-Tabellenzeile, columns-Prop |
| `LoadingCard` | Skeleton-Card fuer Mobile-Listen |

### Layout
| Export | Variante |
|--------|----------|
| `PageHeader` | title + subtitle + action-Slot |
| `PageSection` | section-Label + children |

### Filter
| Export | Variante |
|--------|----------|
| `FilterBar` | flex-wrap Gap-Wrapper |
| `FilterButton` | Pill aktiv/inaktiv, min-h-[36px] |
| `FilterSelect` | h-9, select-Dropdown |
| `FilterPill` | Alias fuer FilterButton, aktiv-Variante abweichend |

### Suche
| Export | Variante |
|--------|----------|
| `SearchInput` | h-10, icon-links, pl-9 |

### Hilfselemente
| Export | Variante |
|--------|----------|
| `AvatarCircle` | sm/md/lg, Initialen, color-Prop |
| `ActionCell` | opacity-0 group-hover:opacity-100 |
| `SectionTitle` | text-base font-semibold mb-4 |
| `Modal` | fixed overlay, max-w-md, title + footer |

**Gesamt: 42 Exports** (3 Konstanten + 39 Komponenten)

---

## 3. Fehlende Komponenten (in Seiten importiert, aber NICHT in KanalProUI.js definiert)

| Komponente | Importiert in | Status |
|------------|---------------|--------|
| `TableSkeleton` | rechnungen/page.js | **FEHLT** â Runtime-Fehler bei Render |
| `TableCheckbox` | rechnungen/page.js | **FEHLT** â Runtime-Fehler bei Render |
| `TableActions` | rechnungen/page.js | **FEHLT** â Runtime-Fehler bei Render |

**Diese drei fehlenden Exports erzeugen zur Laufzeit `undefined`-Fehler und muessen als hoechste Prioritaet in KanalProUI.js ergaenzt werden.**

---

## 4. Doppelte / redundante Komponenten

| Duplikat | Fundstelle | Soll-Komponente |
|----------|------------|-----------------|
| Lokale `RechnungBadgeLocal` | finanzen/page.js | `RechnungBadge` aus KanalProUI |
| Inline Kundentyp-Badge (`rounded-full px-2.5...`) | kunden/page.js | `TypeBadge` aus KanalProUI |
| Inline Notdienst-Badge (`bg-red-100 text-red-700`) | mein-tag/page.js | `NotdienstBadge` aus KanalProUI |
| `FilterPill` | KanalProUI.js | Redundant zu `FilterButton` (identische Funktion, leicht abweichende Klassen) |

---

## 5. Analyse je Komponenten-Kategorie

### 5.1 PageHeader

**Standard (KanalProUI):** `flex-wrap items-center justify-between gap-4 mb-6`, h1 `text-2xl font-semibold`, subtitle `text-sm text-gray-500`

| Seite | Verwendung | Abweichung |
|-------|------------|------------|
| dashboard/page.js | `<PageHeader>` | Konform |
| kunden/page.js | `<PageHeader>` | Konform |
| auftraege/page.js | `<PageHeader>` | CTA als roher `<Link>` statt `PrimaryButton` |
| rechnungen/page.js | Roh: `<h1 className="text-xl font-bold ...">` | **NICHT konform** â Schriftgroesse (xl statt 2xl), font-bold statt font-semibold, kein PageHeader |
| finanzen/page.js | `<PageHeader>` | Konform |
| disposition/page.js | Roh: `<h1 className="text-2xl font-semibold ...">` | Klassen konform, aber kein PageHeader-Wrapper |
| mein-tag/page.js | Roh: `<h1 className="text-2xl font-semibold ...">` | Klassen konform, aber kein PageHeader-Wrapper |

### 5.2 KPI Cards

**Standard:** `KpiCard` â bg-white, rounded-xl border, p-5, text-3xl font-bold, Icon-Slot, color-Prop

| Seite | Verwendung | Abweichung |
|-------|------------|------------|
| dashboard/page.js | `<KpiCard>` | Konform |
| finanzen/page.js | `<KpiCard>` | Konform |
| mein-tag/page.js | `<KpiCard>` ohne `icon`-Prop | Leere Icon-Spalte, keine Abstandsoptimierung |
| finanzen/page.js (Bereich 1) | Custom Gradient-Banner (`bg-gradient-to-br from-blue-600`) | Eigene KPI-Darstellung ausserhalb `KpiCard` |

### 5.3 Standard Cards

**Standard:** `Card` â bg-white dark:bg-gray-800, border-gray-100, rounded-xl, shadow-sm

| Fundstelle | Abweichung |
|------------|------------|
| rechnungen/page.js (Mobile) | `rounded-2xl` statt `rounded-xl` |
| rechnungen/page.js (Firmendaten) | `rounded-2xl` statt `rounded-xl` |
| finanzen/page.js (Aktivitaeten-Liste) | `bg-white border border-gray-100 rounded-xl` â manuell statt `<Card>` |
| finanzen/page.js (Schnellaktionen) | Custom div mit `rounded-xl border` â kein `<Card>` |

### 5.4 Buttons

**Standard-Set:** `PrimaryButton`, `SecondaryButton`, `DangerButton`, `GhostButton`, `IconButton`  
**Touch Target:** min-h-[44px] auf allen ausser GhostButton

| Abweichung | Fundstelle |
|------------|------------|
| Roher `<Link>` mit `px-4 py-2 bg-blue-600 ...` statt PrimaryButton | auftraege/page.js, rechnungen/page.js |
| Roher `<Link>` mit `px-5 py-2.5 bg-blue-600 ...` statt PrimaryButton | dashboard/page.js (Schnellzugriff) |
| Roher `<button type="submit">` statt PrimaryButton | rechnungen/page.js (Firmendaten) |
| Logo-Aktions-Buttons verwenden keine Systemkomponenten | rechnungen/page.js |

### 5.5 Suchfelder

**Standard:** `SearchInput` â h-10, rounded-lg border-gray-200, pl-9, focus-ring

| Seite | Implementierung | Abweichung |
|-------|-----------------|------------|
| kunden/page.js | Roh: `<input>` mit inline Search-Icon | **Kein SearchInput** |
| rechnungen/page.js | Roh: `<input>` mit inline Search-Icon + X-Button | **Kein SearchInput**, extra Clear-Button |
| layout.js (Sidebar) | Roh: `<button>` als Suchausloeser (Command Palette) | Bewusste Ausnahme (anders Funktion) |
| auftraege/page.js | Kein Suchfeld | Feature fehlt |
| finanzen/page.js | Kein Suchfeld | Feature fehlt |

### 5.6 Filter

**Standard:** `FilterBar` + `FilterButton` (min-h-[36px]) oder `FilterSelect`

| Seite | Implementierung | Abweichung |
|-------|-----------------|------------|
| kunden/page.js | `FilterBar` + `FilterButton` + rohe A-Z-Buttons | A-Z verwendet `w-8 h-8 rounded-md` (kein System-Element) |
| auftraege/page.js | `FilterBar` + `FilterButton` | Konform |
| rechnungen/page.js | `FilterBar` + `FilterButton` | Konform |
| finanzen/page.js | Kein Filter | â |

**Beachte:** `FilterButton` hat `min-h-[36px]` â das liegt UNTER dem Touch-Target-Standard von 44px. Muss auf `min-h-[44px]` angehoben werden.

### 5.7 Status-Badges

**Standard:** `StatusBadge`, `PrioritaetBadge`, `RechnungBadge`, `NotdienstBadge`, `TypeBadge`

| Abweichung | Fundstelle |
|------------|------------|
| Inline `statusConfig` + `<span>` statt `RechnungBadge` | rechnungen/page.js |
| Lokale `RechnungBadgeLocal` definiert | finanzen/page.js |
| Angebots-Badges komplett inline | finanzen/page.js |
| Notdienst-Badge inline (`bg-red-100 text-red-700`) | mein-tag/page.js â hat andere Farbe als `NotdienstBadge` (bg-red-600 text-white) |
| Kundentyp-Badge inline | kunden/page.js |

### 5.8 Tabellen

**Standard:** `Table` + `TableRow` + `TableCell`

| Seite | Desktop | Mobile | Abweichung |
|-------|---------|--------|------------|
| auftraege/page.js | `<Table>/<TableRow>/<TableCell>` | kein Mobile-Layout | Konform Desktop; kein Mobile-Fallback |
| kunden/page.js | Roh: `<table>` mit `<thead>/<tbody>` | Custom Cards | Eigene Tabellenimplementierung |
| rechnungen/page.js | `<Table>/<TableRow>/<TableCell>` + fehlende Exporte | Custom Cards `rounded-2xl` | Teilkonform, 3 fehlende Importe |
| finanzen/page.js | Keine Tabelle | â | â |

### 5.9 Mobile Cards

**Standard:** `LoadingCard` fuer Skeleton, `Card` fuer Listen

| Seite | Implementierung | Abweichung |
|-------|-----------------|------------|
| kunden/page.js | Roh: `div rounded-xl border shadow-sm p-4 bg-white` | Kein `<Card>` verwendet |
| rechnungen/page.js | Roh: `div bg-white rounded-2xl border` | `rounded-2xl` vs Standard `rounded-xl` |
| mein-tag/page.js | `<Card>` | Konform |

### 5.10 Empty States

**Standard:** `EmptyState` mit icon, title, description, action, actionLabel

| Seite | Verwendung | Abweichung |
|-------|------------|------------|
| kunden/page.js | `<EmptyState>` | Konform |
| auftraege/page.js | `<EmptyState>` | Konform |
| rechnungen/page.js | `<EmptyState>` | Konform |
| finanzen/page.js | `<EmptyState>` | Konform |
| mein-tag/page.js | `<EmptyState>` ohne icon-Prop | Kein Icon angezeigt |

### 5.11 Skeletons / Loading States

**Standard:** `LoadingRow` (Tabelle), `LoadingCard` (Listen)

| Seite | Implementierung | Abweichung |
|-------|-----------------|------------|
| kunden/page.js | Roh: Custom Skeleton (div-Array mit animate-pulse) | **Kein LoadingCard** |
| auftraege/page.js | `<p className="text-gray-400">Wird geladen...</p>` | **Kein Skeleton** â einfacher Text |
| rechnungen/page.js | `<TableSkeleton rows={5} cols={5} />` | **Fehlender Export** |
| finanzen/page.js | Roh: `div h-24 rounded-xl bg-gray-100 animate-pulse` | Kein Standard-Skeleton |
| mein-tag/page.js | Roh: `div bg-gray-200 rounded-2xl animate-pulse` | `rounded-2xl` Abweichung |

### 5.12 Modals

**Standard:** `Modal` â fixed overlay, backdrop-blur, max-w-md, rounded-xl, title-bar, footer-slot

| Seite | Verwendung | Abweichung |
|-------|------------|------------|
| mein-tag/page.js | `<Modal>` | Konform |
| Andere Seiten | â | Kein Modal-Bedarf |

### 5.13 Typografie

**Standard:**
- H1 (Seitenname): `text-2xl font-semibold text-gray-900`
- H2 (Abschnitt): `text-base font-semibold text-gray-900` (via `SectionTitle`)
- Section-Label: `text-xs font-medium text-gray-500 uppercase tracking-wider`
- Body: `text-sm text-gray-600`
- Meta / Label: `text-xs text-gray-400` / `text-xs text-gray-500`
- KPI-Wert: `text-3xl font-bold text-gray-900`
- Table-Header: `text-xs font-medium text-gray-500 uppercase tracking-wider`

**Abweichungen:**
| Abweichung | Fundstelle |
|------------|------------|
| `text-xl font-bold` statt `text-2xl font-semibold` | rechnungen/page.js (h1) |
| `font-semibold text-sm uppercase` fuer Section-Label | rechnungen/page.js (Firmendaten) |
| `text-base font-semibold text-gray-900 mb-4` (SectionTitle) vs. `text-xs uppercase tracking-wider` (PageSection) | Zwei konkurrierende Patterns |

### 5.14 Abstaende

**Standard-Spacing:**
| Token | Wert | Verwendung |
|-------|------|------------|
| Page-Padding | `p-4 md:p-8` | Layout |
| Card-Padding | `p-5` | Standard (KpiCard, KanalProUI) |
| Card-Padding kompakt | `p-4` | Mobile Cards |
| Section-Gap | `mb-6` | PageHeader Abstand nach unten |
| Grid-Gap | `gap-3` bis `gap-5` | KPI-Grids |
| Stack-Space | `space-y-3` bis `space-y-6` | Seiteninhalt |
| Table-Cell | `px-5 py-3.5` | Standardzelle |
| Table-Header | `px-5 py-3` | Header-Zelle |

**Abweichungen:**
- `rechnungen/page.js`: `space-y-5` konsistent â konform
- `finanzen/page.js`: `space-y-6 pb-32 md:pb-8` â pb-32 fuer Bottom-Nav-Freiraum (absichtlich)
- `mein-tag/page.js`: `px-4 py-5` als Page-Wrapper â leichte Abweichung von Standard `p-4 md:p-8`

### 5.15 Border Radius

| Wert | Verwendung (Standard) | Abweichung |
|------|----------------------|------------|
| `rounded-xl` | Alle Cards, Tabellen, Modals, Inputs | Standard |
| `rounded-lg` | Alle Buttons, kleine Inputs | Standard |
| `rounded-full` | Alle Badges, Avatar, FilterPill | Standard |
| `rounded-md` | A-Z-Buchstaben (kunden/page) | Eigener Wert ausserhalb System |
| `rounded-2xl` | Mobile Cards in rechnungen, Firmendaten-Sections | **Abweichung** â nicht im Standard |

**Verbindliche Regel:** Nur `rounded-xl`, `rounded-lg`, `rounded-full` verwenden. `rounded-2xl` und `rounded-md` eliminieren.

### 5.16 Schatten

| Wert | Verwendung |
|------|------------|
| `shadow-sm` | Standard-Card, Table-Wrapper |
| `shadow-md` | Hover-Zustand von Card (wenn `hover`-Prop gesetzt) |
| `shadow-xl` | Modal |
| Kein Schatten | KpiCard (nur Border) |

### 5.17 Hover- und Fokuszustaende

**Hover-Standard:**
- Cards mit `hover`-Prop: `hover:shadow-md hover:-translate-y-0.5`
- Table-Rows: `hover:bg-gray-50 dark:hover:bg-gray-700/50`
- Buttons: jeweilig `-700` Variante (`hover:bg-blue-700`)
- Nav-Links: `hover:bg-gray-50`
- Action-Icons: `opacity-0 group-hover:opacity-100`

**Fokus-Standard (durchgaengig in KanalProUI.js):**
```
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-blue-500
focus-visible:ring-offset-2
```

**Abweichungen:**
- Rohe `<input>`-Felder in Seiten: `focus:ring-2 focus:ring-blue-500` (ohne `focus-visible`) â Inkonsistenz
- Rechnungen Firmendaten-Inputs: `focus:outline-none focus:ring-2 focus:ring-blue-500` ohne `focus-visible`
- disposition/page.js Buttons: `focus-visible:ring-offset-2` korrekt, aber Farbe variiert (ring-blue-500 / ring-indigo-500 / ring-purple-500 etc.)

### 5.18 Touch Targets (min. 44px)

| Komponente | Hoehe | Konform? |
|------------|-------|----------|
| PrimaryButton | min-h-[44px] | Ja |
| SecondaryButton | min-h-[44px] | Ja |
| DangerButton | min-h-[44px] | Ja |
| GhostButton | min-h-[44px] | Ja |
| IconButton | min-h-[44px] min-w-[44px] | Ja |
| FilterButton | min-h-[36px] | **NEIN â 8px zu niedrig** |
| FilterPill | kein min-h | **NEIN â kein Touch Target** |
| A-Z-Buttons (kunden) | w-8 h-8 = 32px | **NEIN â 12px zu niedrig** |
| Mobile Nav (layout) | min-h-[56px] | Ja |
| Checklist-Buttons (mein-tag) | min-h-[56px] | Ja |
| EmptyState CTA | min-h-[44px] | Ja |

---

## 6. Design Token Referenz

### Farben (Tailwind-Klassen)

```
Primaer:   blue-600 (Aktionen), blue-700 (Hover), blue-50 (Hintergrund)
Gefahr:    red-600 (Buttons), red-100 (Badge BG), red-800 (Badge Text)
Erfolg:    green-600, green-50, green-100, green-700
Warnung:   amber-600, amber-50, amber-100, amber-700
           yellow-100, yellow-800 (Status "offen")
Info:      blue-100, blue-800
Neutral:   gray-50 (Page BG), gray-100 (Skeleton), gray-200 (Borders)
           gray-400 (Icons), gray-500 (Meta), gray-600 (Body), gray-900 (Headlines)
Spezial:   orange-50/600 (Prioritaet hoch), emerald-50/600 (Umsatz-KPI)
           purple-50/600 (Mitarbeiterplanung)
Dark BG:   gray-800 (Cards), gray-900 (KpiCard), gray-950 (Page)
```

### Typografie

```
text-3xl font-bold    â KPI-Werte
text-2xl font-semibold â Seitentitel (h1)
text-base font-semibold â Abschnittstitel (h2)
text-sm font-medium   â Tabellenwerte, Labels
text-sm               â Body-Text
text-xs font-medium uppercase tracking-wider â Section-Labels, Table-Header
text-xs               â Meta-Infos, Timestamps
font-mono             â Rechnungsnummern, Timer
```

### Spacing

```
p-4 md:p-8   â Page-Padding (Layout)
p-5          â Standard Card-Padding
p-4          â Kompakte Card
px-5 py-3.5  â Table-Cell
px-5 py-3    â Table-Header-Cell
px-4 py-2    â Button (PrimaryButton Standardgroesse)
px-4 py-2.5  â Groesserer Button
gap-3        â Kompaktes Grid
gap-4        â Standard Grid
gap-5        â Spacious Grid
space-y-4    â Standard Stack
space-y-5    â Breiter Stack (Seiteninhalt)
mb-6         â PageHeader Abstand
mb-4         â SectionTitle Abstand
mb-3         â Filter/Labels
```

### Border Radius

```
rounded-xl   â Cards, Tabellen, Modals, SearchInput, grosse Inputs
rounded-lg   â Buttons, kleine Inputs (h-10), Tags
rounded-full â Badges, Avatare, FilterPills
```

### Schatten

```
shadow-sm    â Ruhezustand (Cards, Table-Wrapper)
shadow-md    â Hover-Zustand (Card mit hover-Prop)
shadow-xl    â Modal-Overlay
```

### Animationen

```
transition-colors                    â Standard fuer Buttons, Links
transition-all duration-200          â Cards mit Hover-Transform
transition-opacity duration-150      â ActionCell reveal
animate-pulse                        â Skeleton-Loading
hover:-translate-y-0.5              â Card/StatHeader lift effect
```

### Focus-Ring (verbindlich)

```
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-blue-500
focus-visible:ring-offset-2
```

### Desktop vs. Mobile

```
Sidebar:        hidden md:flex      (Desktop)
Mobile Topbar:  flex md:hidden      (Mobile)
Desktop Topbar: hidden md:flex      (Desktop)
Mobile Nav:     fixed bottom-0 flex md:hidden
Table:          hidden md:block     (Desktop-Tabelle)
Mobile Cards:   md:hidden space-y-3 (Mobile-Liste)
Page Padding:   p-4 md:p-8
pb-Freiraum:    pb-20 md:pb-8       (Bottom-Nav-Versatz)
```

---

## 7. Seiten nach Abweichungsgrad (absteigend)

### Platz 1 â rechnungen/page.js (KRITISCH)

- **3 fehlende KanalProUI-Exports** (`TableSkeleton`, `TableCheckbox`, `TableActions`) â Runtime-Fehler
- Kein `PageHeader`, stattdessen rohe `h1` mit falscher Schriftgroesse
- `rounded-2xl` statt `rounded-xl` auf allen Mobile-Cards und Firmendaten-Sections
- Eigene Inline-Badge-Logik statt `RechnungBadge`
- Firmendaten-Formular: rohe `<input>`-Felder statt `FormInput`
- Kein `SearchInput`, rohe Implementierung mit Extra-Clear-Button
- Eigene Tab-Navigation (nicht in KanalProUI)
- `text-xl font-bold` statt `text-2xl font-semibold` fuer Seitentitel

### Platz 2 â kunden/page.js (HOCH)

- Eigene Tabellen-Implementierung (roh) statt `Table`/`TableRow`/`TableCell`
- Eigene Skeleton-Implementierung statt `LoadingCard`/`LoadingRow`
- Kein `SearchInput`, rohe Input-Implementierung
- A-Z-Filter mit `rounded-md w-8 h-8` (32px Touch-Target, nicht im System)
- Inline Kundentyp-Badge statt `TypeBadge`
- Mobile Cards als rohe divs statt `<Card>`

### Platz 3 â finanzen/page.js (MITTEL)

- Lokale `RechnungBadgeLocal` dupliziert `RechnungBadge` aus KanalProUI
- Inline Angebots-Badge-Logik
- Encoding-Fehler (Mojibake) in String-Literalen: `ÃÂ¼`, `Ã`, `Ã¢Â¬`, `Ã¢` â erfordert Datei-Neuspeicherung als UTF-8
- Custom Gradient-Banner (`bg-gradient-to-br from-blue-600`) ausserhalb Design System
- Letzte-Aktivitaeten-Liste verwendet rohe `div` statt `<Card>`

### Platz 4 â disposition/page.js (NIEDRIG)

- Kein `PageHeader` (rohe h1, aber korrekte Klassen)
- Modul-Buttons als rohe `<button>` statt System-Komponenten (bewusst, da variable Farbe)
- `TabNav` aus separater Komponente (`@/components/ui/TabNav`) â nicht in KanalProUI

### Platz 5 â mein-tag/page.js (NIEDRIG)

- Gute Nutzung des Komponentensystems
- Inline Notdienst-Badge mit anderem Stil als `NotdienstBadge` (bg-red-100 vs. bg-red-600)
- Custom Avatar-Logik (`getAvatarColor`/`getInitials`) statt `AvatarCircle`
- `rounded-2xl` im Skeleton
- KpiCard ohne icon-Prop (leere Icon-Spalte)

### Platz 6 â auftraege/page.js (SEHR NIEDRIG)

- Gute KanalProUI-Nutzung
- CTA-Button als roher `<Link>` statt `PrimaryButton`
- Ladezustand als `<p>` statt Skeleton

### Platz 7 â dashboard/page.js (SEHR NIEDRIG)

- Fast vollstaendig konform
- Schnellzugriff-Links als rohe `<Link>` statt `PrimaryButton`/`SecondaryButton`

### Platz 8 â layout.js (KEIN HANDLUNGSBEDARF)

- Bewusst eigenstaendige Implementierung (Shell-Layout)
- Sidebar-Suchausloeser (Command Palette) als roher Button â korrekt (andere Funktion als SearchInput)

---

## 8. Empfohlener erster Design-Migrations-Sprint

### Sprint DS-M1 â "Close the Gaps" (Prioritaet 1)

**Ziel:** Fehlende Exports ergaenzen, Runtime-Fehler beheben, groesste Divergenzen schliessen.

**Aufgaben (nach Prioritaet):**

1. **KanalProUI.js: 3 fehlende Komponenten ergaenzen**
   - `TableSkeleton` â Skeleton fuer n Zeilen und m Spalten
   - `TableCheckbox` â Checkbox fuer Tabellenzeilen (inkl. indeterminate-Zustand)
   - `TableActions` â Aktions-Container fuer Tabellenzeilen (opacity-reveal)

2. **FilterButton: Touch Target auf min-h-[44px] erhoehen**
   - Aktuell: `min-h-[36px]` â 8px unter 44px Minimum
   - Aenderung in KanalProUI.js, automatisch wirksam in allen Seiten

3. **rechnungen/page.js: PageHeader einfuehren**
   - `<h1 className="text-xl font-bold">` â `<PageHeader title="Rechnungen" />`

4. **rechnungen/page.js: rounded-xl statt rounded-2xl**
   - Alle Mobile-Card divs und Firmendaten-Sections

5. **rechnungen/page.js: RechnungBadge verwenden**
   - Lokale `statusConfig`/`<span>` â `<RechnungBadge status={r.status} />`

6. **finanzen/page.js: RechnungBadgeLocal entfernen**
   - Lokale Komponente â `<RechnungBadge>` aus KanalProUI

7. **finanzen/page.js: UTF-8 Encoding-Fehler beheben**
   - Datei in UTF-8 neu speichern, alle Mojibake-Zeichen korrigieren

8. **kunden/page.js: SearchInput verwenden**
   - Rohe Input-Implementierung â `<SearchInput placeholder="Kunden suchen..." />`

9. **kunden/page.js: TypeBadge verwenden**
   - Inline Kundentyp-Spans â `<TypeBadge type={k.kundentyp} label={k.kundentyp === 'firma' ? 'Firma' : 'Privat'} />`

10. **auftraege/page.js: PrimaryButton fuer CTA**
    - Roher `<Link className="px-4 py-2 bg-blue-600...">` â `<PrimaryButton>` in `<Link>`

**Geschaetzter Aufwand:** 1 Entwicklertag  
**Nutzen:** Runtime-Fehler eliminiert, Touch-Targets WCAG-konform, groesste visuelle Inkonsistenzen behoben
