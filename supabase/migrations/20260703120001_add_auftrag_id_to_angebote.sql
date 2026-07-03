-- RB-007-C: auftrag_id Spalte in angebote (bereits per Supabase MCP angewendet)
ALTER TABLE angebote ADD COLUMN IF NOT EXISTS auftrag_id UUID NULL;
