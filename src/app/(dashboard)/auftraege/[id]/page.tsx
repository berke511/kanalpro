import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getRequestSupabase, getRequestUser, getRequestProfile } from "@/lib/supabase/request";
import { canManageResourcesAndSchedule } from "@/lib/roles";
import { OrderDetailPanel, type PanelTabKey } from "@/components/dashboard/OrderDetailPanel";
import { PANEL_TABS, loadOrderDetailData } from "@/lib/order-detail";

// Eigene Seite statt Overlay-Panel: ein Klick auf einen Auftrag in der
// Übersicht öffnet jetzt diese Route, statt ein seitliches Panel über die
// Liste zu legen (gleiches Muster wie /fahrzeuge/[id], /material/[id],
// /berichte/[id], /rechnungen/[id]). Die Detailansicht selbst (Hero-Kopf,
// Tabs, Formulare) steckt in OrderDetailPanel.
export default async function AuftragDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; message?: string; error?: string }>;
}) {
  const { id } = await params;
  const { tab, message, error } = await searchParams;
  const supabase = await getRequestSupabase();
  const user = await getRequestUser();

  if (!user) return null;

  const profile = await getRequestProfile();
  if (!profile) return null;

  const role = profile.role ?? null;
  const canManageResources = canManageResourcesAndSchedule(role);

  const activeTab: PanelTabKey = PANEL_TABS.includes(tab as PanelTabKey) ? (tab as PanelTabKey) : "uebersicht";

  function tabHref(t: PanelTabKey) {
    return t === "uebersicht" ? `/auftraege/${id}` : `/auftraege/${id}?tab=${t}`;
  }

  const data = await loadOrderDetailData({
    supabase,
    orderId: id,
    canManageResources,
    activeTab,
    tabHrefs: Object.fromEntries(PANEL_TABS.map((t) => [t, tabHref(t)])) as Record<PanelTabKey, string>,
    returnTo: tabHref(activeTab),
  });

  if (!data) notFound();

  return (
    <div className="p-4 sm:p-6">
      <Link href="/auftraege" className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Zur Auftragsübersicht
      </Link>

      {message && <p className="mt-4 rounded-lg bg-brand-soft px-4 py-3 text-sm text-brand-dark">{message}</p>}
      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="mt-4">
        <OrderDetailPanel data={data} />
      </div>
    </div>
  );
}
