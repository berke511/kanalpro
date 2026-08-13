import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createFleetItem } from "@/app/(dashboard)/fahrzeuge/actions";
import { FleetWizard } from "@/components/dashboard/FleetWizard";

export default async function NeuerFleetItemPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: fleetItems } = await supabase
    .from("fleet_items")
    .select("id, name, license_plate, kind")
    .order("name", { ascending: true });

  const fleetOptions = (fleetItems ?? []).map((f) => ({
    id: f.id,
    label: f.license_plate ? `${f.license_plate} · ${f.name}` : f.name,
  }));

  return (
    <div className="p-6">
      <Link href="/fahrzeuge" className="text-sm text-muted hover:text-foreground">
        ← Zurück zur Übersicht
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Neues Fahrzeug / Neue Maschine</h1>
      <p className="mt-1 text-sm text-muted">Erfasse die wichtigsten Daten Schritt für Schritt – Details lassen sich später jederzeit ergänzen.</p>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="mt-6 rounded-2xl border border-border bg-card shadow-sm p-6">
        <FleetWizard action={createFleetItem} fleetOptions={fleetOptions} />
      </div>
    </div>
  );
}
