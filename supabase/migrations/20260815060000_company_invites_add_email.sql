-- Einladungen per E-Mail: speichert die Empfänger-Adresse zur Anzeige in
-- der Einladungsliste (Versand selbst läuft über Resend, siehe
-- src/lib/email.ts). Nullable, weil ältere Einladungen ohne E-Mail
-- bestehen bleiben.
alter table public.company_invites add column if not exists email text;
