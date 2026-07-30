-- KanalPro: Fahrzeug- & Maschinenverwaltung
-- Ein Fahrzeug oder eine Maschine gehört immer zu genau einem Unternehmen (Tenant).

create table if not exists public.fleet_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  kind text not null default 'fahrzeug' check (kind in ('fahrzeug', 'maschine')),
  name text not null,
  license_plate text,
  status text not null default 'verfuegbar' check (status in ('verfuegbar', 'im_einsatz', 'wartung', 'defekt')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fleet_items_company_id_idx on public.fleet_items (company_id);
create index if not exists fleet_items_company_kind_idx on public.fleet_items (company_id, kind);

alter table public.fleet_items enable row level security;

create trigger fleet_items_set_updated_at
  before update on public.fleet_items
  for each row
  execute function public.set_updated_at();

create policy "fleet_items_select_own_company"
  on public.fleet_items for select
  using (company_id = public.current_company_id());

create policy "fleet_items_insert_own_company"
  on public.fleet_items for insert
  with check (company_id = public.current_company_id());

create policy "fleet_items_update_own_company"
  on public.fleet_items for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy "fleet_items_delete_own_company"
  on public.fleet_items for delete
  using (company_id = public.current_company_id());
