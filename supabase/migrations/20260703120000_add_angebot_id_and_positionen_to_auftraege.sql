-- RB-007-A: Datenmodell fuer Angebot -> Auftrag Konvertierung
-- Fuegt angebot_id und positionen zur auftraege-Tabelle hinzu
ALTER TABLE auftraege
  ADD COLUMN IF NOT EXISTS angebot_id UUID NULL,
  ADD COLUMN IF NOT EXISTS positionen JSONB NULL;
