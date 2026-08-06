-- KanalPro: Materialverwaltung – umfassender Ausbau
--
-- materials bestand bisher nur aus name/unit/quantity/min_quantity/
-- unit_price/notes. Diese Migration erweitert die Tabelle um Stammdaten,
-- Kategorie, Lagerort, Lieferant, Einkaufspreis, Status, QR-Code sowie
-- Archivierung, und ergänzt neue Tabellen für Lagerorte, Materialbewegungen
-- (Wareneingang/Entnahme/Rückgabe/Umlagerung/Inventur), Reservierungen für
-- Fahrzeuge/Mitarbeiter und Dokumente – analog zum Aufbau der Fahrzeug-
-- verwaltung (0022_fahrzeugverwaltung.sql).
--
-- order_materials (bestehend, bereits von der Auftragsverwaltung genutzt –
-- siehe src/app/(dashboard)/auftraege/actions.ts addOrderMaterial) bleibt
-- unverändert nutzbar; es werden lediglich nicht-brechende Spalten
-- (status/reserved_at/consumed_at/added_by) ergänzt, damit die
-- Materialverwaltung "Reserviert"/"Verbraucht" pro Auftragszeile abbilden
-- und den Bestand nach Einsatz automatisch reduzieren kann, ohne die
-- bestehende Auftrags-UI zu verändern.

-- Lagerorte (z. B. Hauptlager, Fahrzeuglager, Außenlager).
create table public.material_locations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (company_id, name)
);
alter table public.material_locations enable row level security;

create policy material_locations_select_own_company on public.material_locations
  for select using (company_id = public.current_company_id());
create policy material_locations_insert_own_company on public.material_locations
  for insert
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );
create policy material_locations_update_own_company on public.material_locations
  for update
  using (company_id = public.current_company_id())
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );
create policy material_locations_delete_own_company on public.material_locations
  for delete
  using (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );

alter table public.materials
  add column if not exists photo_path text,
  add column if not exists material_number text,
  add column if not exists category text,
  add column if not exists location_id uuid references public.material_locations (id) on delete set null,
  add column if not exists supplier_name text,
  add column if not exists supplier_contact_name text,
  add column if not exists supplier_phone text,
  add column if not exists supplier_email text,
  add column if not exists purchase_price numeric(10, 2),
  add column if not exists status text not null default 'verfuegbar',
  add column if not exists qr_code text,
  add column if not exists last_ordered_at date,
  add column if not exists is_archived boolean not null default false,
  add column if not exists low_stock_reminder_sent_at timestamptz;

alter table public.materials drop constraint if exists materials_category_check;
alter table public.materials
  add constraint materials_category_check
  check (
    category is null or category in (
      'rohre', 'schlaeuche', 'dichtungen', 'fraeswerkzeuge', 'duesen', 'tv_kamera_zubehoer',
      'psa', 'verbrauchsmaterial', 'ersatzteile', 'reinigungsmittel', 'kraftstoffe', 'sonstige'
    )
  );

alter table public.materials drop constraint if exists materials_status_check;
alter table public.materials
  add constraint materials_status_check
  check (status in ('verfuegbar', 'niedriger_bestand', 'reserviert', 'nachbestellt', 'nicht_verfuegbar', 'auslaufartikel'));

create unique index if not exists materials_company_qr_code_idx
  on public.materials (company_id, qr_code) where qr_code is not null;
create index if not exists materials_company_archived_idx on public.materials (company_id, is_archived);
create index if not exists materials_location_id_idx on public.materials (location_id);

drop trigger if exists materials_set_updated_at on public.materials;
create trigger materials_set_updated_at
  before update on public.materials
  for each row execute function public.set_updated_at();

-- Rollenbasierte Schreibrechte nachziehen (bisher durfte jedes
-- Firmenmitglied Material anlegen/ändern/löschen) – analog zu fleet_items:
-- Owner/Admin/Geschäftsführer/Disponent verwalten das Lager, alle
-- Firmenmitglieder dürfen lesen.
drop policy if exists materials_insert_own_company on public.materials;
create policy materials_insert_own_company on public.materials
  for insert
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );

drop policy if exists materials_update_own_company on public.materials;
create policy materials_update_own_company on public.materials
  for update
  using (company_id = public.current_company_id())
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );

drop policy if exists materials_delete_own_company on public.materials;
create policy materials_delete_own_company on public.materials
  for delete
  using (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );

-- Materialnummern-Zähler pro Unternehmen (analog next_order_number).
create table public.material_number_counters (
  company_id uuid primary key references public.companies (id) on delete cascade,
  next_number integer not null default 1
);
alter table public.material_number_counters enable row level security;
create policy material_number_counters_select_own_company on public.material_number_counters
  for select using (company_id = public.current_company_id());

create or replace function public.next_material_number(p_company_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number integer;
begin
  insert into public.material_number_counters (company_id, next_number)
  values (p_company_id, 2)
  on conflict (company_id) do update set next_number = material_number_counters.next_number + 1
  returning next_number - 1 into v_number;
  return 'M-' || lpad(v_number::text, 5, '0');
end;
$$;
revoke all on function public.next_material_number(uuid) from public;
grant execute on function public.next_material_number(uuid) to authenticated;

create unique index if not exists materials_company_material_number_idx
  on public.materials (company_id, material_number) where material_number is not null;

-- Materialbewegungen (deckt Wareneingang, Entnahme, Rückgabe, Umlagerung
-- und Inventuranpassung als eine einzige, typisierte Historientabelle ab –
-- analog zu fleet_maintenance_records).
create table public.material_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  material_id uuid not null references public.materials (id) on delete cascade,
  movement_type text not null check (movement_type in ('wareneingang', 'entnahme', 'rueckgabe', 'umlagerung', 'inventur')),
  quantity numeric(10, 2) not null,
  from_location_id uuid references public.material_locations (id) on delete set null,
  to_location_id uuid references public.material_locations (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  reason text,
  performed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index material_movements_material_id_idx on public.material_movements (material_id);
alter table public.material_movements enable row level security;

create policy material_movements_select_own_company on public.material_movements
  for select using (company_id = public.current_company_id());
create policy material_movements_insert_own_company on public.material_movements
  for insert
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );
create policy material_movements_delete_own_company on public.material_movements
  for delete
  using (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );

-- Reservierungen für Fahrzeuge/Mitarbeiter (Reservierungen für Aufträge
-- laufen weiterhin über die bestehende order_materials-Tabelle, siehe
-- unten – hier nur die beiden zusätzlichen Ziel-Typen aus der Vorgabe).
create table public.material_reservations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  material_id uuid not null references public.materials (id) on delete cascade,
  quantity numeric(10, 2) not null,
  target_type text not null check (target_type in ('fahrzeug', 'mitarbeiter')),
  fleet_item_id uuid references public.fleet_items (id) on delete cascade,
  employee_id uuid references public.profiles (id) on delete cascade,
  status text not null default 'reserviert' check (status in ('reserviert', 'verbraucht', 'storniert')),
  note text,
  reserved_by uuid references public.profiles (id) on delete set null,
  reserved_at timestamptz not null default now(),
  released_at timestamptz,
  constraint material_reservations_target_check check (
    (target_type = 'fahrzeug' and fleet_item_id is not null and employee_id is null)
    or (target_type = 'mitarbeiter' and employee_id is not null and fleet_item_id is null)
  )
);
create index material_reservations_material_id_idx on public.material_reservations (material_id);
alter table public.material_reservations enable row level security;

create policy material_reservations_select_own_company on public.material_reservations
  for select using (company_id = public.current_company_id());
create policy material_reservations_insert_own_company on public.material_reservations
  for insert
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );
create policy material_reservations_update_own_company on public.material_reservations
  for update
  using (company_id = public.current_company_id())
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );
create policy material_reservations_delete_own_company on public.material_reservations
  for delete
  using (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );

-- Nicht-brechende Erweiterung der bestehenden order_materials-Tabelle:
-- neue Zeilen aus der Auftragsverwaltung (addOrderMaterial) landen ohne
-- Änderung an deren Code automatisch als "reserviert" (Default), die
-- Materialverwaltung kann sie über eine eigene Aktion als "verbraucht"
-- markieren und dabei den Bestand automatisch reduzieren.
alter table public.order_materials
  add column if not exists status text not null default 'reserviert',
  add column if not exists reserved_at timestamptz not null default now(),
  add column if not exists consumed_at timestamptz,
  add column if not exists added_by uuid references public.profiles (id) on delete set null;

alter table public.order_materials drop constraint if exists order_materials_status_check;
alter table public.order_materials
  add constraint order_materials_status_check check (status in ('reserviert', 'verbraucht'));

-- Dokumente (Datenblätter, Sicherheitsdatenblätter, Bedienungsanleitungen,
-- Lieferanteninformationen, Rechnungen).
create table public.material_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  material_id uuid not null references public.materials (id) on delete cascade,
  category text not null check (
    category in ('datenblatt', 'sicherheitsdatenblatt', 'bedienungsanleitung', 'lieferanteninformation', 'rechnung', 'sonstiges')
  ),
  file_name text not null,
  storage_path text not null,
  size_bytes bigint,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.material_documents enable row level security;

create policy material_documents_select_own_company on public.material_documents
  for select using (company_id = public.current_company_id());
create policy material_documents_insert_own_company on public.material_documents
  for insert
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );
create policy material_documents_delete_own_company on public.material_documents
  for delete
  using (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );

-- Storage-Buckets für Materialbilder & -dokumente (privat, analog zu
-- fleet-photos/fleet-documents aus 0022).
insert into storage.buckets (id, name, public)
values ('material-photos', 'material-photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('material-documents', 'material-documents', false)
on conflict (id) do nothing;

create policy material_photos_select_own_company on storage.objects
  for select using (
    bucket_id = 'material-photos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );
create policy material_photos_insert_own_company on storage.objects
  for insert
  with check (
    bucket_id = 'material-photos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );
create policy material_photos_delete_own_company on storage.objects
  for delete using (
    bucket_id = 'material-photos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );

create policy material_documents_bucket_select_own_company on storage.objects
  for select using (
    bucket_id = 'material-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );
create policy material_documents_bucket_insert_own_company on storage.objects
  for insert
  with check (
    bucket_id = 'material-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );
create policy material_documents_bucket_delete_own_company on storage.objects
  for delete using (
    bucket_id = 'material-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );

-- Automatische Mindestbestand-Erinnerungen – gleiches Muster wie
-- sync_fleet_reminders()/sync_expiry_reminders(): SECURITY DEFINER,
-- idempotent über low_stock_reminder_sent_at, wird opportunistisch bei
-- jedem Seitenaufruf durch Admin-Rollen aufgerufen (siehe layout.tsx). Setzt
-- den Merker zusätzlich zurück, sobald ein Material den Mindestbestand
-- wieder überschreitet, damit ein erneuter Engpass wieder alarmiert.
create or replace function public.sync_low_stock_reminders(p_company_id uuid)
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

  update public.materials
  set low_stock_reminder_sent_at = null
  where company_id = p_company_id
    and low_stock_reminder_sent_at is not null
    and (min_quantity is null or quantity > min_quantity);

  for v_row in
    select id, name, quantity, min_quantity
    from public.materials
    where company_id = p_company_id and not is_archived
      and min_quantity is not null and quantity <= min_quantity
      and low_stock_reminder_sent_at is null
  loop
    for v_recipient in
      select p.id from public.profiles p
      where p.company_id = p_company_id and p.role = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
    loop
      insert into public.notifications (company_id, recipient_id, type, title, body, link)
      values (
        p_company_id,
        v_recipient,
        'material_low_stock',
        'Niedriger Bestand',
        v_row.name || ': nur noch ' || v_row.quantity || ' auf Lager (Mindestbestand ' || v_row.min_quantity || ').',
        '/material?panel=' || v_row.id
      );
      v_count := v_count + 1;
    end loop;

    update public.materials set low_stock_reminder_sent_at = now() where id = v_row.id;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.sync_low_stock_reminders(uuid) to authenticated;
