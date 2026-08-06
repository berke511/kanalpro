-- KanalPro: Einsatzberichte – umfassender Ausbau
--
-- service_reports bestand bisher nur aus order_id/report_date/
-- work_performed/hours_worked/materials_notes/customer_signature_name/
-- signed_at (0009_service_reports.sql) mit einfacher firmenweiter RLS ohne
-- Rollenprüfung. Diese Migration baut den Einsatzbericht zur zentralen
-- Schnittstelle zwischen Auftrag, Material, Fahrzeugen/Maschinen, Mitarbeitern
-- und Rechnungsstellung aus – analog zum Aufbau der Material- und
-- Fahrzeugverwaltung (0022/0023).
--
-- Sichtbarkeit/Bearbeitbarkeit wird konsequent über die bestehenden
-- can_view_order(order_id)/can_edit_order(order_id)-Helfer aus
-- 0019_orders_foundation.sql geregelt, damit Techniker wie bei Aufträgen nur
-- Berichte zu eigenen Aufträgen sehen bzw. bearbeiten.

-- =====================================================================
-- 1. service_reports erweitern
-- =====================================================================
alter table public.service_reports
  add column if not exists report_number text,
  add column if not exists status text not null default 'entwurf',
  add column if not exists customer_id uuid references public.customers (id) on delete set null,
  add column if not exists start_time time,
  add column if not exists end_time time,
  add column if not exists break_minutes integer,
  add column if not exists weather text,
  add column if not exists work_types text[],
  add column if not exists customer_signature_role text,
  add column if not exists customer_signature_path text,
  add column if not exists gps_lat numeric(10, 6),
  add column if not exists gps_lng numeric(10, 6),
  add column if not exists internal_notes text,
  add column if not exists pdf_generated_at timestamptz,
  add column if not exists email_sent_at timestamptz,
  add column if not exists invoice_prepared_at timestamptz,
  add column if not exists is_archived boolean not null default false,
  add column if not exists archived_at timestamptz,
  add column if not exists created_by uuid references public.profiles (id) on delete set null;

alter table public.service_reports drop constraint if exists service_reports_status_check;
alter table public.service_reports
  add constraint service_reports_status_check
  check (status in ('entwurf', 'in_bearbeitung', 'zur_pruefung', 'unterschrieben', 'abgeschlossen', 'archiviert'));

alter table public.service_reports drop constraint if exists service_reports_work_types_check;
alter table public.service_reports
  add constraint service_reports_work_types_check
  check (
    work_types is null or work_types <@ array[
      'kanalreinigung', 'tv_inspektion', 'dichtheitspruefung', 'fraesarbeiten',
      'spuelarbeiten', 'reparatur', 'sanierung', 'sonstige'
    ]::text[]
  );

-- Bestehende Berichte: Kunde aus dem verknüpften Auftrag übernehmen, damit
-- Filterung/Anzeige ab sofort ohne Zusatzabfrage funktioniert; bereits
-- unterschriebene/abgeschlossene Berichte bekommen einen passenden Status.
update public.service_reports sr
set customer_id = o.customer_id
from public.orders o
where sr.order_id = o.id and sr.customer_id is null;

update public.service_reports
set status = 'unterschrieben'
where status = 'entwurf' and signed_at is not null;

-- Berichtsnummern-Zähler pro Unternehmen (analog next_material_number).
create table if not exists public.report_number_counters (
  company_id uuid primary key references public.companies (id) on delete cascade,
  next_number integer not null default 1
);
alter table public.report_number_counters enable row level security;
create policy "report_number_counters_select_own_company" on public.report_number_counters
  for select using (company_id = public.current_company_id());

create or replace function public.next_report_number(p_company_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number integer;
begin
  insert into public.report_number_counters (company_id, next_number)
  values (p_company_id, 2)
  on conflict (company_id) do update set next_number = report_number_counters.next_number + 1
  returning next_number - 1 into v_number;
  return 'B-' || lpad(v_number::text, 5, '0');
end;
$$;
revoke all on function public.next_report_number(uuid) from public;
grant execute on function public.next_report_number(uuid) to authenticated;

do $$
declare
  r record;
begin
  for r in select id, company_id from public.service_reports where report_number is null order by created_at asc
  loop
    update public.service_reports set report_number = public.next_report_number(r.company_id) where id = r.id;
  end loop;
end $$;

create unique index if not exists service_reports_company_report_number_idx
  on public.service_reports (company_id, report_number) where report_number is not null;
create index if not exists service_reports_status_idx on public.service_reports (company_id, status);
create index if not exists service_reports_customer_id_idx on public.service_reports (customer_id);

-- =====================================================================
-- 2. service_reports: rollenbasierte RLS (ersetzt die bisherige, rein
--    firmenweite RLS aus 0009 – analog zu orders in 0019).
-- =====================================================================
drop policy if exists "service_reports_select_own_company" on public.service_reports;
create policy "service_reports_select_own_company" on public.service_reports
  for select using (company_id = public.current_company_id() and public.can_view_order(order_id));

drop policy if exists "service_reports_insert_own_company" on public.service_reports;
create policy "service_reports_insert_own_company" on public.service_reports
  for insert with check (company_id = public.current_company_id() and public.can_edit_order(order_id));

drop policy if exists "service_reports_update_own_company" on public.service_reports;
create policy "service_reports_update_own_company" on public.service_reports
  for update using (company_id = public.current_company_id() and public.can_edit_order(order_id))
  with check (company_id = public.current_company_id());

drop policy if exists "service_reports_delete_own_company" on public.service_reports;
create policy "service_reports_delete_own_company" on public.service_reports
  for delete using (
    company_id = public.current_company_id()
    and public.current_user_role() <> 'techniker'
  );

drop trigger if exists service_reports_set_updated_at on public.service_reports;
create trigger service_reports_set_updated_at
  before update on public.service_reports
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 3. Fotos (Vorher/Nachher/Schaden/Baustelle)
-- =====================================================================
create table if not exists public.report_photos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  report_id uuid not null references public.service_reports (id) on delete cascade,
  category text not null check (category in ('vorher', 'nachher', 'schaden', 'baustelle')),
  file_name text not null,
  storage_path text not null,
  size_bytes bigint,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists report_photos_report_id_idx on public.report_photos (report_id);
alter table public.report_photos enable row level security;

create policy "report_photos_select_own_company" on public.report_photos
  for select using (
    company_id = public.current_company_id()
    and exists (
      select 1 from public.service_reports sr
      where sr.id = report_photos.report_id and public.can_view_order(sr.order_id)
    )
  );
create policy "report_photos_insert_own_company" on public.report_photos
  for insert with check (
    company_id = public.current_company_id()
    and exists (
      select 1 from public.service_reports sr
      where sr.id = report_photos.report_id and public.can_edit_order(sr.order_id)
    )
  );
create policy "report_photos_delete_own_company" on public.report_photos
  for delete using (
    company_id = public.current_company_id()
    and exists (
      select 1 from public.service_reports sr
      where sr.id = report_photos.report_id and public.can_edit_order(sr.order_id)
    )
  );

-- =====================================================================
-- 4. Materialverbrauch pro Bericht (separat von order_materials, bucht bei
--    Fertigstellung über material_movements/computeAutoStatus-Logik ab).
-- =====================================================================
create table if not exists public.report_materials (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  report_id uuid not null references public.service_reports (id) on delete cascade,
  material_id uuid not null references public.materials (id) on delete restrict,
  quantity numeric(10, 2) not null,
  unit_price numeric(10, 2),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists report_materials_report_id_idx on public.report_materials (report_id);
alter table public.report_materials enable row level security;

create policy "report_materials_select_own_company" on public.report_materials
  for select using (
    company_id = public.current_company_id()
    and exists (
      select 1 from public.service_reports sr
      where sr.id = report_materials.report_id and public.can_view_order(sr.order_id)
    )
  );
create policy "report_materials_insert_own_company" on public.report_materials
  for insert with check (
    company_id = public.current_company_id()
    and exists (
      select 1 from public.service_reports sr
      where sr.id = report_materials.report_id and public.can_edit_order(sr.order_id)
    )
  );
create policy "report_materials_update_own_company" on public.report_materials
  for update using (
    company_id = public.current_company_id()
    and exists (
      select 1 from public.service_reports sr
      where sr.id = report_materials.report_id and public.can_edit_order(sr.order_id)
    )
  )
  with check (company_id = public.current_company_id());
create policy "report_materials_delete_own_company" on public.report_materials
  for delete using (
    company_id = public.current_company_id()
    and exists (
      select 1 from public.service_reports sr
      where sr.id = report_materials.report_id and public.can_edit_order(sr.order_id)
    )
  );

-- =====================================================================
-- 5. Genutzte Maschinen/Fahrzeuge pro Bericht (echte fleet_items statt
--    fest codierter Liste, da fleet_items.kind ohnehin fahrzeug/maschine
--    unterscheidet).
-- =====================================================================
create table if not exists public.report_machines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  report_id uuid not null references public.service_reports (id) on delete cascade,
  fleet_item_id uuid not null references public.fleet_items (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (report_id, fleet_item_id)
);
create index if not exists report_machines_report_id_idx on public.report_machines (report_id);
alter table public.report_machines enable row level security;

create policy "report_machines_select_own_company" on public.report_machines
  for select using (
    company_id = public.current_company_id()
    and exists (
      select 1 from public.service_reports sr
      where sr.id = report_machines.report_id and public.can_view_order(sr.order_id)
    )
  );
create policy "report_machines_insert_own_company" on public.report_machines
  for insert with check (
    company_id = public.current_company_id()
    and exists (
      select 1 from public.service_reports sr
      where sr.id = report_machines.report_id and public.can_edit_order(sr.order_id)
    )
  );
create policy "report_machines_delete_own_company" on public.report_machines
  for delete using (
    company_id = public.current_company_id()
    and exists (
      select 1 from public.service_reports sr
      where sr.id = report_machines.report_id and public.can_edit_order(sr.order_id)
    )
  );

-- =====================================================================
-- 6. Beteiligte Mitarbeiter pro Bericht (bei Erstellung aus
--    order_assignments vorbefüllt, danach frei editierbar).
-- =====================================================================
create table if not exists public.report_employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  report_id uuid not null references public.service_reports (id) on delete cascade,
  employee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (report_id, employee_id)
);
create index if not exists report_employees_report_id_idx on public.report_employees (report_id);
alter table public.report_employees enable row level security;

create policy "report_employees_select_own_company" on public.report_employees
  for select using (
    company_id = public.current_company_id()
    and exists (
      select 1 from public.service_reports sr
      where sr.id = report_employees.report_id and public.can_view_order(sr.order_id)
    )
  );
create policy "report_employees_insert_own_company" on public.report_employees
  for insert with check (
    company_id = public.current_company_id()
    and exists (
      select 1 from public.service_reports sr
      where sr.id = report_employees.report_id and public.can_edit_order(sr.order_id)
    )
  );
create policy "report_employees_delete_own_company" on public.report_employees
  for delete using (
    company_id = public.current_company_id()
    and exists (
      select 1 from public.service_reports sr
      where sr.id = report_employees.report_id and public.can_edit_order(sr.order_id)
    )
  );

-- =====================================================================
-- 7. Historie (revisionssicher, analog order_audit_log).
-- =====================================================================
create table if not exists public.report_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  report_id uuid references public.service_reports (id) on delete set null,
  report_label text,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null check (action in (
    'created', 'updated', 'status_changed', 'photo_added', 'material_added',
    'material_consumed', 'signed', 'pdf_generated', 'email_sent',
    'invoice_prepared', 'archived', 'unarchived', 'deleted'
  )),
  summary text,
  created_at timestamptz not null default now()
);
create index if not exists report_history_report_id_idx on public.report_history (report_id);
create index if not exists report_history_company_id_idx on public.report_history (company_id);
alter table public.report_history enable row level security;
create policy "report_history_select_own_company" on public.report_history
  for select using (
    company_id = public.current_company_id()
    and (report_id is null or exists (
      select 1 from public.service_reports sr
      where sr.id = report_history.report_id and public.can_view_order(sr.order_id)
    ))
  );
create policy "report_history_insert_own_company" on public.report_history
  for insert with check (company_id = public.current_company_id());

-- =====================================================================
-- 8. Storage-Buckets für Fotos & Unterschriften (privat, company-scoped
--    Ordnerstruktur wie order-documents – keine Rollenprüfung im Bucket,
--    da Techniker Berichte selbst erstellen/dokumentieren müssen; die
--    eigentliche Zugriffsprüfung läuft über can_view_order/can_edit_order
--    auf den Metadaten-Tabellen).
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('report-photos', 'report-photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('report-signatures', 'report-signatures', false)
on conflict (id) do nothing;

create policy "report_photos_storage_select" on storage.objects
  for select using (
    bucket_id = 'report-photos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );
create policy "report_photos_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'report-photos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );
create policy "report_photos_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'report-photos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

create policy "report_signatures_storage_select" on storage.objects
  for select using (
    bucket_id = 'report-signatures'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );
create policy "report_signatures_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'report-signatures'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );
create policy "report_signatures_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'report-signatures'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );
