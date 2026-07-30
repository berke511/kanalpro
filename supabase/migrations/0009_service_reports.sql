create table if not exists public.service_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  report_date date not null default current_date,
  work_performed text not null,
  hours_worked numeric,
  materials_notes text,
  customer_signature_name text,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_reports_company_id_idx on public.service_reports (company_id);
create index if not exists service_reports_order_id_idx on public.service_reports (order_id);

alter table public.service_reports enable row level security;

create trigger service_reports_set_updated_at
  before update on public.service_reports
  for each row execute function public.set_updated_at();

create policy "service_reports_select_own_company" on public.service_reports
  for select using (company_id = public.current_company_id());

create policy "service_reports_insert_own_company" on public.service_reports
  for insert with check (company_id = public.current_company_id());

create policy "service_reports_update_own_company" on public.service_reports
  for update using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy "service_reports_delete_own_company" on public.service_reports
  for delete using (company_id = public.current_company_id());
