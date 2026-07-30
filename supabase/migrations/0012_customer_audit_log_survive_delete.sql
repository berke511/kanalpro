-- Audit-Log soll auch nach dem Löschen eines Kunden nachvollziehbar bleiben:
-- customer_id wird bei Löschung auf NULL gesetzt (statt den Log-Eintrag per
-- Cascade mitzulöschen), zusätzlich wird eine lesbare Bezeichnung gespeichert.
alter table public.customer_audit_log drop constraint if exists customer_audit_log_customer_id_fkey;
alter table public.customer_audit_log alter column customer_id drop not null;
alter table public.customer_audit_log add constraint customer_audit_log_customer_id_fkey
  foreign key (customer_id) references public.customers (id) on delete set null;
alter table public.customer_audit_log add column if not exists customer_label text;
