-- 1. Kundennummern-Zähler pro Unternehmen, atomar über SECURITY DEFINER Funktion
create table if not exists public.customer_number_counters (
  company_id uuid primary key references public.companies (id) on delete cascade,
  next_number integer not null default 1
);
alter table public.customer_number_counters enable row level security;
create policy "customer_number_counters_select_own_company" on public.customer_number_counters
  for select using (company_id = public.current_company_id());

create or replace function public.next_customer_number(p_company_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number integer;
begin
  insert into public.customer_number_counters (company_id, next_number)
  values (p_company_id, 2)
  on conflict (company_id) do update set next_number = customer_number_counters.next_number + 1
  returning next_number - 1 into v_number;
  return 'K-' || lpad(v_number::text, 5, '0');
end;
$$;
revoke all on function public.next_customer_number(uuid) from public;
grant execute on function public.next_customer_number(uuid) to authenticated;

-- 2. customers: bestehende kind-Werte auf neues, breiteres Set migrieren
alter table public.customers drop constraint if exists customers_kind_check;
update public.customers set kind = 'gewerbe' where kind = 'firma';
alter table public.customers add constraint customers_kind_check
  check (kind in ('privat', 'gewerbe', 'industrie', 'kommune', 'sonstige'));

-- 3. customers: neue Spalten
alter table public.customers
  add column if not exists customer_number text,
  add column if not exists status text not null default 'interessent'
    check (status in ('interessent', 'aktiv', 'inaktiv', 'gesperrt')),
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists company_name text,
  add column if not exists legal_form text,
  add column if not exists register_number text,
  add column if not exists vat_id text,
  add column if not exists mobile text,
  add column if not exists fax text,
  add column if not exists website text,
  add column if not exists country text not null default 'Deutschland',
  add column if not exists billing_street text,
  add column if not exists billing_postal_code text,
  add column if not exists billing_city text,
  add column if not exists billing_same_as_main boolean not null default true,
  add column if not exists service_street text,
  add column if not exists service_postal_code text,
  add column if not exists service_city text,
  add column if not exists service_same_as_main boolean not null default true,
  add column if not exists latitude numeric,
  add column if not exists longitude numeric,
  add column if not exists payment_term_days integer,
  add column if not exists discount_percent numeric,
  add column if not exists discount_days integer,
  add column if not exists debitor_number text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists created_by uuid references public.profiles (id) on delete set null,
  add column if not exists updated_by uuid references public.profiles (id) on delete set null;

-- Bestehende Kunden ohne Nummer nachträglich durchnummerieren
do $$
declare
  r record;
begin
  for r in select id, company_id from public.customers where customer_number is null order by created_at asc
  loop
    update public.customers set customer_number = public.next_customer_number(r.company_id) where id = r.id;
  end loop;
end $$;

create unique index if not exists customers_company_customer_number_idx
  on public.customers (company_id, customer_number) where customer_number is not null;

-- 4. Ansprechpartner
create table if not exists public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  name text not null,
  role text,
  phone text,
  email text,
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customer_contacts_customer_id_idx on public.customer_contacts (customer_id);
alter table public.customer_contacts enable row level security;
create trigger customer_contacts_set_updated_at before update on public.customer_contacts
  for each row execute function public.set_updated_at();
create policy "customer_contacts_select_own_company" on public.customer_contacts
  for select using (company_id = public.current_company_id());
create policy "customer_contacts_insert_own_company" on public.customer_contacts
  for insert with check (company_id = public.current_company_id());
create policy "customer_contacts_update_own_company" on public.customer_contacts
  for update using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
create policy "customer_contacts_delete_own_company" on public.customer_contacts
  for delete using (company_id = public.current_company_id());

-- 5. Dokumente (Metadaten; Dateien liegen im Storage-Bucket customer-documents)
create table if not exists public.customer_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  content_type text,
  size_bytes bigint,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists customer_documents_customer_id_idx on public.customer_documents (customer_id);
alter table public.customer_documents enable row level security;
create policy "customer_documents_select_own_company" on public.customer_documents
  for select using (company_id = public.current_company_id());
create policy "customer_documents_insert_own_company" on public.customer_documents
  for insert with check (company_id = public.current_company_id());
create policy "customer_documents_delete_own_company" on public.customer_documents
  for delete using (company_id = public.current_company_id());

-- 6. Interne Notizen (append-only Verlauf)
create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);
create index if not exists customer_notes_customer_id_idx on public.customer_notes (customer_id);
alter table public.customer_notes enable row level security;
create policy "customer_notes_select_own_company" on public.customer_notes
  for select using (company_id = public.current_company_id());
create policy "customer_notes_insert_own_company" on public.customer_notes
  for insert with check (company_id = public.current_company_id());

-- 7. Audit-Log (revisionssicher: keine Update-/Delete-Policy, nur Insert+Select)
create table if not exists public.customer_audit_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null check (action in ('created', 'updated', 'deleted')),
  summary text,
  created_at timestamptz not null default now()
);
create index if not exists customer_audit_log_customer_id_idx on public.customer_audit_log (customer_id);
alter table public.customer_audit_log enable row level security;
create policy "customer_audit_log_select_own_company" on public.customer_audit_log
  for select using (company_id = public.current_company_id());
create policy "customer_audit_log_insert_own_company" on public.customer_audit_log
  for insert with check (company_id = public.current_company_id());

-- 8. Storage-Bucket für Kundendokumente (privat), Pfad-Konvention: {company_id}/{customer_id}/{dateiname}
insert into storage.buckets (id, name, public)
values ('customer-documents', 'customer-documents', false)
on conflict (id) do nothing;

create policy "customer_documents_storage_select" on storage.objects
  for select using (
    bucket_id = 'customer-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );
create policy "customer_documents_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'customer-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );
create policy "customer_documents_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'customer-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );
