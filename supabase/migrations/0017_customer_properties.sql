-- Objekte (Einsatzobjekte/Standorte) pro Kunde – z. B. mehrere Liegenschaften
-- oder Filialen, die unter demselben Kundendatensatz geführt werden.
-- Struktur/RLS-Muster bewusst identisch zu customer_contacts.

create table if not exists public.customer_properties (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  name text not null,
  street text,
  postal_code text,
  city text,
  country text not null default 'Deutschland',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_properties_customer_id_idx on public.customer_properties (customer_id);

alter table public.customer_properties enable row level security;

create trigger customer_properties_set_updated_at before update on public.customer_properties
  for each row execute function public.set_updated_at();

create policy "customer_properties_select_own_company" on public.customer_properties
  for select using (company_id = public.current_company_id());
create policy "customer_properties_insert_own_company" on public.customer_properties
  for insert with check (company_id = public.current_company_id());
create policy "customer_properties_update_own_company" on public.customer_properties
  for update using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
create policy "customer_properties_delete_own_company" on public.customer_properties
  for delete using (company_id = public.current_company_id());
