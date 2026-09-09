import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { canCreateOrdersAndLinkCommercialDocuments } from "@/lib/roles";
import { todayBerlinISO } from "@/lib/date";
import { InvoiceDetailPanel, type PanelTabKey } from "@/components/dashboard/InvoiceDetailPanel";
import { PANEL_TABS, loadInvoiceDetailData } from "@/lib/invoice-detail";

// Eigene Seite statt Overlay-Panel: ein Klick auf ein Angebot/eine Rechnung
// in der Übersicht öffnet jetzt diese Route, statt ein seitliches Panel über
// die Liste zu legen (gleiches Muster wie /fahrzeuge/[id], /material/[id],
// /berichte/[id]). Die Detailansicht selbst (Hero-Kopf, Tabs, Formulare)
// steckt in InvoiceDetailPanel.
export default async function RechnungDetailPage({
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
  if (!profile) return null;

  const role = profile.role ?? null;
  const canManage = canCreateOrdersAndLinkCommercialDocuments(role);
  const todayISO = todayBerlinISO();

  const activeTab: PanelTabKey = PANEL_TABS.includes(tab as PanelTabKey) ? (tab as PanelTabKey) : "uebersicht";

  function tabHref(t: PanelTabKey) {
    return t === "uebersicht" ? `/rechnungen/${id}` : `/rechnungen/${id}?tab=${t}`;
  }

  const data = await loadInvoiceDetailData({
    supabase,
    invoiceId: id,
    companyId: profile.company_id,
    canManage,
    todayISO,
    activeTab,
    closeHref: "/rechnungen",
    tabHrefs: Object.fromEntries(PANEL_TABS.map((t) => [t, tabHref(t)])) as Record<PanelTabKey, string>,
    returnTo: tabHref(activeTab),
  });

  if (!data) notFound();

  return (
    <div className="p-4 sm:p-6">
      <Link href="/rechnungen" className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Zur Übersicht Angebote &amp; Rechnungen
      </Link>
      <div className="mt-4">
        <InvoiceDetailPanel data={data} />
      </div>
    </div>
  );
}
