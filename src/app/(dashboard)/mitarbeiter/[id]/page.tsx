import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { canManageEmployees } from "@/lib/roles";
import { todayBerlinISO } from "@/lib/date";
import { EmployeeDetailPanel, type PanelTabKey } from "@/components/dashboard/EmployeeDetailPanel";
import { PANEL_TABS, loadEmployeeDetailData } from "@/lib/employee-detail";

// Eigene Seite statt Overlay-Panel: ein Klick auf einen Mitarbeiter in der
// Mitarbeiterverwaltung öffnet jetzt diese Route, statt ein seitliches
// Panel über die Liste zu legen (das auf schmaleren Fenstern die Liste
// überlappte). Die eigentliche Detailansicht (Tabs, Formulare, Aktionen)
// steckt weiterhin in EmployeeDetailPanel – hier nur ohne die
// Overlay-Positionierung.
export default async function MitarbeiterDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await getOrCreateProfile(supabase, user);
  const role = profile?.role ?? null;
  const isAdmin = canManageEmployees(role);
  const today = todayBerlinISO();

  const activeTab: PanelTabKey = PANEL_TABS.includes(tab as PanelTabKey) ? (tab as PanelTabKey) : "uebersicht";

  const { data: fleetOptions } = await supabase
    .from("fleet_items")
    .select("id, name, license_plate, kind")
    .order("name", { ascending: true });
  const fleetById = Object.fromEntries((fleetOptions ?? []).map((f) => [f.id, f]));
  const vehicleSelectOptions = (fleetOptions ?? []).map((f) => ({
    id: f.id,
    label: f.license_plate ? `${f.license_plate} · ${f.name}` : f.name,
  }));

  function tabHref(t: PanelTabKey) {
    return t === "uebersicht" ? `/mitarbeiter/${id}` : `/mitarbeiter/${id}?tab=${t}`;
  }

  const data = await loadEmployeeDetailData({
    supabase,
    employeeId: id,
    currentUserId: user.id,
    isAdmin,
    role,
    today,
    fleetById,
    vehicleSelectOptions,
    activeTab,
    closeHref: "/mitarbeiter",
    tabHrefs: Object.fromEntries(PANEL_TABS.map((t) => [t, tabHref(t)])) as Record<PanelTabKey, string>,
    returnTo: tabHref(activeTab),
  });

  if (!data) notFound();

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <Link href="/mitarbeiter" className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Zur Mitarbeiterübersicht
      </Link>
      <div className="mt-4">
        <EmployeeDetailPanel data={data} />
      </div>
    </div>
  );
}
