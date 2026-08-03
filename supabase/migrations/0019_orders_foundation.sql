-- KanalPro: Fundament für die überarbeitete Auftragsverwaltung.
-- Phase 1 von "Auftragsübersicht" – reine Datenbank-/Rollen-Grundlage,
-- ohne UI-Änderungen. Fügt hinzu: erweitertes Rollenmodell, Auftragsnummern,
-- Priorität, breiteres Status-Set, Objekt-/Disponent-Bezug, Termin-/Hinweis-
-- felder, Mehrfachzuweisung (Mitarbeiter/Fahrzeuge&Maschinen), Materialbedarf
-- pro Auftrag, Dokumente, Audit-Log und rollenbasierte Sichtbarkeit.

-- =====================================================================
-- 1. Rollenmodell erweitern
-- =====================================================================
-- Bisher nur owner/admin/mitarbeiter. Neu: Geschäftsführer, Büro,
-- Disponent, Techniker (laut Anforderung an die Auftragsverwaltung).
-- "owner" bleibt zusätzlich bestehen (Firmenersteller, volle Rechte wie
-- Admin/Geschäftsführer) und ist tief im Registrierungs-/Bootstrap-Fluss
-- verankert. Bestehende "mitarbeiter"-Profile werden auf "techniker"
-- migriert (häufigster Fall: operatives Außendienstpersonal).
update public.profiles set role = 'techniker' where role = 'mitarbeiter';

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('owner', 'admin', 'geschaeftsfuehrer', 'buero', 'disponent', 'techniker'));

alter table public.company_invites drop constraint if exists company_invites_role_check;
update public.company_invites set role = 'techniker' where role = 'mitarbeiter';
alter table public.company_invites add constraint company_invites_role_check
  check (role in ('admin', 'geschaeftsfuehrer', 'buero', 'disponent', 'techniker'));
alter table public.company_invites alter column role set default 'techniker';

-- Liefert die Rolle des angemeldeten Benutzers – SECURITY DEFINER analog zu
-- current_company_id(), damit RLS-Policies ohne Rekursion darauf zugreifen
-- können.
create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;
revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;

-- =====================================================================
-- 2. orders: Status-Set erweitern, neue Spalten
-- =====================================================================
alter table public.orders drop constraint if exists orders_status_check;
update public.orders set status = 'geplant' where status = 'eingeplant';
update public.orders set status = 'in_bearbeitung' where status = 'in_arbeit';
alter table public.orders add constraint orders_status_check
  check (status in (
    'entwurf', 'offen', 'geplant', 'disposition_ausstehend', 'einsatzbereit',
    'in_bearbeitung', 'pausiert', 'abschluss_ausstehend', 'abgeschlossen', 'storniert'
  ));

alter table public.orders
  add column if not exists order_number text,
  add column if not exists priority text not null default 'standard'
    check (priority in ('standard', 'zeitkritisch', 'notfall')),
  add column if not exists order_kind text not null default 'sonstige'
    check (order_kind in (
      'rohrreinigung', 'kanalreinigung', 'tv_inspektion', 'dichtheitspruefung',
      'fraesarbeiten', 'ortung', 'notdienst', 'sanierung', 'schachtreinigung',
      'sinkkastenreinigung', 'pumpwerk', 'sonstige'
    )),
  add column if not exists service_type text,
  add column if not exists property_id uuid references public.customer_properties (id) on delete set null,
  add column if not exists dispatcher_id uuid references public.profiles (id) on delete set null,
  add column if not exists created_by uuid references public.profiles (id) on delete set null,
  add column if not exists updated_by uuid references public.profiles (id) on delete set null,
  add column if not exists is_favorite boolean not null default false,
  add column if not exists is_archived boolean not null default false,
  add column if not exists start_time time,
  add column if not exists planned_duration_minutes integer,
  add column if not exists time_window_start time,
  add column if not exists time_window_end time,
  add column if not exists all_day boolean not null default false,
  add column if not exists is_recurring boolean not null default false,
  add column if not exists recurrence_rule text,
  add column if not exists internal_notes text,
  add column if not exists access_info text,
  add column if not exists arrival_info text,
  add column if not exists onsite_contact text,
  add column if not exists safety_notes text,
  add column if not exists order_value numeric,
  add column if not exists resources_assigned_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists documentation_completed_at timestamptz,
  add column if not exists completed_at timestamptz;

update public.orders set started_at = coalesce(started_at, updated_at)
  where status in ('in_bearbeitung', 'pausiert', 'abschluss_ausstehend', 'abgeschlossen') and started_at is null;
update public.orders set completed_at = coalesce(completed_at, updated_at)
  where status = 'abgeschlossen' and completed_at is null;

create index if not exists orders_company_archived_idx on public.orders (company_id, is_archived);
create index if not exists orders_property_id_idx on public.orders (property_id);
create index if not exists orders_dispatcher_id_idx on public.orders (dispatcher_id);

-- Auftragsnummern-Zähler pro Unternehmen (analog next_customer_number)
create table if not exists public.order_number_counters (
  company_id uuid primary key references public.companies (id) on delete cascade,
  next_number integer not null default 1
);
alter table public.order_number_counters enable row level security;
create policy "order_number_counters_select_own_company" on public.order_number_counters
  for select using (company_id = public.current_company_id());

create or replace function public.next_order_number(p_company_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number integer;
begin
  insert into public.order_number_counters (company_id, next_number)
  values (p_company_id, 2)
  on conflict (company_id) do update set next_number = order_number_counters.next_number + 1
  returning next_number - 1 into v_number;
  return 'A-' || lpad(v_number::text, 5, '0');
end;
$$;
revoke all on function public.next_order_number(uuid) from public;
grant execute on function public.next_order_number(uuid) to authenticated;

do $$
declare
  r record;
begin
  for r in select id, company_id from public.orders where order_number is null order by created_at asc
  loop
    update public.orders set order_number = public.next_order_number(r.company_id) where id = r.id;
  end loop;
end $$;

create unique index if not exists orders_company_order_number_idx
  on public.orders (company_id, order_number) where order_number is not null;

-- =====================================================================
-- 3. Mehrfachzuweisung: Mitarbeiter / Fahrzeuge & Maschinen
-- =====================================================================
-- Nur die Tabellen (ohne Policies) an dieser Stelle, da die weiter unten
-- definierten can_view_order()/can_edit_order()-Funktionen (language sql)
-- bereits beim Anlegen auf order_assignments verweisen und die Tabelle
-- daher vorher existieren muss.
create table if not exists public.order_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  employee_id uuid not null references public.profiles (id) on delete cascade,
  assigned_by uuid references public.profiles (id) on delete set null,
  assigned_at timestamptz not null default now(),
  unique (order_id, employee_id)
);
create index if not exists order_assignments_order_id_idx on public.order_assignments (order_id);
create index if not exists order_assignments_employee_id_idx on public.order_assignments (employee_id);
alter table public.order_assignments enable row level security;

create table if not exists public.order_resources (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  fleet_item_id uuid not null references public.fleet_items (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (order_id, fleet_item_id)
);
create index if not exists order_resources_order_id_idx on public.order_resources (order_id);
alter table public.order_resources enable row level security;

-- =====================================================================
-- 4. Sichtbarkeits-/Bearbeitungs-Helfer für rollenbasierte RLS
-- =====================================================================
-- Techniker dürfen laut Vorgabe nur zugewiesene Aufträge sehen bzw.
-- dokumentieren. Alle anderen Rollen (owner/admin/geschaeftsfuehrer/
-- buero/disponent) sehen/bearbeiten weiterhin alle Aufträge der Firma.
-- Feinere, spaltenspezifische Regeln (z. B. "Büro verknüpft kaufmännische
-- Dokumente") werden bewusst nicht per RLS, sondern in einer späteren
-- Phase auf Anwendungsebene (Server Actions) durchgesetzt.
create or replace function public.can_view_order(p_order_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id
      and o.company_id = public.current_company_id()
      and (
        public.current_user_role() <> 'techniker'
        or o.assigned_to = auth.uid()
        or o.dispatcher_id = auth.uid()
        or exists (
          select 1 from public.order_assignments oa
          where oa.order_id = o.id and oa.employee_id = auth.uid()
        )
      )
  );
$$;
revoke all on function public.can_view_order(uuid) from public;
grant execute on function public.can_view_order(uuid) to authenticated;

create or replace function public.can_edit_order(p_order_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id
      and o.company_id = public.current_company_id()
      and (
        public.current_user_role() <> 'techniker'
        or o.assigned_to = auth.uid()
        or exists (
          select 1 from public.order_assignments oa
          where oa.order_id = o.id and oa.employee_id = auth.uid()
        )
      )
  );
$$;
revoke all on function public.can_edit_order(uuid) from public;
grant execute on function public.can_edit_order(uuid) to authenticated;

-- =====================================================================
-- 5. Policies für order_assignments / order_resources (jetzt, da die
--    Sichtbarkeits-Helfer aus Abschnitt 4 existieren)
-- =====================================================================
create policy "order_assignments_select_own_company" on public.order_assignments
  for select using (company_id = public.current_company_id() and public.can_view_order(order_id));
create policy "order_assignments_insert_own_company" on public.order_assignments
  for insert with check (company_id = public.current_company_id() and public.current_user_role() <> 'techniker');
create policy "order_assignments_delete_own_company" on public.order_assignments
  for delete using (company_id = public.current_company_id() and public.current_user_role() <> 'techniker');

-- Bestehende Einzelzuweisung (orders.assigned_to) in die neue Tabelle
-- übernehmen, damit Mehrfachzuweisungs-Abfragen ab sofort vollständig sind.
insert into public.order_assignments (company_id, order_id, employee_id)
select company_id, id, assigned_to from public.orders
where assigned_to is not null
on conflict (order_id, employee_id) do nothing;

create policy "order_resources_select_own_company" on public.order_resources
  for select using (company_id = public.current_company_id() and public.can_view_order(order_id));
create policy "order_resources_insert_own_company" on public.order_resources
  for insert with check (company_id = public.current_company_id() and public.current_user_role() <> 'techniker');
create policy "order_resources_delete_own_company" on public.order_resources
  for delete using (company_id = public.current_company_id() and public.current_user_role() <> 'techniker');

-- =====================================================================
-- 6. Materialbedarf pro Auftrag
-- =====================================================================
create table if not exists public.order_materials (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  material_id uuid not null references public.materials (id) on delete restrict,
  quantity numeric not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists order_materials_order_id_idx on public.order_materials (order_id);
alter table public.order_materials enable row level security;
create trigger order_materials_set_updated_at before update on public.order_materials
  for each row execute function public.set_updated_at();
create policy "order_materials_select_own_company" on public.order_materials
  for select using (company_id = public.current_company_id() and public.can_view_order(order_id));
create policy "order_materials_insert_own_company" on public.order_materials
  for insert with check (company_id = public.current_company_id() and public.can_edit_order(order_id));
create policy "order_materials_update_own_company" on public.order_materials
  for update using (company_id = public.current_company_id() and public.can_edit_order(order_id))
  with check (company_id = public.current_company_id());
create policy "order_materials_delete_own_company" on public.order_materials
  for delete using (company_id = public.current_company_id() and public.can_edit_order(order_id));

-- =====================================================================
-- 7. Dokumente (Metadaten; Dateien im Storage-Bucket order-documents)
-- =====================================================================
create table if not exists public.order_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  content_type text,
  size_bytes bigint,
  category text not null default 'dokument' check (category in ('dokument', 'bild', 'plan')),
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists order_documents_order_id_idx on public.order_documents (order_id);
alter table public.order_documents enable row level security;
create policy "order_documents_select_own_company" on public.order_documents
  for select using (company_id = public.current_company_id() and public.can_view_order(order_id));
create policy "order_documents_insert_own_company" on public.order_documents
  for insert with check (company_id = public.current_company_id() and public.can_edit_order(order_id));
create policy "order_documents_delete_own_company" on public.order_documents
  for delete using (company_id = public.current_company_id() and public.can_edit_order(order_id));

insert into storage.buckets (id, name, public)
values ('order-documents', 'order-documents', false)
on conflict (id) do nothing;

create policy "order_documents_storage_select" on storage.objects
  for select using (
    bucket_id = 'order-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );
create policy "order_documents_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'order-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );
create policy "order_documents_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'order-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

-- =====================================================================
-- 8. Audit-Log (revisionssicher, überlebt Löschung wie customer_audit_log)
-- =====================================================================
create table if not exists public.order_audit_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  order_label text,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null check (action in (
    'created', 'updated', 'status_changed', 'assigned', 'unassigned',
    'resource_assigned', 'resource_unassigned', 'material_added',
    'document_uploaded', 'note_added', 'archived', 'unarchived', 'deleted'
  )),
  summary text,
  created_at timestamptz not null default now()
);
create index if not exists order_audit_log_order_id_idx on public.order_audit_log (order_id);
create index if not exists order_audit_log_company_id_idx on public.order_audit_log (company_id);
alter table public.order_audit_log enable row level security;
create policy "order_audit_log_select_own_company" on public.order_audit_log
  for select using (
    company_id = public.current_company_id()
    and (order_id is null or public.can_view_order(order_id))
  );
create policy "order_audit_log_insert_own_company" on public.order_audit_log
  for insert with check (company_id = public.current_company_id());

-- =====================================================================
-- 9. orders: rollenbasierte RLS-Policies (ersetzt die bisherigen)
-- =====================================================================
drop policy if exists "orders_select_own_company" on public.orders;
create policy "orders_select_own_company" on public.orders
  for select using (public.can_view_order(id));

drop policy if exists "orders_insert_own_company" on public.orders;
create policy "orders_insert_own_company" on public.orders
  for insert with check (
    company_id = public.current_company_id()
    and public.current_user_role() <> 'techniker'
  );

drop policy if exists "orders_update_own_company" on public.orders;
create policy "orders_update_own_company" on public.orders
  for update using (public.can_edit_order(id))
  with check (company_id = public.current_company_id());

-- Löschen/Archivieren bewusst enger: nur volle Rechte-Rollen (siehe
-- Anforderung "Lösch- und Archivierungsrechte müssen gesondert geprüft
-- werden"). Archivieren läuft technisch über ein normales UPDATE
-- (is_archived) und bleibt daher zusätzlich an die Server-Action-Ebene
-- gekoppelt (Phase 4), die Delete-Policy hier ist die harte DB-Grenze.
drop policy if exists "orders_delete_own_company" on public.orders;
create policy "orders_delete_own_company" on public.orders
  for delete using (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'geschaeftsfuehrer')
  );
