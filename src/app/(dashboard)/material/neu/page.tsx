import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createMaterial } from "@/app/(dashboard)/material/actions";
import { MaterialWizard } from "@/components/dashboard/MaterialWizard";

export default async function NeuesMaterialPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: locations } = await supabase.from("material_locations").select("id, name").order("name", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Link href="/material" className="text-sm text-muted hover:text-foreground">
        ← Zurück zur Übersicht
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Neues Material</h1>
      <p className="mt-1 text-sm text-muted">Erfasse die wichtigsten Daten Schritt für Schritt – Details lassen sich später jederzeit ergänzen.</p>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="mt-6 rounded-2xl border border-border bg-card shadow-sm p-6">
        <MaterialWizard action={createMaterial} locationOptions={locations ?? []} />
      </div>
    </div>
  );
}
