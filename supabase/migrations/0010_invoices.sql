create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  kind text not null default 'rechnung' check (kind in ('angebot', 'rechnung')),
  invoice_number text,
  status text not null default 'entwurf' check (status in ('entwurf', 'versendet', 'bezahlt', 'storniert')),
  issue_date date not null default current_date,
  due_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  description text not null,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoices_company_id_idx on public.invoices (company_id);
create index if not exists invoices_customer_id_idx on public.invoices (customer_id);
create index if not exists invoice_items_company_id_idx on public.invoice_items (company_id);
create index if not exists invoice_items_invoice_id_idx on public.invoice_items (invoice_id);

alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

create trigger invoice_items_set_updated_at
  before update on public.invoice_items
  for each row execute function public.set_updated_at();

create policy "invoices_select_own_company" on public.invoices
  for select using (company_id = public.current_company_id());
create policy "invoices_insert_own_company" on public.invoices
  for insert with check (company_id = public.current_company_id());
create policy "invoices_update_own_company" on public.invoices
  for update using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());
create policy "invoices_delete_own_company" on public.invoices
  for delete using (company_id = public.current_company_id());

create policy "invoice_items_select_own_company" on public.invoice_items
  for select using (company_id = public.current_company_id());
create policy "invoice_items_insert_own_company" on public.invoice_items
  for insert with check (company_id = public.current_company_id());
create policy "invoice_items_update_own_company" on public.invoice_items
  for update using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());
create policy "invoice_items_delete_own_company" on public.invoice_items
  for delete using (company_id = public.current_company_id());
