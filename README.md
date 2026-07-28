# KanalPro

SaaS-Plattform für Unternehmen der Rohr-, Kanal- und Industrieservicebranche
– Kundenverwaltung, Auftragsmanagement, Einsatzplanung, Abrechnung und
Dokumentation in einer zentralen, modernen Software.

Die ausführliche Projektbeschreibung, Vision und die technischen
Grundsätze stehen in [`CLAUDE.md`](./CLAUDE.md).

## Tech-Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (PostgreSQL, Row Level Security, Auth, Storage)
- Deployment: Vercel

## Lokale Entwicklung

```bash
npm install
cp .env.example .env.local   # Supabase-URL und Publishable Key eintragen
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000).

## Datenbank / Supabase

Migrationen liegen unter `supabase/migrations/`. Das Grundschema
(`0001_init.sql`) legt die Multi-Tenant-Basis an:

- `companies` – ein Datensatz pro Unternehmen (Tenant)
- `profiles` – ein Datensatz pro Benutzer, verknüpft mit `auth.users`
- Row Level Security sorgt dafür, dass jedes Unternehmen ausschließlich
  seine eigenen Daten sieht

## Projektstruktur

```
src/app/(auth)/          Login, Registrierung, Server Actions
src/app/(dashboard)/     Geschütztes Dashboard + Module (Kunden, Aufträge, …)
src/components/dashboard Sidebar, Topbar, Modul-Platzhalter
src/lib/supabase/        Supabase-Clients (Browser/Server), Profil-Provisionierung
src/proxy.ts             Next.js 16 Proxy (ehem. Middleware) für Session & Routenschutz
supabase/migrations/     SQL-Migrationen
```

## Skripte

```bash
npm run dev     # Entwicklungsserver
npm run build   # Produktions-Build
npm run lint    # ESLint
```
