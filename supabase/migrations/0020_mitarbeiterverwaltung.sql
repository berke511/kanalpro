-- KanalPro: Mitarbeiterverwaltung (Version 1)
-- Erweitert `profiles` um Stammdaten, Status und Arbeitszeit-Kennzahlen und
-- ergänzt drei neue Fachtabellen (Qualifikationen, Dokumente,
-- Fahrzeughistorie) sowie ein schlankes, wiederverwendbares
-- Benachrichtigungssystem für ablaufende Qualifikationen/Dokumente.
--
-- Die E-Mail-Adresse eines Mitarbeiters wird bewusst NICHT dupliziert,
-- sondern weiterhin aus auth.users gelesen (Single Source of Truth fürs
-- Login) – nur zusätzliche Kontakt-/Personaldaten kommen auf `profiles`.

-- =====================================================================
-- 1. profiles: Stammdaten, Status, Arbeitszeit
-- =====================================================================
alter table public.profiles
  add column if not exists photo_path text,
  add column if not exists phone text,
  add column if not exists street text,
  add column if not exists postal_code text,
  add column if not exists city text,
  add column if not exists birth_date date,
  add column if not exists hire_date date,
  add column if not exists personnel_number text,
  add column if not exists department text,
  add column if not exists location text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text,
  add column if not exists status text not null default 'verfuegbar',
  add column if not exists weekly_hours numeric(5, 2),
  add column if not exists work_time_model text not null default 'vollzeit',
  add column if not exists vacation_days_total numeric(5, 1) not null default 30,
  add column if not exists vacation_days_used numeric(5, 1) not null default 0,
  add column if not exists sick_days_current_year numeric(5, 1) not null default 0,
  add column if not exists overtime_hours numeric(6, 2) not null default 0,
  add column if not exists main_vehicle_id uuid references public.fleet_items (id) on delete set null,
  add column if not exists is_archived boolean not null default false,
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check
  check (status in ('verfuegbar', 'einsatz', 'urlaub', 'krank', 'fortbildung', 'feierabend'));

alter table public.profiles drop constraint if exists profiles_work_time_model_check;
alter table public.profiles add constraint profiles_work_time_model_check
  check (work_time_model in ('vollzeit', 'teilzeit', 'minijob', 'werkstudent', 'ausbildung'));

create index if not exists profiles_company_status_idx on public.profiles (company_id, status);
create index if not exists profiles_main_vehicle_id_idx on public.profiles (main_vehicle_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Mitarbeiter aktualisieren ihre eigene Rolle/Status/Personaldaten nicht
-- selbst frei (siehe App-Ebene canManageEmployees/canChangeEmployeeStatus
-- in src/lib/roles.ts) – DB-seitig reicht hier weiterhin die bestehende
-- unternehmensweite UPDATE-Policy aus 0001_init.sql, die feinere
-- Rechtevergabe erfolgt bewusst in den Server Actions (gleiches Muster wie
-- bei Aufträgen/Ressourcen).

-- =====================================================================
-- 2. Qualifikationen
-- =====================================================================
create table if not exists public.employee_qualifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  employee_id uuid not null references public.profiles (id) on delete cascade,
  qualification_type text not null check (qualification_type in (
    'rohrreinigung', 'tv_inspektion', 'kanalsanierung', 'dichtheitspruefung',
    'fuehrerschein', 'adr', 'atemschutz', 'erste_hilfe', 'psaga',
    'gasmesstechnik', 'sonstige'
  )),
  label text,
  issued_date date,
  expires_at date,
  reminder_sent_at timestamptz,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employee_qualifications_employee_id_idx on public.employee_qualifications (employee_id);
create index if not exists employee_qualifications_expires_at_idx on public.employee_qualifications (company_id, expires_at);

alter table public.employee_qualifications enable row level security;

create trigger employee_qualifications_set_updated_at
  before update on public.employee_qualifications
  for each row
  execute function public.set_updated_at();

create policy "employee_qualifications_select_own_company"
  on public.employee_qualifications for select
  using (company_id = public.current_company_id());

create policy "employee_qualifications_insert_own_company"
  on public.employee_qualifications for insert
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer'])
  );

create policy "employee_qualifications_update_own_company"
  on public.employee_qualifications for update
  using (company_id = public.current_company_id())
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer'])
  );

create policy "employee_qualifications_delete_own_company"
  on public.employee_qualifications for delete
  using (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer'])
  );

-- =====================================================================
-- 3. Dokumente (Metadaten; Dateien im Storage-Bucket employee-documents)
-- =====================================================================
create table if not exists public.employee_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  employee_id uuid not null references public.profiles (id) on delete cascade,
  category text not null default 'sonstiges' check (category in (
    'arbeitsvertrag', 'fuehrerschein', 'zertifikat', 'unterweisung', 'psa_nachweis', 'sonstiges'
  )),
  file_name text not null,
  storage_path text not null,
  size_bytes bigint,
  expires_at date,
  reminder_sent_at timestamptz,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists employee_documents_employee_id_idx on public.employee_documents (employee_id);
create index if not exists employee_documents_expires_at_idx on public.employee_documents (company_id, expires_at);

alter table public.employee_documents enable row level security;

create policy "employee_documents_select_own_company"
  on public.employee_documents for select
  using (company_id = public.current_company_id());

create policy "employee_documents_insert_own_company"
  on public.employee_documents for insert
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer'])
  );

create policy "employee_documents_delete_own_company"
  on public.employee_documents for delete
  using (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer'])
  );

insert into storage.buckets (id, name, public)
values ('employee-documents', 'employee-documents', false)
on conflict (id) do nothing;

create policy "employee_documents_storage_select"
  on storage.objects for select
  using (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

create policy "employee_documents_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer'])
  );

create policy "employee_documents_storage_delete"
  on storage.objects for delete
  using (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer'])
  );

-- Profilbilder: eigener, ebenfalls privater Bucket (signierte URLs wie bei
-- Auftragsdokumenten), da Mitarbeiterfotos personenbezogene Daten sind.
insert into storage.buckets (id, name, public)
values ('employee-photos', 'employee-photos', false)
on conflict (id) do nothing;

create policy "employee_photos_storage_select"
  on storage.objects for select
  using (
    bucket_id = 'employee-photos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

create policy "employee_photos_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'employee-photos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer'])
  );

create policy "employee_photos_storage_delete"
  on storage.objects for delete
  using (
    bucket_id = 'employee-photos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer'])
  );

-- =====================================================================
-- 4. Fahrzeughistorie (Hauptfahrzeug-Zuweisungen im Zeitverlauf)
-- =====================================================================
create table if not exists public.employee_vehicle_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  employee_id uuid not null references public.profiles (id) on delete cascade,
  fleet_item_id uuid not null references public.fleet_items (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  assigned_by uuid references public.profiles (id) on delete set null
);

create index if not exists employee_vehicle_history_employee_id_idx on public.employee_vehicle_history (employee_id);

alter table public.employee_vehicle_history enable row level security;

create policy "employee_vehicle_history_select_own_company"
  on public.employee_vehicle_history for select
  using (company_id = public.current_company_id());

create policy "employee_vehicle_history_insert_own_company"
  on public.employee_vehicle_history for insert
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer'])
  );

create policy "employee_vehicle_history_update_own_company"
  on public.employee_vehicle_history for update
  using (company_id = public.current_company_id())
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer'])
  );

-- =====================================================================
-- 5. Benachrichtigungen (generisch, für Ablauf-Erinnerungen genutzt)
-- =====================================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_unread_idx on public.notifications (recipient_id, read_at, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  using (recipient_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Eingefügt wird ausschließlich über sync_expiry_reminders() (SECURITY
-- DEFINER, siehe unten) – Endnutzer bekommen daher bewusst keine
-- eigene INSERT-Policy, damit niemand sich selbst oder Kollegen beliebige
-- Benachrichtigungen unterschieben kann.

-- =====================================================================
-- 6. sync_expiry_reminders(): erzeugt Benachrichtigungen für
--    Qualifikationen/Dokumente, die in den nächsten 30 Tagen ablaufen
--    (oder bereits abgelaufen sind) und noch keine Erinnerung erhalten
--    haben. Wird opportunistisch beim Laden von /dashboard und
--    /mitarbeiter durch Owner/Admin/Geschäftsführer aufgerufen (siehe
--    src/lib/notifications.ts) – es gibt keinen echten Cron-Job im
--    Projekt, daher übernimmt der nächste Seitenaufruf einer
--    berechtigten Rolle diese Rolle. reminder_sent_at verhindert
--    Duplikate.
-- =====================================================================
create or replace function public.sync_expiry_reminders(p_company_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if p_company_id is null or p_company_id <> public.current_company_id() then
    return 0;
  end if;

  with expiring as (
    select q.id, q.employee_id, q.qualification_type, q.expires_at, p.full_name
    from public.employee_qualifications q
    join public.profiles p on p.id = q.employee_id
    where q.company_id = p_company_id
      and q.reminder_sent_at is null
      and q.expires_at is not null
      and q.expires_at <= current_date + interval '30 days'
  ),
  inserted as (
    insert into public.notifications (company_id, recipient_id, type, title, body, link)
    select
      p_company_id,
      rec.id,
      'qualification_expiring',
      'Qualifikation läuft ab',
      e.full_name || ': ' || e.qualification_type ||
        case when e.expires_at < current_date then ' ist bereits abgelaufen.' else ' läuft bald ab.' end,
      '/mitarbeiter?panel=' || e.employee_id
    from expiring e
    cross join lateral (
      select pr.id from public.profiles pr
      where pr.company_id = p_company_id and pr.role = any (array['owner', 'admin', 'geschaeftsfuehrer'])
    ) rec
    returning 1
  )
  select count(*) into v_count from inserted;

  update public.employee_qualifications
  set reminder_sent_at = now()
  where company_id = p_company_id
    and reminder_sent_at is null
    and expires_at is not null
    and expires_at <= current_date + interval '30 days';

  with expiring_docs as (
    select d.id, d.employee_id, d.category, d.file_name, d.expires_at, p.full_name
    from public.employee_documents d
    join public.profiles p on p.id = d.employee_id
    where d.company_id = p_company_id
      and d.reminder_sent_at is null
      and d.expires_at is not null
      and d.expires_at <= current_date + interval '30 days'
  ),
  inserted_docs as (
    insert into public.notifications (company_id, recipient_id, type, title, body, link)
    select
      p_company_id,
      rec.id,
      'document_expiring',
      'Dokument läuft ab',
      e.full_name || ': ' || e.file_name ||
        case when e.expires_at < current_date then ' ist bereits abgelaufen.' else ' läuft bald ab.' end,
      '/mitarbeiter?panel=' || e.employee_id
    from expiring_docs e
    cross join lateral (
      select pr.id from public.profiles pr
      where pr.company_id = p_company_id and pr.role = any (array['owner', 'admin', 'geschaeftsfuehrer'])
    ) rec
    returning 1
  )
  select v_count + count(*) into v_count from inserted_docs;

  update public.employee_documents
  set reminder_sent_at = now()
  where company_id = p_company_id
    and reminder_sent_at is null
    and expires_at is not null
    and expires_at <= current_date + interval '30 days';

  return v_count;
end;
$$;

revoke all on function public.sync_expiry_reminders(uuid) from public;
grant execute on function public.sync_expiry_reminders(uuid) to authenticated;
