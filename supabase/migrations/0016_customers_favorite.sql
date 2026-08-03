-- Favoriten-Markierung für Kunden (Stern in der Kundenliste).
alter table public.customers
  add column if not exists is_favorite boolean not null default false;

create index if not exists customers_is_favorite_idx on public.customers (is_favorite);
