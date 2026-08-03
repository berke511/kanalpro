-- Archivierung für Kunden (Massenaktion "Archivieren" in der Kundenliste).
-- Bewusst getrennt vom Kundenstatus (neukunde/bestandskunde/...), da ein
-- archivierter Kunde seinen fachlichen Status behält, aber standardmäßig
-- aus der Kundenliste ausgeblendet wird.

alter table public.customers
  add column if not exists is_archived boolean not null default false;

create index if not exists customers_is_archived_idx on public.customers (is_archived);
