# PX-500 Abschlussbericht — Angebote Premium (Sprint 2)

**Sprint:** PX-500  
**Abgeschlossen:** 23.07.2026  
**Branch:** `clean-rebuild-v3`  
**HEAD:** `f8e5c8c` — feat: PX-500 — kunden/[id]/page.jsx: AngeboteTab — Angebot erstellen Button + kundeId prop  
**Deployment:** `dpl_7yaomCJaLFuuNukCtSwBoL3e9V1u` — **READY**

---

## A. Ergebnis

Build: **PASS**  
Alle 3 Dateien vollstaendig auf die Premium-Komponentenbibliothek (`components/ui/v2/`) umgestellt. Alle Pre-Commit-Checks bestanden, 3 Commits auf `clean-rebuild-v3`, Vercel READY in ~46s.

---

## B. Umfang

| Datei | Commit | Groesse | Deployment |
|-------|--------|---------|------------|
| `app/dashboard-v2/angebote/page.jsx` | `4eb2114` | 293 Zeilen / 16,2 KB | `dpl_41jXRL...` READY |
| `app/dashboard-v2/angebote/[id]/page.jsx` | `1652ceb` | 343 Zeilen / 17,8 KB | `dpl_4Qo5hD...` READY |
| `app/dashboard-v2/kunden/[id]/page.jsx` | `f8e5c8c` | Patch (+Angebot erstellen) | `dpl_7yaomC...` READY |

---

## C. Implementierung — angebote/page.jsx

### KPI-Karten (5 Stueck)

| KPI | Datenquelle | Icon | Farbe |
|-----|-------------|------|-------|
| Angebote gesamt | `angebote.length` | FileText | primary |
| Entwuerfe | `status = 'entwurf'` | Clock | gray |
| Versendet | `status = 'versendet'` | Send | primary |
| Angenommen | `status = 'angenommen'` | CheckCircle | success |
| Abgelehnt | `status = 'abgelehnt'` | XCircle | danger |

### Features

- **Debounced Search (300ms):** Filterung nach `angebotsnummer` und `kunden.name` via `useRef(null)` Debounce
- **Filter-Buttons:** Alle / Entwurf / Versendet / Angenommen / Abgelehnt
- **Sortierung:** `datum`, `betrag` (calcBrutto), `angebotsnummer` — je asc/desc mit SortIcon
- **Premium-Tabelle:** Angebotsnummer (font-mono), Kunde, Status-Badge, Angebotssumme, Erstellungsdatum, Gueltigkeit, Aktionen
- **company_id-Isolation:** `company_members WHERE user_id=user.id AND is_active=true`
- **EmptyState:** Unterscheidet Filter-Treffer vs. leere Liste (mit CTA)
- **calcBrutto:** `pos.reduce((sum,p) => sum + (p.menge||1)*(p.einzelpreis||p.preis||0)*(1+(p.mwst||19)/100), 0)`

### Premium-Komponenten

`KpiCard`, `Badge`, `Button`, `Card`, `Table`, `Page`, `EmptyState`

---

## D. Implementierung — angebote/[id]/page.jsx

### 5-Tab-Navigation

| Tab | Key | Icon | Inhalt |
|-----|-----|------|--------|
| Uebersicht | `uebersicht` | FileText | Angebotsdaten-Card + Kunde-Card |
| Positionen | `positionen` | Package | Tabelle + Netto/MwSt/Brutto-Summary |
| Dokumente | `dokumente` | FolderOpen | EmptyState |
| Historie | `historie` | History | EmptyState |
| Notizen | `notizen` | MessageSquare | EmptyState |

### Uebersicht-Tab

- **Angebotsdaten-Card:** Angebotsnummer (font-mono), Status-Badge, Angebotssumme, Erstellungsdatum, Gueltigkeitsdatum, Bearbeiter (conditional)
- **Kunde-Card:** Name als Link → `/dashboard-v2/kunden/[kunden_id]`, Ansprechpartner, E-Mail, Telefon (conditional)
- 2-Spalten-Layout: `md:grid-cols-2`

### Positionen-Tab

- Tabelle: Pos. | Beschreibung (p.beschreibung||p.leistung) | Menge + Einheit | Einzelpreis | MwSt % | Gesamt (brutto per Position)
- Summary-Box (flex justify-end): Nettobetrag / MwSt. / Gesamtbetrag (`text-primary-600`)
- EmptyState wenn `positionen.length === 0`

### Auftrag erstellen Button

- Nur sichtbar wenn `angebot.status === 'angenommen'`
- Navigation: `/dashboard-v2/auftraege/erstellen?angebot_id=[id]`
- Variant: `primary`, Icon: `Briefcase`

### company_id-Isolation

- `company_members WHERE user_id=user.id AND is_active=true`
- `angebote SELECT '*, kunden(name, email, telefon, ansprechpartner)' .eq('id', angebotId) .eq('company_id', cid).single()`

### Premium-Komponenten

`Badge`, `Button`, `Card`, `Table`, `Page`, `EmptyState`

---

## E. Implementierung — kunden/[id]/page.jsx (Patch)

Minimaler Patch auf die bestehende 8-Tab Kundenakte (PX-400):

| Aenderung | Beschreibung |
|-----------|-------------|
| `Plus` Import | `Plus` zu lucide-react Importen hinzugefuegt |
| `AngeboteTab` Signatur | `{ angebote, detailLoading }` → `{ angebote, detailLoading, kundeId }` |
| Header-Button | `<Link href={'/dashboard-v2/angebote/neu?kunden_id='+kundeId}><Button variant="primary" size="sm">Angebot erstellen</Button></Link>` |
| EmptyState Action | `action` + `actionLabel="Angebot erstellen"` mit `window.location.assign(...)` |
| Call-Site | `<AngeboteTab ... kundeId={kundeId} />` |

---

## F. Pre-Commit-Checks

| Datei | `'use client';` Z.1 | Braces | Keine Umlaute | Kein blue-* |
|-------|---------------------|--------|---------------|-------------|
| angebote/page.jsx | Pass | 113=113 | Pass | Pass |
| angebote/[id]/page.jsx | Pass | 97=97 | Pass | Pass |
| kunden/[id]/page.jsx | Pass (unveraendert) | -- | Pass | Pass |

---

## G. Commits

| # | Commit SHA | Datei | Message |
|---|-----------|-------|---------|
| 1 | `4eb2114` | angebote/page.jsx | feat: PX-500 — angebote/page.jsx: Premium KPI cards, debounced search, filter, sort, table |
| 2 | `1652ceb` | angebote/[id]/page.jsx | feat: PX-500 — angebote/[id]/page.jsx: 5-tab detail, Positionen table, Auftrag erstellen button |
| 3 | `f8e5c8c` | kunden/[id]/page.jsx | feat: PX-500 — kunden/[id]/page.jsx: AngeboteTab — Angebot erstellen Button + kundeId prop |

---

## H. Deployments

| Deployment ID | Commit | Status | Build-Zeit |
|---------------|--------|--------|------------|
| `dpl_41jXRLJMhv2KZ3FxWzBUei5USTpJ` | `4eb2114` | READY | ~45s |
| `dpl_4Qo5hDezFTf17ASNVyrWMDxpktuQ` | `1652ceb` | READY | ~46s |
| `dpl_7yaomCJaLFuuNukCtSwBoL3e9V1u` | `f8e5c8c` | **READY** | ~46s |

HEAD: `f8e5c8ce3a3d79c52e7c892857194b8e7a268224`

---

## I. Qualitaetsbewertung: 9/10

**Staerken:**
- Vollstaendige company_id-Isolation auf allen Queries
- Debounced Search (300ms) verhindert unnoetige Re-Renders
- calcBrutto konsistent in beiden Dateien implementiert
- "Auftrag erstellen" Button korrekt hinter Status-Gate (`status === 'angenommen'`)
- Kunde-Card verlinkt direkt zur Kundenakte
- Kunden-Angebot erstellen CTA vollstaendig verdrahtet (EmptyState + Header-Button)
- Keine Umlaute in Identifiern oder String-Literalen
- Keine blue-*-Klassen, ausschliesslich primary-*/success-*/danger-*

**Offene Punkte (Sprint 3):**
- angebote/[id]/bearbeiten — Edit-Formular
- Dokumente-Tab: Supabase Storage
- Historie-Tab: activity_log Anbindung
- Notizen-Tab: Freitext + Zeitstempel
- Status-Workflow: Entwurf → Versendet → Angenommen/Abgelehnt

---

*PX-500 Sprint 2 abgeschlossen. Alle 3 Dateien auf das Premium Design System umgestellt, Vercel READY, branch clean-rebuild-v3 aktuell.*
