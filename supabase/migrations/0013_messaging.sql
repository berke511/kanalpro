-- KanalPro: Interne Nachrichten (Chat)
-- Mitarbeiter eines Unternehmens können sich direkt (1:1) oder in
-- Gruppenchats (z. B. pro Abteilung) Nachrichten schreiben. Jede
-- Konversation gehört zu genau einem Unternehmen, ist aber zusätzlich
-- (anders als z. B. Kunden oder Aufträge) nur für ihre Mitglieder
-- sichtbar, nicht für das ganze Unternehmen.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  type text not null default 'direct' check (type in ('direct', 'group')),
  name text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_company_id_idx on public.conversations (company_id);
create index if not exists conversations_company_updated_idx on public.conversations (company_id, updated_at desc);

create table if not exists public.conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  unique (conversation_id, profile_id)
);

create index if not exists conversation_members_conversation_id_idx on public.conversation_members (conversation_id);
create index if not exists conversation_members_profile_id_idx on public.conversation_members (profile_id);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_conversation_created_idx on public.chat_messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.chat_messages enable row level security;

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row
  execute function public.set_updated_at();

-- Mitgliedschaftsprüfung als SECURITY DEFINER, damit sich die Policy auf
-- `conversation_members` nicht selbst rekursiv referenziert (gleiches
-- Muster wie `current_company_id()` in 0001_init.sql).
create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.profile_id = auth.uid()
  );
$$;

revoke all on function public.is_conversation_member(uuid) from public;
grant execute on function public.is_conversation_member(uuid) to authenticated;

-- Aktualisiert `updated_at` der Konversation bei jeder neuen Nachricht,
-- damit die Konversationsliste nach letzter Aktivität sortiert werden
-- kann. SECURITY DEFINER, da für dieses interne "Touch" keine eigene
-- UPDATE-Policy auf `conversations` für Endnutzer nötig sein soll.
create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;

create trigger chat_messages_touch_conversation
  after insert on public.chat_messages
  for each row execute function public.touch_conversation_on_message();

-- conversations -----------------------------------------------------------
-- Sichtbar für Mitglieder; zusätzlich für den Ersteller auch schon bevor
-- die erste conversation_members-Zeile existiert (Henne-Ei-Problem beim
-- Anlegen: PostgREST liest die neue Zeile direkt nach dem Insert erneut,
-- da braucht es die Mitgliedschaft noch nicht).
create policy "conversations_select_member_or_creator"
  on public.conversations for select
  using (public.is_conversation_member(id) or created_by = auth.uid());

create policy "conversations_insert_own_company"
  on public.conversations for insert
  with check (company_id = public.current_company_id() and created_by = auth.uid());

-- conversation_members ------------------------------------------------------

create policy "conversation_members_select_member"
  on public.conversation_members for select
  using (public.is_conversation_member(conversation_id));

-- Mitglieder dürfen weitere Kollegen aus demselben Unternehmen ergänzen
-- (z. B. später jemanden zu einer Abteilungsgruppe hinzufügen); für die
-- allererste Zeile (der Ersteller trägt sich selbst ein) reicht bereits
-- die Ersteller-Eigenschaft der Konversation, da zu diesem Zeitpunkt noch
-- keine Mitgliedschaft existiert.
create policy "conversation_members_insert_member_or_creator"
  on public.conversation_members for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.company_id = public.current_company_id()
    )
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.company_id = public.current_company_id()
    )
    and (
      public.is_conversation_member(conversation_id)
      or exists (
        select 1 from public.conversations c
        where c.id = conversation_id and c.created_by = auth.uid()
      )
    )
  );

create policy "conversation_members_update_self"
  on public.conversation_members for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "conversation_members_delete_self"
  on public.conversation_members for delete
  using (profile_id = auth.uid());

-- chat_messages ---------------------------------------------------------

create policy "chat_messages_select_member"
  on public.chat_messages for select
  using (public.is_conversation_member(conversation_id));

create policy "chat_messages_insert_member"
  on public.chat_messages for insert
  with check (
    public.is_conversation_member(conversation_id)
    and sender_id = auth.uid()
    and company_id = public.current_company_id()
  );
