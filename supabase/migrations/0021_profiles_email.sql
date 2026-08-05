-- KanalPro: E-Mail-Adresse auf `profiles` spiegeln
--
-- Die Mitarbeiterverwaltung soll Admins die E-Mail-Adresse von Kollegen
-- anzeigen (siehe 0020_mitarbeiterverwaltung.sql, dort bewusst noch
-- ausgespart). `auth.users` ist über den normalen (nicht Service-Role-)
-- Client aber nur für die eigene Zeile lesbar – ohne eigene Spalte könnte
-- ein Admin daher nie die E-Mail eines Kollegen sehen. Diese Spalte wird
-- bei jedem Login über getOrCreateProfile() synchron gehalten (siehe
-- src/lib/supabase/profile.ts); hier zunächst einmalig aus auth.users
-- rückwirkend befüllt.
alter table public.profiles add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is distinct from u.email;
