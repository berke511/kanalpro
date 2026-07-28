-- KanalPro: Kundenverwaltung
-- Ein Kunde gehört immer zu genau einem Unternehmen (Tenant).

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  kind text not null default 'privat' check (kind in ('privat', 'firma')),
  name text not null,
  contact_person text,
  email text,
  phone text,
  street text,
  postal_code text,
  city text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_company_id_idx on public.customers (company_id);
create index if not exists customers_name_idx on public.customers (company_id, name);

alter table public.customers enable row level security;

-- Reusable trigger to keep `updated_at` current on every row update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger customers_set_updated_at
  before update on public.customers
  for each row
  execute function public.set_updated_at();

create policy "customers_select_own_company"
  on public.customers for select
  using (company_id = public.current_company_id());

create policy "customers_insert_own_company"
  on public.customers for insert
  with check (company_id = public.current_company_id());

create policy "customers_update_own_company"
  on public.customers for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy "customers_delete_own_company"
  on public.customers for delete
  using (company_id = public.current_company_id());
