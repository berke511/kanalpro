-- KanalPro Datenbankschema
create table kunden (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  name         text not null,
  firma        text,
  telefon      text,
  email        text,
  adresse      text,
  notizen      text,
  erstellt_am  timestamp with time zone default now()
);
alter table kunden enable row level security;
create policy "Nutzer sehen nur ihre eigenen Kunden" on kunden for all using (auth.uid() = user_id);
create table auftraege (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  kunde_id      uuid references kunden(id) on delete set null,
  titel         text not null,
  beschreibung  text,
  status        text default 'offen' check (status in ('offen', 'in_bearbeitung', 'abgeschlossen')),
  datum         date,
  adresse       text,
  notizen       text,
  erstellt_am   timestamp with time zone default now()
);
alter table auftraege enable row level security;
create policy "Nutzer sehen nur ihre eigenen Auftraege" on auftraege for all using (auth.uid() = user_id);
