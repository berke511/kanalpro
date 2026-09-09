
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { canCreateOrdersAndLinkCommercialDocuments, canDeleteOrArchiveOrders } from "@/lib/roles";
import { ReportDetailPanel, type PanelTabKey } from "@/components/dashboard/ReportDetailPanel";
import { PANEL_TABS, loadReportDetailData } from "@/lib/report-detail";

// Eigene Seite statt Overlay-Panel: ein Klick auf einen Einsatzbericht in
// der Berichteverwaltung öffnet jetzt diese Route, statt ein seitliches
// Panel über die Liste zu legen (gleiches Muster wie /fahrzeuge/[id],
// /material/[id], /mitarbeiter/[id]). Die Detailansicht selbst (Hero-Kopf,
// Tabs, Formulare) steckt in ReportDetailPanel.
export default async function BerichtDetailPage({
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
  const canLinkCommercial = canCreateOrdersAndLinkCommercialDocuments(role);
  const canArchiveOrDelete = canDeleteOrArchiveOrders(role) || role === "disponent" || role === "buero";

  const activeTab: PanelTabKey = PANEL_TABS.includes(tab as PanelTabKey) ? (tab as PanelTabKey) : "kunde";

  function tabHref(t: PanelTabKey) {
    return t === "kunde" ? `/berichte/${id}` : `/berichte/${id}?tab=${t}`;
  }

  const data = await loadReportDetailData({
    supabase,
    reportId: id,
    canArchiveOrDelete,
    canLinkCommercial,
    activeTab,
    closeHref: "/berichte",
    tabHrefs: Object.fromEntries(PANEL_TABS.map((t) => [t, tabHref(t)])) as Record<PanelTabKey, string>,
    returnTo: tabHref(activeTab),
  });

  if (!data) notFound();

  return (
    <div className="p-4 sm:p-6">
      <Link href="/berichte" className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Zur Berichtsübersicht
      </Link>
      <div className="mt-4">
        <ReportDetailPanel data={data} />
      </div>
    </div>
  );
}
