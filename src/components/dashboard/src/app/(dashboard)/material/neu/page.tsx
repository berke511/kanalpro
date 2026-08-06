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
  const [{ data: locations }, { data: suppliers }] = await Promise.all([
    supabase.from("material_locations").select("id, name").order("name", { ascending: true }),
    supabase.from("materials").select("supplier_name").not("supplier_name", "is", null),
  ]);

  const supplierOptions = Array.from(new Set((suppliers ?? []).map((s) => s.supplier_name).filter((v): v is string => Boolean(v)))).sort();

  return (
    <div className="mx-auto max-w-6xl p-6">
      <Link href="/material" className="text-sm text-muted hover:text-foreground">
        ← Zurück zur Übersicht
      </Link>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="mt-4">
        <MaterialWizard action={createMaterial} locationOptions={locations ?? []} supplierOptions={supplierOptions} />
      </div>
    </div>
  );
}
