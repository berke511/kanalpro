# KanalPro – Projektanweisung

## Projektübersicht

KanalPro ist eine moderne, cloudbasierte SaaS-Software, die speziell für
Unternehmen der Rohr-, Kanal- und Industrieservicebranche entwickelt wird.
Ziel ist eine zentrale Plattform, auf der sämtliche Arbeitsabläufe eines
Unternehmens digital abgebildet werden – von der Kundenverwaltung über die
Einsatzplanung bis hin zur Abrechnung und Dokumentation.

Viele Unternehmen der Branche arbeiten heute noch mit Papierformularen,
Excel-Tabellen, WhatsApp und Einzelprogrammen. Das erzeugt Medienbrüche,
doppelte Dateneingaben und unnötigen Verwaltungsaufwand. KanalPro löst das,
indem alle wichtigen Unternehmensbereiche in einer einzigen, intuitiven
Software vereint werden.

## Vision

Die führende Softwarelösung für kleine und mittlere Unternehmen der Rohr-,
Kanal- und Industrieservicebranche im deutschsprachigen Raum werden. Nicht
die größtmögliche Anzahl an Funktionen steht im Vordergrund, sondern eine
durchdachte, moderne und benutzerfreundliche Lösung, die sich schnell
erlernen lässt und den tatsächlichen Arbeitsalltag der Branche optimal
unterstützt.

## Zielgruppe

Ausschließlich Unternehmen der Rohr-, Kanal- und Industrieservicebranche
(KMU), z. B. Rohrreinigung, Kanalreinigung, Kanalsanierung, TV-Inspektion,
Dichtheitsprüfung, Grundstücksentwässerung, Industrieservice,
Umweltservice und verwandte Spezialdienstleister – vom Kleinbetrieb bis zum
Unternehmen mit mehreren Teams und Fahrzeugen.

## Kernbereiche / Module

- Kundenverwaltung
- Auftragsmanagement
- Einsatzplanung / Disposition
- Mitarbeiterverwaltung
- Fahrzeugverwaltung
- Maschinen- und Geräteverwaltung
- Materialverwaltung
- Angebots- und Rechnungserstellung
- Einsatz- und Abschlussberichte
- Digitale Kundenunterschriften
- Dokumentenverwaltung
- Terminplanung
- Benachrichtigungen
- Auswertungen / Unternehmenskennzahlen
- Rollen- und Rechteverwaltung

## Typischer Arbeitsablauf

1. Kunde anlegen oder aus dem Kundenstamm auswählen
2. Auftrag erstellen
3. Auftrag einem oder mehreren Mitarbeitern zuweisen
4. Fahrzeuge und Maschinen einplanen
5. Auftrag erscheint automatisch beim Außendienst
6. Arbeiten vor Ort dokumentieren
7. Material und Arbeitszeiten erfassen
8. Fotos und Dokumente hochladen
9. Kunde unterschreibt digital
10. Auftrag abschließen
11. Büro erstellt daraus Angebote, Rechnungen oder Abschlussberichte

Alle Beteiligten arbeiten in derselben Datenbasis und sehen stets den
aktuellen Stand.

## Entwicklungsgrundsätze

Moderne Architektur, hohe Performance, einfache Bedienbarkeit, klare
Benutzeroberflächen, responsive Darstellung, hohe Datensicherheit,
langfristige Erweiterbarkeit, sauber strukturierter Code, nachvollziehbare
Datenbankstruktur, professionelle Dokumentation, regelmäßige Tests, stabile
Deployments. Jede neue Funktion wird sorgfältig geplant, umgesetzt und
getestet, bevor sie veröffentlicht wird.

## Technologiestack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Row Level Security, Supabase Auth,
  Supabase Storage)
- **Deployment:** Vercel
- **Versionsverwaltung:** GitHub
- **Entwicklung:** Claude Code / Claude Cowork

> **Next.js-Hinweis:** Dieses Projekt nutzt eine sehr aktuelle Next.js-
> Version (16.x) mit Breaking Changes gegenüber älteren Versionen. Am
> auffälligsten: `middleware.ts` heißt jetzt `proxy.ts` (Datei liegt unter
> `src/proxy.ts`). Vor größeren Änderungen an Next.js-Konventionen lohnt
> sich ein Blick in `node_modules/next/dist/docs/`.

## Multi-Tenant-Architektur

KanalPro wird als Multi-Tenant-SaaS entwickelt. Jedes Unternehmen (Tenant)
besitzt einen eigenen geschützten Arbeitsbereich. Benutzer können
ausschließlich auf die Daten ihres eigenen Unternehmens zugreifen. Die
Trennung hat höchste Priorität und wird über Row Level Security
durchgesetzt.

Aktuelle Umsetzung:

- `companies` – ein Datensatz pro Unternehmen (Tenant)
- `profiles` – ein Datensatz pro Benutzer, verknüpft mit `auth.users` und
  `company_id`, inkl. Rolle (`owner`, `admin`, `mitarbeiter`)
- `public.current_company_id()` – SECURITY DEFINER Funktion, liefert die
  `company_id` des angemeldeten Benutzers für RLS-Policies
- RLS-Policies auf `companies` und `profiles` sorgen für strikte
  Mandantentrennung
- Bei der Registrierung wird zunächst nur der Auth-User angelegt; Firma und
  Profil werden beim ersten authentifizierten Dashboard-Aufruf über
  `getOrCreateProfile()` erzeugt (siehe `src/lib/supabase/profile.ts`).
  Das funktioniert unabhängig davon, ob E-Mail-Bestätigung aktiv ist.

Künftige Tabellen (Kunden, Aufträge, Fahrzeuge, …) müssen immer eine
`company_id`-Spalte sowie passende RLS-Policies erhalten, die auf
`public.current_company_id()` prüfen.

## Designphilosophie

KanalPro soll nicht wie klassische Verwaltungssoftware wirken, sondern
modern, hochwertig und übersichtlich – orientiert an aktuellen
SaaS-Anwendungen: große Karten, klare Navigation, moderne Icons, angenehme
Farben, konsistente Abstände, übersichtliche Dashboards, intuitive
Bedienung, schnelle Ladezeiten, optimale Nutzung auf Desktop, Tablet und
Smartphone.

Aktuelle Umsetzung: Farbpalette in `src/app/globals.css`
(`--brand`, `--brand-soft`, `--border`, `--muted`, …), Layout-Bausteine in
`src/components/dashboard/`.

## Aktueller Stand (Bootstrap-Session)

- Next.js-Projekt unter `/` initialisiert (App Router, TS, Tailwind,
  ESLint, `src/`-Ordner)
- Supabase-Projekt `kanalpro` angelegt (Region `eu-central-1`)
- Multi-Tenant-Grundschema (`companies`, `profiles`) inkl. RLS umgesetzt
  und angewendet (`supabase/migrations/0001_init.sql`)
- Supabase-Client-Helper für Client-/Server-Components sowie `proxy.ts`
  zur Session-Aktualisierung und zum Schutz der Dashboard-Routen
- Landingpage, Login/Registrierung, Dashboard-Grundlayout mit Navigation
  und Platzhalterseiten für alle Kernmodule

## Langfristige Vision (Ausblick, noch nicht umgesetzt)

KI-gestützte Assistenzfunktionen, intelligente Termin- und
Einsatzplanung, automatische Berichtserstellung, Dokumentenerkennung,
digitale Formulare, Kundenportal, Mitarbeiter-App, Wartungsmanagement,
erweiterte Auswertungen, Schnittstellen zu Drittanbietern, API für
externe Systeme, individuelle Unternehmensanpassungen.
