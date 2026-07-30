-- KanalPro: Auftragsmanagement
-- Ein Auftrag gehört immer zu genau einem Unternehmen (Tenant) und kann
-- optional einem Kunden sowie einem Mitarbeiter zugeordnet werden.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  assigned_to uuid references public.profiles (id) on delete set null,
  title text not null,
  description text,
  status text not null default 'offen' check (status in ('offen', 'eingeplant', 'in_arbeit', 'abgeschlossen')),
  scheduled_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_company_id_idx on public.orders (company_id);
create index if not exists orders_customer_id_idx on public.orders (customer_id);
create index if not exists orders_company_status_idx on public.orders (company_id, status);

alter table public.orders enable row level security;

create trigger orders_set_updated_at
  before update on public.orders
  for each row
  execute function public.set_updated_at();

create policy "orders_select_own_company"
  on public.orders for select
  using (company_id = public.current_company_id());

create policy "orders_insert_own_company"
  on public.orders for insert
  with check (company_id = public.current_company_id());

create policy "orders_update_own_company"
  on public.orders for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy "orders_delete_own_company"
  on public.orders for delete
  using (company_id = public.current_company_id());
