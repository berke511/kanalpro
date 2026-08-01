-- Kundenstatus auf branchenübliche Begriffe umgestellt:
-- interessent -> neukunde
-- aktiv       -> wartungskunde (falls Tag "Wartungsvertrag" gesetzt), sonst bestandskunde
-- inaktiv     -> ehemalig
-- gesperrt    -> gesperrt (unverändert)

-- Alte Check-Constraint entfernen, damit die Zwischenwerte beim Ummappen
-- nicht daran scheitern.
alter table public.customers
  drop constraint if exists customers_status_check;

update public.customers
set status = 'neukunde'
where status = 'interessent';

update public.customers
set status = 'wartungskunde'
where status = 'aktiv'
  and 'Wartungsvertrag' = any (tags);

update public.customers
set status = 'bestandskunde'
where status = 'aktiv';

update public.customers
set status = 'ehemalig'
where status = 'inaktiv';

alter table public.customers
  alter column status set default 'neukunde';

alter table public.customers
  add constraint customers_status_check
    check (status in ('neukunde', 'bestandskunde', 'wartungskunde', 'ehemalig', 'gesperrt'));
