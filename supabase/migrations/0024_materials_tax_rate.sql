-- Ergänzt einen MwSt.-Satz je Material (Einkaufs-/Verkaufspreis-Bereich im
-- überarbeiteten Anlage-Assistenten). Deutscher Regelsatz 19% als Default,
-- da KanalPro ausschließlich von Unternehmen in Deutschland genutzt wird.
alter table public.materials
  add column if not exists tax_rate numeric(5, 2) default 19.00;
