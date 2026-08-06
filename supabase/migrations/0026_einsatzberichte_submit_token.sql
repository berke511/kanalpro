-- Schützt den Assistenten-Submit (createReportFull) vor Doppel-Anlage bei
-- Doppelklick/Netzwerk-Retry/Zurück-Button-Resubmit: der Client erzeugt pro
-- Formular-Öffnung einen zufälligen Token; ein zweiter Submit mit demselben
-- Token verletzt den Unique-Index und wird von der Server Action als
-- "bereits angelegt" erkannt (Redirect zum bestehenden Bericht statt
-- Duplikat). Analog zum atomaren Claim-Muster in der Materialverwaltung,
-- hier aber für einen INSERT statt einen UPDATE.
alter table public.service_reports
  add column if not exists client_submit_token text;

create unique index if not exists service_reports_company_submit_token_idx
  on public.service_reports (company_id, client_submit_token)
  where client_submit_token is not null;
