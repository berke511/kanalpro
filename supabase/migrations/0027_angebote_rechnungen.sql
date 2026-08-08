-- Ausbau der Angebots-/Rechnungsverwaltung: getrennte, branchenübliche
-- Status-Sets für Angebote und Rechnungen, Bearbeiter-Zuordnung,
-- Zahlungs-Tracking (Teilzahlungen), Mahnwesen (einfache Mahnstufe),
-- Versand-/Öffnungs-Zeitpunkte für die Erinnerungs-Widget, Verknüpfung
-- Angebot → daraus erzeugte Rechnung (Workflow ohne doppelte
-- Dateneingabe), fortlaufende Angebots-/Rechnungsnummern je Dokumenttyp
-- sowie eine Zeitleisten-Tabelle (invoice_history), analog zum bereits
-- etablierten Muster aus report_history (0025_einsatzberichte.sql).
--
-- Status werden bewusst NICHT automatisch per Cron/Trigger auf
-- "ueberfaellig"/"abgelaufen" umgeschaltet (es gibt in diesem Projekt
-- keine Hintergrundjobs) – die Anwendung berechnet "überfällig"/
-- "abgelaufen" stattdessen zur Anzeigezeit aus due_date/valid_until
-- (siehe src/lib/invoices.ts, effectiveInvoiceStatus()). Die Werte
-- bleiben als *explizit setzbare* Status trotzdem im Enum, falls
-- jemand den Status manuell so hinterlegen möchte.

alter table public.invoices
  add column if not exists assigned_to uuid references public.profiles (id) on delete set null,
  add column if not exists valid_until date,
  add column if not exists paid_amount numeric(12, 2) not null default 0,
  add column if not exists payment_method text,
  add column if not exists payment_date date,
  add column if not exists tax_rate numeric(5, 2) not null default 19.00,
  add column if not exists sent_at timestamptz,
  add column if not exists viewed_at timestamptz,
  add column if not exists dunning_level integer not null default 0,
  add column if not exists is_archived boolean not null default false,
  add column if not exists archived_at timestamptz,
  add column if not exists client_submit_token text,
  add column if not exists converted_to_invoice_id uuid references public.invoices (id) on delete set null,
  add column if not exists source_quote_id uuid references public.invoices (id) on delete set null;

alter table public.invoices
  add constraint invoices_dunning_level_check check (dunning_level between 0 and 3);

alter table public.invoices drop constraint if exists invoices_status_check;
alter table public.invoices add constraint invoices_status_check check (
  status in (
    -- Angebote
    'entwurf', 'versendet', 'in_pruefung', 'angenommen', 'abgelehnt', 'abgelaufen',
    -- Rechnungen (entwurf/versendet teilen sich das Wort, werden aber je
    -- nach kind unterschiedlich beschriftet, siehe lib/invoices.ts)
    'offen', 'teilbezahlt', 'bezahlt', 'ueberfaellig', 'storniert'
  )
);

create unique index if not exists invoices_company_submit_token_idx
  on public.invoices (company_id, client_submit_token) where client_submit_token is not null;
create index if not exists invoices_status_idx on public.invoices (company_id, status);
create index if not exists invoices_assigned_to_idx on public.invoices (company_id, assigned_to);
create index if not exists invoices_is_archived_idx on public.invoices (company_id, is_archived);

-- Fortlaufende Nummern getrennt je Dokumenttyp (AN-00001 für Angebote,
-- RE-00001 für Rechnungen), analog zu next_report_number()/
-- next_material_number() – ein Zähler je (Firma, Dokumenttyp).
create table if not exists public.invoice_number_counters (
  company_id uuid not null references public.companies (id) on delete cascade,
  kind text not null check (kind in ('angebot', 'rechnung')),
  next_number integer not null default 1,
  primary key (company_id, kind)
);
alter table public.invoice_number_counters enable row level security;
create policy "invoice_number_counters_select_own_company" on public.invoice_number_counters
  for select using (company_id = public.current_company_id());

create or replace function public.next_invoice_number(p_company_id uuid, p_kind text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number integer;
  v_prefix text;
begin
  if p_kind = 'angebot' then
    v_prefix := 'AN-';
  else
    v_prefix := 'RE-';
  end if;

  insert into public.invoice_number_counters (company_id, kind, next_number)
  values (p_company_id, p_kind, 2)
  on conflict (company_id, kind) do update set next_number = invoice_number_counters.next_number + 1
  returning next_number - 1 into v_number;

  return v_prefix || lpad(v_number::text, 5, '0');
end;
$$;
revoke all on function public.next_invoice_number(uuid, text) from public;
grant execute on function public.next_invoice_number(uuid, text) to authenticated;

-- Zeitleiste je Angebot/Rechnung (erstellt, versendet, geöffnet,
-- angenommen/abgelehnt, Zahlung erfasst, Mahnung, archiviert, …).
create table if not exists public.invoice_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  invoice_id uuid references public.invoices (id) on delete cascade,
  invoice_label text,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  summary text,
  created_at timestamptz not null default now()
);
create index if not exists invoice_history_invoice_id_idx on public.invoice_history (invoice_id, created_at desc);
alter table public.invoice_history enable row level security;
create policy "invoice_history_select_own_company" on public.invoice_history
  for select using (company_id = public.current_company_id());
create policy "invoice_history_insert_own_company" on public.invoice_history
  for insert with check (company_id = public.current_company_id());

-- Bestehende Einträge ohne Nummer nachträglich nummerieren, damit Alt-
-- Datensätze (u. a. aus dem Einsatzberichte-Automatismus) in Tabelle/
-- Export nicht als "Ohne Nummer" auftauchen.
do $$
declare
  r record;
begin
  for r in select id, company_id, kind from public.invoices where invoice_number is null order by created_at asc
  loop
    update public.invoices set invoice_number = public.next_invoice_number(r.company_id, r.kind) where id = r.id;
  end loop;
end $$;
