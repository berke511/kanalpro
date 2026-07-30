-- KanalPro: Mitarbeiterverwaltung
-- Erlaubt Owner/Admin, Kollegen per Einladungslink zum eigenen Unternehmen
-- hinzuzufügen (statt dass jede Registrierung ein neues Unternehmen anlegt),
-- und Rollen bestehender Mitarbeiter zu verwalten.

create table if not exists public.company_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  role text not null default 'mitarbeiter' check (role in ('admin', 'mitarbeiter')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null
);

create index if not exists company_invites_company_id_idx on public.company_invites (company_id);
create index if not exists company_invites_token_idx on public.company_invites (token);

alter table public.company_invites enable row level security;

create policy "company_invites_select_own_company"
  on public.company_invites for select
  using (company_id = public.current_company_id());

create policy "company_invites_insert_admin"
  on public.company_invites for insert
  with check (
    company_id = public.current_company_id()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('owner', 'admin')
    )
  );

create policy "company_invites_delete_admin"
  on public.company_invites for delete
  using (
    company_id = public.current_company_id()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('owner', 'admin')
    )
  );

-- Nimmt eine Einladung an: legt für den aufrufenden (bereits authentifizierten,
-- aber noch profillosen) Benutzer eine profiles-Zeile in der eingeladenen
-- Firma an. SECURITY DEFINER, weil derselbe Henne-Ei-Effekt wie bei
-- bootstrap_company_and_profile gilt: ohne eigene profiles-Zeile kann der
-- Aufrufer die RLS-Policy auf company_invites (current_company_id()) noch
-- gar nicht erfüllen.
create or replace function public.accept_company_invite(
  p_token text,
  p_full_name text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.company_invites;
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_profile from public.profiles where id = auth.uid();
  if found then
    return v_profile;
  end if;

  select * into v_invite
    from public.company_invites
    where token = p_token and accepted_at is null
    for update;

  if not found then
    raise exception 'invalid_or_used_invite';
  end if;

  insert into public.profiles (id, company_id, full_name, role)
  values (auth.uid(), v_invite.company_id, nullif(trim(p_full_name), ''), v_invite.role)
  returning * into v_profile;

  update public.company_invites
    set accepted_at = now(), accepted_by = auth.uid()
    where id = v_invite.id;

  return v_profile;
end;
$$;

revoke all on function public.accept_company_invite(text, text) from public;
grant execute on function public.accept_company_invite(text, text) to authenticated;

-- profiles: Owner/Admin dürfen zusätzlich zur eigenen Zeile auch andere
-- Mitarbeiter-Profile im selben Unternehmen bearbeiten (Rolle ändern) bzw.
-- entfernen. Diese Policies ergänzen (nicht ersetzen) die bestehenden
-- profiles_update_self-Policy — Postgres verknüpft mehrere permissive
-- Policies pro Befehl mit OR.
create policy "profiles_update_admin"
  on public.profiles for update
  using (
    company_id = public.current_company_id()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('owner', 'admin')
    )
  )
  with check (company_id = public.current_company_id());

create policy "profiles_delete_admin"
  on public.profiles for delete
  using (
    company_id = public.current_company_id()
    and id <> auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('owner', 'admin')
    )
  );
