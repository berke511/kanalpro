create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  unit text not null default 'Stück',
  quantity numeric not null default 0,
  min_quantity numeric,
  unit_price numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists materials_company_id_idx on public.materials (company_id);

alter table public.materials enable row level security;

create trigger materials_set_updated_at
  before update on public.materials
  for each row execute function public.set_updated_at();

create policy "materials_select_own_company" on public.materials
  for select using (company_id = public.current_company_id());

create policy "materials_insert_own_company" on public.materials
  for insert with check (company_id = public.current_company_id());

create policy "materials_update_own_company" on public.materials
  for update using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy "materials_delete_own_company" on public.materials
  for delete using (company_id = public.current_company_id());
