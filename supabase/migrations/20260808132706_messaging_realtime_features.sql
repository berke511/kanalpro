-- KanalPro: Erweiterungen für den internen Team-Chat, damit er sich von
-- einem 08/15-Chat abhebt: Antworten, Bearbeiten/Löschen, Emoji-
-- Reaktionen und echte Echtzeit-Zustellung (statt Polling alle 4s).

alter table public.chat_messages
  add column if not exists reply_to_id uuid references public.chat_messages (id) on delete set null,
  add column if not exists edited_at timestamptz,
  add column if not exists deleted_at timestamptz;

create table if not exists public.chat_message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, profile_id, emoji)
);

create index if not exists chat_message_reactions_message_id_idx on public.chat_message_reactions (message_id);

alter table public.chat_message_reactions enable row level security;

create policy "chat_message_reactions_select_member"
  on public.chat_message_reactions for select
  using (public.is_conversation_member(conversation_id));

create policy "chat_message_reactions_insert_own"
  on public.chat_message_reactions for insert
  with check (
    public.is_conversation_member(conversation_id)
    and profile_id = auth.uid()
    and company_id = public.current_company_id()
  );

create policy "chat_message_reactions_delete_own"
  on public.chat_message_reactions for delete
  using (profile_id = auth.uid());

-- Absender dürfen die eigene Nachricht bearbeiten (body + edited_at) oder
-- weich löschen (deleted_at) – kein Fremdzugriff auf Nachrichten anderer.
create policy "chat_messages_update_own"
  on public.chat_messages for update
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

-- Echtzeit: neue/aktualisierte Nachrichten, Reaktionen und Lesestatus
-- sollen sofort bei allen Mitgliedern ankommen (Supabase Realtime
-- Postgres-Changes), statt wie bisher per Polling alle 4 Sekunden.
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.chat_message_reactions;
alter publication supabase_realtime add table public.conversation_members;
