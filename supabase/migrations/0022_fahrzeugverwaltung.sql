-- KanalPro: Fahrzeug- & Maschinenverwaltung – umfassender Ausbau
--
-- fleet_items bestand bisher nur aus kind/name/license_plate/status/notes.
-- Diese Migration erweitert die Tabelle um Stammdaten, technische Daten,
-- Wartungs-/Prüftermine, Leasing/Kraftstoff sowie branchenspezifische Felder
-- (Besatzung/Ausrüstung/Einsatzgebiet), und ergänzt drei neue Tabellen für
-- Wartungs-/Reparaturhistorie, sonstige Kosten und Dokumente – analog zum
-- Aufbau der Mitarbeiterverwaltung (0020_mitarbeiterverwaltung.sql).
--
-- "Zugewiesener Mitarbeiter" wird bewusst NICHT als eigene Spalte auf
-- fleet_items geführt, sondern weiterhin einzig über profiles.main_vehicle_id
-- (bestehende FK aus der Mitarbeiterverwaltung) abgeleitet – so bleibt die
-- Zuordnung Fahrzeug<->Mitarbeiter an einer einzigen Quelle der Wahrheit.

alter table public.fleet_items
  add column if not exists photo_path text,
  add column if not exists inventory_number text,
  add column if not exists manufacturer text,
  add column if not exists model text,
  add column if not exists year_built integer,
  add column if not exists location text,
  add column if not exists service_area text,
  add column if not exists odometer_km numeric(10, 1),
  add column if not exists operating_hours numeric(10, 1),
  add column if not exists odometer_interval_km numeric(10, 1),
  add column if not exists operating_hours_interval numeric(10, 1),
  add column if not exists last_maintenance_at date,
  add column if not exists next_maintenance_at date,
  add column if not exists next_maintenance_note text,
  add column if not exists tuv_due_date date,
  add column if not exists uvv_due_date date,
  add column if not exists insurance_due_date date,
  add column if not exists leasing_end_date date,
  add column if not exists ownership text,
  add column if not exists fuel_type text,
  add column if not exists default_crew_size integer,
  add column if not exists max_crew_size integer,
  add column if not exists default_equipment text,
  add column if not exists linked_vehicle_id uuid references public.fleet_items (id) on delete set null,
  add column if not exists is_archived boolean not null default false,
  add column if not exists tuv_reminder_sent_at timestamptz,
  add column if not exists uvv_reminder_sent_at timestamptz,
  add column if not exists maintenance_reminder_sent_at timestamptz,
  add column if not exists insurance_reminder_sent_at timestamptz,
  add column if not exists leasing_reminder_sent_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

-- Erweitertes Status-Set (bisher nur 4 Werte). Bestehende Daten sind davon
-- nicht betroffen, da alle bisherigen Werte im neuen Set enthalten sind.
alter table public.fleet_items drop constraint if exists fleet_items_status_check;
alter table public.fleet_items
  add constraint fleet_items_status_check
  check (status in ('verfuegbar', 'im_einsatz', 'reserviert', 'wartung', 'werkstatt', 'defekt', 'ausser_betrieb'));

alter table public.fleet_items drop constraint if exists fleet_items_ownership_check;
alter table public.fleet_items
  add constraint fleet_items_ownership_check
  check (ownership is null or ownership in ('eigentum', 'leasing'));

alter table public.fleet_items drop constraint if exists fleet_items_fuel_type_check;
alter table public.fleet_items
  add constraint fleet_items_fuel_type_check
  check (fuel_type is null or fuel_type in ('diesel', 'benzin', 'elektro', 'hybrid', 'gas', 'sonstige'));

drop trigger if exists fleet_items_set_updated_at on public.fleet_items;
create trigger fleet_items_set_updated_at
  before update on public.fleet_items
  for each row execute function public.set_updated_at();

-- Rollenbasierte Schreibrechte nachziehen (bisher durfte jedes
-- Firmenmitglied Fahrzeuge/Maschinen anlegen/ändern/löschen) – analog zu
-- order_resources: Owner/Admin/Geschäftsführer/Disponent verwalten den
-- Fuhrpark, alle Firmenmitglieder dürfen lesen.
drop policy if exists fleet_items_insert_own_company on public.fleet_items;
create policy fleet_items_insert_own_company on public.fleet_items
  for insert
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );

drop policy if exists fleet_items_update_own_company on public.fleet_items;
create policy fleet_items_update_own_company on public.fleet_items
  for update
  using (company_id = public.current_company_id())
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );

drop policy if exists fleet_items_delete_own_company on public.fleet_items;
create policy fleet_items_delete_own_company on public.fleet_items
  for delete
  using (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );

-- Wartungs-/Reparaturhistorie (deckt zugleich TÜV-/UVV-Prüfprotokolle ab).
create table public.fleet_maintenance_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  fleet_item_id uuid not null references public.fleet_items (id) on delete cascade,
  record_type text not null check (record_type in ('wartung', 'reparatur', 'tuev', 'uvv', 'sonstige')),
  performed_at date not null,
  description text,
  cost numeric(10, 2),
  performed_by text,
  odometer_km numeric(10, 1),
  operating_hours numeric(10, 1),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.fleet_maintenance_records enable row level security;

create policy fleet_maintenance_select_own_company on public.fleet_maintenance_records
  for select using (company_id = public.current_company_id());

create policy fleet_maintenance_insert_own_company on public.fleet_maintenance_records
  for insert
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );

create policy fleet_maintenance_update_own_company on public.fleet_maintenance_records
  for update
  using (company_id = public.current_company_id())
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );

create policy fleet_maintenance_delete_own_company on public.fleet_maintenance_records
  for delete
  using (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );

-- Sonstige Kosten, die nicht an ein Wartungs-/Reparaturereignis gebunden
-- sind (Kraftstoff, Versicherung, Leasingraten, Sonstiges).
create table public.fleet_cost_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  fleet_item_id uuid not null references public.fleet_items (id) on delete cascade,
  category text not null check (category in ('kraftstoff', 'versicherung', 'leasing', 'sonstige')),
  amount numeric(10, 2) not null,
  occurred_at date not null,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.fleet_cost_entries enable row level security;

create policy fleet_costs_select_own_company on public.fleet_cost_entries
  for select using (company_id = public.current_company_id());

create policy fleet_costs_insert_own_company on public.fleet_cost_entries
  for insert
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );

create policy fleet_costs_update_own_company on public.fleet_cost_entries
  for update
  using (company_id = public.current_company_id())
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );

create policy fleet_costs_delete_own_company on public.fleet_cost_entries
  for delete
  using (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );

-- Dokumente (Fahrzeugschein, Versicherung, Leasingvertrag, TÜV-Berichte,
-- UVV-Prüfungen, Wartungsnachweise, Bedienungsanleitungen, Rechnungen).
create table public.fleet_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  fleet_item_id uuid not null references public.fleet_items (id) on delete cascade,
  category text not null check (
    category in ('fahrzeugschein', 'versicherung', 'leasingvertrag', 'tuev_bericht', 'uvv_pruefung', 'wartungsnachweis', 'bedienungsanleitung', 'rechnung', 'sonstiges')
  ),
  file_name text not null,
  storage_path text not null,
  size_bytes bigint,
  expires_at date,
  reminder_sent_at timestamptz,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.fleet_documents enable row level security;

create policy fleet_documents_select_own_company on public.fleet_documents
  for select using (company_id = public.current_company_id());

create policy fleet_documents_insert_own_company on public.fleet_documents
  for insert
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );

create policy fleet_documents_delete_own_company on public.fleet_documents
  for delete
  using (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );

-- Storage-Buckets für Fahrzeugbilder & -dokumente (privat, analog zu
-- employee-photos/employee-documents aus 0020).
insert into storage.buckets (id, name, public)
values ('fleet-photos', 'fleet-photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('fleet-documents', 'fleet-documents', false)
on conflict (id) do nothing;

create policy fleet_photos_select_own_company on storage.objects
  for select using (
    bucket_id = 'fleet-photos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

create policy fleet_photos_insert_own_company on storage.objects
  for insert
  with check (
    bucket_id = 'fleet-photos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );

create policy fleet_photos_delete_own_company on storage.objects
  for delete using (
    bucket_id = 'fleet-photos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );

create policy fleet_documents_bucket_select_own_company on storage.objects
  for select using (
    bucket_id = 'fleet-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

create policy fleet_documents_bucket_insert_own_company on storage.objects
  for insert
  with check (
    bucket_id = 'fleet-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );

create policy fleet_documents_bucket_delete_own_company on storage.objects
  for delete using (
    bucket_id = 'fleet-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );

-- Aktive Erinnerungen (TÜV/UVV/Wartung/Versicherung/Leasing/Dokumente) –
-- gleiches Muster wie sync_expiry_reminders() aus 0020: SECURITY DEFINER,
-- idempotent über *_reminder_sent_at, wird opportunistisch bei jedem
-- Seitenaufruf durch Admin-Rollen aufgerufen (siehe layout.tsx).
create or replace function public.sync_fleet_reminders(p_company_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_row record;
  v_recipient uuid;
begin
  if p_company_id is distinct from public.current_company_id() then
    raise exception 'Zugriff verweigert';
  end if;

  for v_row in
    select id, name, 'tuv' as reminder_kind, tuv_due_date as due_date
    from public.fleet_items
    where company_id = p_company_id and not is_archived
      and tuv_due_date is not null and tuv_due_date <= current_date + interval '30 days'
      and tuv_reminder_sent_at is null
    union all
    select id, name, 'uvv', uvv_due_date
    from public.fleet_items
    where company_id = p_company_id and not is_archived
      and uvv_due_date is not null and uvv_due_date <= current_date + interval '30 days'
      and uvv_reminder_sent_at is null
    union all
    select id, name, 'wartung', next_maintenance_at
    from public.fleet_items
    where company_id = p_company_id and not is_archived
      and next_maintenance_at is not null and next_maintenance_at <= current_date + interval '30 days'
      and maintenance_reminder_sent_at is null
    union all
    select id, name, 'versicherung', insurance_due_date
    from public.fleet_items
    where company_id = p_company_id and not is_archived
      and insurance_due_date is not null and insurance_due_date <= current_date + interval '30 days'
      and insurance_reminder_sent_at is null
    union all
    select id, name, 'leasing', leasing_end_date
    from public.fleet_items
    where company_id = p_company_id and not is_archived
      and leasing_end_date is not null and leasing_end_date <= current_date + interval '30 days'
      and leasing_reminder_sent_at is null
  loop
    for v_recipient in
      select p.id from public.profiles p
      where p.company_id = p_company_id and p.role = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
    loop
      insert into public.notifications (company_id, recipient_id, type, title, body, link)
      values (
        p_company_id,
        v_recipient,
        'fleet_' || v_row.reminder_kind || '_due',
        case v_row.reminder_kind
          when 'tuv' then 'TÜV läuft bald ab'
          when 'uvv' then 'UVV-Prüfung fällig'
          when 'wartung' then 'Wartung fällig'
          when 'versicherung' then 'Versicherung läuft ab'
          when 'leasing' then 'Leasing endet bald'
          else 'Termin fällig'
        end,
        v_row.name || case
          when v_row.due_date < current_date then ': Termin ist bereits abgelaufen.'
          else ': Termin am ' || to_char(v_row.due_date, 'DD.MM.YYYY') || '.'
        end,
        '/fahrzeuge?panel=' || v_row.id
      );
      v_count := v_count + 1;
    end loop;

    update public.fleet_items
    set
      tuv_reminder_sent_at = case when v_row.reminder_kind = 'tuv' then now() else tuv_reminder_sent_at end,
      uvv_reminder_sent_at = case when v_row.reminder_kind = 'uvv' then now() else uvv_reminder_sent_at end,
      maintenance_reminder_sent_at = case when v_row.reminder_kind = 'wartung' then now() else maintenance_reminder_sent_at end,
      insurance_reminder_sent_at = case when v_row.reminder_kind = 'versicherung' then now() else insurance_reminder_sent_at end,
      leasing_reminder_sent_at = case when v_row.reminder_kind = 'leasing' then now() else leasing_reminder_sent_at end
    where id = v_row.id;
  end loop;

  -- Ablaufende Fahrzeugdokumente (gleiche Logik wie employee_documents).
  for v_row in
    select fd.id, fi.name, fd.expires_at as due_date
    from public.fleet_documents fd
    join public.fleet_items fi on fi.id = fd.fleet_item_id
    where fd.company_id = p_company_id
      and fd.expires_at is not null and fd.expires_at <= current_date + interval '30 days'
      and fd.reminder_sent_at is null
  loop
    for v_recipient in
      select p.id from public.profiles p
      where p.company_id = p_company_id and p.role = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
    loop
      insert into public.notifications (company_id, recipient_id, type, title, body, link)
      values (
        p_company_id,
        v_recipient,
        'fleet_document_expiring',
        'Fahrzeugdokument läuft ab',
        v_row.name || case
          when v_row.due_date < current_date then ': ein Dokument ist bereits abgelaufen.'
          else ': ein Dokument läuft am ' || to_char(v_row.due_date, 'DD.MM.YYYY') || ' ab.'
        end,
        '/fahrzeuge?panel=' || (select fleet_item_id from public.fleet_documents where id = v_row.id)
      );
      v_count := v_count + 1;
    end loop;

    update public.fleet_documents set reminder_sent_at = now() where id = v_row.id;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.sync_fleet_reminders(uuid) to authenticated;
