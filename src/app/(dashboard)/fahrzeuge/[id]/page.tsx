import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { canManageResourcesAndSchedule } from "@/lib/roles";
import { todayBerlinISO } from "@/lib/date";
import { FleetDetailPanel, type PanelTabKey } from "@/components/dashboard/FleetDetailPanel";
import { PANEL_TABS, loadFleetDetailData } from "@/lib/fleet-detail";

// Eigene Seite statt Overlay-Panel: ein Klick auf ein Fahrzeug/eine Maschine
// in der Fuhrparkverwaltung öffnet jetzt diese Route, statt ein seitliches
// Panel über die Liste zu legen (gleiches Muster wie /mitarbeiter/[id]).
// Die Detailansicht selbst (Hero-Kopf, Tabs, Formulare) steckt in
// FleetDetailPanel.
export default async function FahrzeugDetailPage({
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
  const isAdmin = canManageResourcesAndSchedule(role);
  const today = todayBerlinISO();

  const activeTab: PanelTabKey = PANEL_TABS.includes(tab as PanelTabKey) ? (tab as PanelTabKey) : "uebersicht";

  function tabHref(t: PanelTabKey) {
    return t === "uebersicht" ? `/fahrzeuge/${id}` : `/fahrzeuge/${id}?tab=${t}`;
  }

  const data = await loadFleetDetailData({
    supabase,
    fleetItemId: id,
    isAdmin,
    today,
    activeTab,
    closeHref: "/fahrzeuge",
    tabHrefs: Object.fromEntries(PANEL_TABS.map((t) => [t, tabHref(t)])) as Record<PanelTabKey, string>,
    returnTo: tabHref(activeTab),
  });

  if (!data) notFound();

  return (
    <div className="p-4 sm:p-6">
      <Link href="/fahrzeuge" className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Zur Fuhrpark-Übersicht
      </Link>
      <div className="mt-4">
        <FleetDetailPanel data={data} />
      </div>
    </div>
  );
}
