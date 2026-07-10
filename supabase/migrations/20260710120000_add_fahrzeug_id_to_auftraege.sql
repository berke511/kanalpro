-- WF-006: Fahrzeug-Zuweisung zu Auftraegen
-- Fuegt fahrzeug_id zur auftraege-Tabelle hinzu
ALTER TABLE auftraege
  ADD COLUMN IF NOT EXISTS fahrzeug_id UUID REFERENCES fahrzeuge(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_auftraege_fahrzeug_id ON auftraege(fahrzeug_id);
