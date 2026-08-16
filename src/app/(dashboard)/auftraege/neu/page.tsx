
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { canCreateOrders } from "@/lib/roles";
import { OrderWizard } from "@/components/dashboard/OrderWizard";

export default async function NeuerAuftragPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; customer_id?: string }>;
}) {
  const { error, customer_id: customerId } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getOrCreateProfile(supabase, user) : null;

  if (!canCreateOrders(profile?.role ?? null)) {
    redirect("/auftraege?error=Keine+Berechtigung+zum+Anlegen+von+Auftr%C3%A4gen");
  }

  const [{ data: customers }, { data: properties }, { data: employees }, { data: fleetItems }] = await Promise.all([
    supabase.from("customers").select("id, name, company_name").eq("is_archived", false).order("name", { ascending: true }),
    supabase.from("customer_properties").select("id, name, customer_id").order("name", { ascending: true }),
    supabase.from("profiles").select("id, full_name").order("full_name", { ascending: true }),
    supabase
      .from("fleet_items")
      .select("id, name, license_plate, kind, status")
      .eq("status", "verfuegbar")
      .order("name", { ascending: true }),
  ]);

  return (
    <div className="p-4 sm:p-6">
      <Link href="/auftraege" className="text-sm text-muted hover:text-foreground">
        ← Zurück zur Auftragsliste
      </Link>
      <div className="relative mt-2 overflow-hidden rounded-[20px] bg-gradient-to-br from-[#3a63ff] via-[#3151e6] to-[#5b3ec9] px-6 py-6 text-white shadow-lg shadow-brand/25 sm:px-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/20 blur-2xl" />
        <div className="relative z-10">
          <h1 className="text-2xl font-semibold tracking-tight">Neuer Auftrag</h1>
          <p className="mt-1 text-sm text-white/80">
            Legen Sie einen neuen Auftrag Schritt für Schritt an – Kunde, Auftragsart, Termin, Ressourcen, Hinweise und
            Dokumente.
          </p>
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="mt-6">
        <OrderWizard
          customers={(customers ?? []).map((c) => ({ id: c.id, label: c.company_name || c.name }))}
          properties={(properties ?? []).map((p) => ({ id: p.id, label: p.name, customerId: p.customer_id }))}
          employees={(employees ?? []).map((e) => ({ id: e.id, label: e.full_name || "Unbenannt" }))}
          vehicles={(fleetItems ?? [])
            .filter((f) => f.kind === "fahrzeug")
            .map((f) => ({ id: f.id, label: f.license_plate ? `${f.license_plate} · ${f.name}` : f.name }))}
          machines={(fleetItems ?? [])
            .filter((f) => f.kind === "maschine")
            .map((f) => ({ id: f.id, label: f.name }))}
          initialCustomerId={customerId}
        />
      </div>
    </div>
  );
}
