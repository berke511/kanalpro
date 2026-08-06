import Link from "next/link";
import { AlertTriangle, Ban, Boxes, CheckCircle2, Package, TrendingDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { canManageResourcesAndSchedule } from "@/lib/roles";
import {
  MATERIAL_CATEGORIES,
  MATERIAL_CATEGORY_LABELS,
  MATERIAL_STATUS_LABELS,
  MATERIAL_STATUSES,
  availableQuantity,
  isLowStock,
  isOutOfStock,
} from "@/lib/materials";
import { formatEuro } from "@/lib/format";
import { monthRangeBerlin, todayBerlinISO } from "@/lib/date";
import { MaterialCard, type MaterialCardData } from "@/components/dashboard/MaterialCard";
import { MaterialFilterPanel } from "@/components/dashboard/MaterialFilterPanel";
import { MaterialTable, type MaterialRow } from "@/components/dashboard/MaterialTable";
import { MaterialDetailPanel, type MaterialDetailPanelData, type PanelTabKey } from "@/components/dashboard/MaterialDetailPanel";
import { MaterialScanner } from "@/components/dashboard/MaterialScanner";
import { MaterialImportButton } from "@/components/dashboard/MaterialImportButton";
import {
  addMaterialLocation,
  addMaterialMovement,
  archiveMaterial,
  deleteMaterial,
  deleteMaterialDocument,
  deleteMaterialLocation,
  importMaterialsCsv,
  releaseMaterialReservation,
  removeMaterialPhoto,
  reserveMaterialForTarget,
  consumeMaterialReservation,
  consumeOrderMaterial,
  updateMaterialProfile,
  updateMaterialStatus,
  uploadMaterialDocument,
  uploadMaterialPhoto,
} from "./actions";
import { redirect } from "next/navigation";

const PANEL_TABS: readonly PanelTabKey[] = ["uebersicht", "bewegungen", "auftraege", "dokumente"];

type RawSearchParams = {
  q?: string;
  view?: string;
  category?: string | string[];
  status?: string | string[];
  location?: string;
  supplier?: string;
  lowStock?: string;
  outOfStock?: string;
  archived?: string;
  panel?: string;
  panelTab?: string;
  scan?: string;
  error?: string;
  message?: string;
};

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function MaterialPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const currentProfile = await getOrCreateProfile(supabase, user);
  const role = currentProfile?.role ?? null;
  const isAdmin = canManageResourcesAndSchedule(role);
  const today = todayBerlinISO();

  const q = (raw.q ?? "").trim().toLowerCase();
  const view = raw.view === "grid" ? "grid" : "list";
  const categoryFilter = toArray(raw.category).filter((c) => (MATERIAL_CATEGORIES as readonly string[]).includes(c));
  const statusFilter = toArray(raw.status).filter((s) => (MATERIAL_STATUSES as readonly string[]).includes(s));
  const locationFilter = (raw.location ?? "").trim();
  const supplierFilter = (raw.supplier ?? "").trim();
  const lowStockFilter = raw.lowStock === "1";
  const outOfStockFilter = raw.outOfStock === "1";
  const showArchived = raw.archived === "1";

  // URL-Hilfsfunktionen fürs Detailpanel/Filter (gleiches Muster wie
  // /fahrzeuge, /mitarbeiter, /kunden) – vorab gebaut, damit der
  // QR-/Barcode-Scanner (siehe unten) direkt dorthin weiterleiten kann.
  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (view !== "list") baseParams.set("view", view);
  categoryFilter.forEach((c) => baseParams.append("category", c));
  statusFilter.forEach((s) => baseParams.append("status", s));
  if (locationFilter) baseParams.set("location", locationFilter);
  if (supplierFilter) baseParams.set("supplier", supplierFilter);
  if (lowStockFilter) baseParams.set("lowStock", "1");
  if (outOfStockFilter) baseParams.set("outOfStock", "1");
  if (showArchived) baseParams.set("archived", "1");
  const baseQuery = baseParams.toString();

  function panelHref(id: string, tab: PanelTabKey = "uebersicht") {
    const params = new URLSearchParams(baseQuery);
    params.set("panel", id);
    if (tab !== "uebersicht") params.set("panelTab", tab);
    else params.delete("panelTab");
    return `/material?${params.toString()}`;
  }
  function panelCloseHref() {
    const params = new URLSearchParams(baseQuery);
    params.delete("panel");
    params.delete("panelTab");
    const qs = params.toString();
    return qs ? `/material?${qs}` : "/material";
  }
  function viewHref(nextView: string) {
    const params = new URLSearchParams(baseQuery);
    if (nextView === "list") params.delete("view");
    else params.set("view", nextView);
    const qs = params.toString();
    return qs ? `/material?${qs}` : "/material";
  }

  // QR-/Barcode-Scan: der Scanner (Client-Komponente) navigiert per GET
  // hierher; die Auflösung Code → Material passiert serverseitig, damit sie
  // unabhängig davon funktioniert, ob der Code über die Kamera oder manuell
  // eingegeben wurde.
  if (raw.scan && raw.scan.trim()) {
    const code = raw.scan.trim();
    // Materialnummern/QR-Codes bestehen ausschließlich aus "M-" + Ziffern
    // (siehe next_material_number() in der Migration) – nur solche Codes an
    // den PostgREST-.or()-Filter weiterreichen, alles andere gilt direkt als
    // "nicht gefunden". Verhindert, dass Sonderzeichen aus einer manuellen
    // Eingabe oder einem Fremd-Scan die Filtersyntax beeinflussen.
    const safeCode = /^[A-Za-z0-9-]{1,32}$/.test(code) ? code : null;
    const { data: scanned } = safeCode
      ? await supabase.from("materials").select("id").or(`qr_code.eq.${safeCode},material_number.eq.${safeCode}`).maybeSingle()
      : { data: null };
    if (scanned) {
      redirect(panelHref(scanned.id));
    }
    const params = new URLSearchParams(baseQuery);
    params.set("error", `Kein Material mit dem Code "${code}" gefunden`);
    redirect(`/material?${params.toString()}`);
  }

  const [{ data: allItemsRaw }, { data: allLocationsRaw }, { data: employeesRaw }, { data: fleetItemsRaw }] = await Promise.all([
    supabase.from("materials").select("*").order("name", { ascending: true }),
    supabase.from("material_locations").select("id, name").order("name", { ascending: true }),
    supabase.from("profiles").select("id, full_name, is_archived").order("full_name", { ascending: true }),
    supabase.from("fleet_items").select("id, name, license_plate").order("name", { ascending: true }),
  ]);

  const allItems = allItemsRaw ?? [];
  const allLocations = allLocationsRaw ?? [];
  const employees = employeesRaw ?? [];
  const activeEmployees = employees.filter((e) => !e.is_archived);
  const fleetItems = fleetItemsRaw ?? [];

  const locationNameById = Object.fromEntries(allLocations.map((l) => [l.id, l.name]));
  const employeeNameById = Object.fromEntries(employees.map((e) => [e.id, e.full_name ?? "Unbenannt"]));
  const fleetLabelById = Object.fromEntries(fleetItems.map((f) => [f.id, f.license_plate ? `${f.license_plate} · ${f.name}` : f.name]));

  const materialIds = allItems.map((i) => i.id);

  // Offene Reservierungen (Fahrzeuge/Mitarbeiter + Aufträge) je Material
  // zusammenführen, um "Reserviert"/"Verfügbar" konsistent überall (KPIs,
  // Tabelle, Karten, Detailpanel) auszuweisen.
  const [{ data: openReservations }, { data: openOrderMaterials }] = await Promise.all([
    materialIds.length
      ? supabase.from("material_reservations").select("material_id, quantity").eq("status", "reserviert").in("material_id", materialIds)
      : Promise.resolve({ data: [] as Array<{ material_id: string; quantity: number }> }),
    materialIds.length
      ? supabase.from("order_materials").select("material_id, quantity").eq("status", "reserviert").in("material_id", materialIds)
      : Promise.resolve({ data: [] as Array<{ material_id: string; quantity: number }> }),
  ]);

  const reservedByMaterialId: Record<string, number> = {};
  for (const r of openReservations ?? []) {
    reservedByMaterialId[r.material_id] = (reservedByMaterialId[r.material_id] ?? 0) + Number(r.quantity);
  }
  for (const r of openOrderMaterials ?? []) {
    reservedByMaterialId[r.material_id] = (reservedByMaterialId[r.material_id] ?? 0) + Number(r.quantity);
  }

  // Signierte Fotos in einem Rutsch laden (Bucket ist privat).
  const photoPaths = allItems.map((i) => i.photo_path).filter((p): p is string => Boolean(p));
  let photoUrlByPath: Record<string, string> = {};
  if (photoPaths.length > 0) {
    const { data: signed } = await supabase.storage.from("material-photos").createSignedUrls(photoPaths, 60 * 10);
    photoUrlByPath = Object.fromEntries((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]).filter(([p]) => p));
  }

  // KPI-Kacheln: bewusst ungefiltert (stabile Unternehmensübersicht), aber
  // ohne archivierte Einträge.
  const activeItems = allItems.filter((i) => !i.is_archived);
  const lagerwert = activeItems.reduce((sum, i) => sum + Number(i.quantity) * Number(i.purchase_price ?? i.unit_price ?? 0), 0);

  const { data: todayMovements } = materialIds.length
    ? await supabase
        .from("material_movements")
        .select("quantity")
        .eq("movement_type", "entnahme")
        .in("material_id", materialIds)
        .gte("created_at", `${today}T00:00:00`)
    : { data: [] as Array<{ quantity: number }> };
  const heuteVerbraucht = (todayMovements ?? []).reduce((sum, m) => sum + Number(m.quantity), 0);

  const offeneReservierungen = (openReservations ?? []).length + (openOrderMaterials ?? []).length;

  const kpis = [
    { key: "gesamt", label: "Gesamtanzahl", icon: Boxes, value: activeItems.length },
    { key: "lagerwert", label: "Lagerwert", icon: Package, value: formatEuro(lagerwert) },
    { key: "niedrig", label: "Niedriger Bestand", icon: TrendingDown, value: activeItems.filter((i) => isLowStock(Number(i.quantity), i.min_quantity !== null ? Number(i.min_quantity) : null)).length },
    { key: "nicht_verfuegbar", label: "Nicht verfügbar", icon: Ban, value: activeItems.filter((i) => isOutOfStock(Number(i.quantity))).length },
    { key: "heute_verbraucht", label: "Heute verbraucht", icon: CheckCircle2, value: heuteVerbraucht.toLocaleString("de-DE") },
    { key: "reservierungen", label: "Offene Reservierungen", icon: AlertTriangle, value: offeneReservierungen },
  ];

  // Material-Statistiken (Meist verwendete Materialien, Verbrauch pro
  // Monat, Materialkosten, Lagerwert, Materialverbrauch je Auftrag, Bestand
  // nach Kategorie) – analog zu den Flotten-Statistiken auf /fahrzeuge,
  // bewusst unabhängig von den aktuell gesetzten Filtern.
  const currentMonth = monthRangeBerlin(0);
  const [{ data: monthEntnahmeMovements }, { data: monthConsumedOrderMaterials }, { data: allTimeEntnahmeMovements }] = await Promise.all([
    materialIds.length
      ? supabase
          .from("material_movements")
          .select("material_id, quantity")
          .eq("movement_type", "entnahme")
          .in("material_id", materialIds)
          .gte("created_at", `${currentMonth.start}T00:00:00`)
          .lt("created_at", `${currentMonth.end}T00:00:00`)
      : Promise.resolve({ data: [] as Array<{ material_id: string; quantity: number }> }),
    materialIds.length
      ? supabase
          .from("order_materials")
          .select("quantity")
          .eq("status", "verbraucht")
          .in("material_id", materialIds)
          .gte("consumed_at", `${currentMonth.start}T00:00:00`)
          .lt("consumed_at", `${currentMonth.end}T00:00:00`)
      : Promise.resolve({ data: [] as Array<{ quantity: number }> }),
    materialIds.length
      ? supabase.from("material_movements").select("material_id, quantity").eq("movement_type", "entnahme").in("material_id", materialIds)
      : Promise.resolve({ data: [] as Array<{ material_id: string; quantity: number }> }),
  ]);

  const materialById = Object.fromEntries(allItems.map((i) => [i.id, i]));
  const verbrauchProMonat = (monthEntnahmeMovements ?? []).reduce((sum, m) => sum + Number(m.quantity), 0);
  const materialkostenMonat = (monthEntnahmeMovements ?? []).reduce((sum, m) => {
    const mat = materialById[m.material_id];
    const price = Number(mat?.purchase_price ?? mat?.unit_price ?? 0);
    return sum + Number(m.quantity) * price;
  }, 0);
  const materialverbrauchJeAuftragMonat = (monthConsumedOrderMaterials ?? []).reduce((sum, om) => sum + Number(om.quantity), 0);

  const consumedByMaterialId: Record<string, number> = {};
  for (const m of allTimeEntnahmeMovements ?? []) {
    consumedByMaterialId[m.material_id] = (consumedByMaterialId[m.material_id] ?? 0) + Number(m.quantity);
  }
  const meistVerwendet = Object.entries(consumedByMaterialId)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, qty]) => ({ name: materialById[id]?.name ?? "—", qty }));

  const bestandNachKategorie = MATERIAL_CATEGORIES.map((c) => ({
    category: c,
    quantity: activeItems.filter((i) => i.category === c).reduce((sum, i) => sum + Number(i.quantity), 0),
  })).filter((c) => c.quantity > 0);

  const supplierOptions = Array.from(new Set(allItems.map((i) => i.supplier_name).filter((v): v is string => Boolean(v)))).sort();

  // Filterung im Speicher – das Lager eines KMU ist überschaubar groß.
  let visibleItems = showArchived ? allItems : allItems.filter((i) => !i.is_archived);
  if (q) {
    visibleItems = visibleItems.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.material_number ?? "").toLowerCase().includes(q) ||
        (i.supplier_name ?? "").toLowerCase().includes(q) ||
        (i.category ? (MATERIAL_CATEGORY_LABELS[i.category] ?? "").toLowerCase().includes(q) : false),
    );
  }
  if (categoryFilter.length) visibleItems = visibleItems.filter((i) => i.category && categoryFilter.includes(i.category));
  if (statusFilter.length) visibleItems = visibleItems.filter((i) => statusFilter.includes(i.status));
  if (locationFilter) visibleItems = visibleItems.filter((i) => i.location_id === locationFilter);
  if (supplierFilter) visibleItems = visibleItems.filter((i) => i.supplier_name === supplierFilter);
  if (lowStockFilter) visibleItems = visibleItems.filter((i) => isLowStock(Number(i.quantity), i.min_quantity !== null ? Number(i.min_quantity) : null));
  if (outOfStockFilter) visibleItems = visibleItems.filter((i) => isOutOfStock(Number(i.quantity)));

  const materialRows: MaterialRow[] = visibleItems.map((i) => {
    const reserved = reservedByMaterialId[i.id] ?? 0;
    return {
      id: i.id,
      materialNumber: i.material_number,
      name: i.name,
      category: i.category,
      status: i.status,
      photoUrl: i.photo_path ? photoUrlByPath[i.photo_path] ?? null : null,
      location: i.location_id ? locationNameById[i.location_id] ?? null : null,
      supplierName: i.supplier_name,
      quantity: Number(i.quantity),
      minQuantity: i.min_quantity !== null ? Number(i.min_quantity) : null,
      reservedQuantity: reserved,
      availableQuantity: availableQuantity(Number(i.quantity), reserved),
      unit: i.unit,
      lastOrderedAt: i.last_ordered_at,
      isArchived: i.is_archived,
    };
  });

  const materialCards: MaterialCardData[] = visibleItems.map((i) => {
    const reserved = reservedByMaterialId[i.id] ?? 0;
    return {
      id: i.id,
      materialNumber: i.material_number,
      name: i.name,
      category: i.category,
      status: i.status,
      photoUrl: i.photo_path ? photoUrlByPath[i.photo_path] ?? null : null,
      location: i.location_id ? locationNameById[i.location_id] ?? null : null,
      supplierName: i.supplier_name,
      quantity: Number(i.quantity),
      minQuantity: i.min_quantity !== null ? Number(i.min_quantity) : null,
      reservedQuantity: reserved,
      availableQuantity: availableQuantity(Number(i.quantity), reserved),
      unit: i.unit,
      isArchived: i.is_archived,
    };
  });

  const activeCount =
    categoryFilter.length +
    statusFilter.length +
    (locationFilter ? 1 : 0) +
    (supplierFilter ? 1 : 0) +
    (lowStockFilter ? 1 : 0) +
    (outOfStockFilter ? 1 : 0) +
    (showArchived ? 1 : 0);

  const panelId = raw.panel && raw.panel.trim().length > 0 ? raw.panel.trim() : null;
  const panelTab: PanelTabKey = PANEL_TABS.includes(raw.panelTab as PanelTabKey) ? (raw.panelTab as PanelTabKey) : "uebersicht";
  let panelData: MaterialDetailPanelData | null = null;

  if (panelId) {
    const { data: panelItem } = await supabase.from("materials").select("*").eq("id", panelId).maybeSingle();

    if (panelItem) {
      const returnTo = panelHref(panelId, panelTab);

      const [{ data: movements }, { data: reservations }, { data: orderMaterials }, { data: documents }] = await Promise.all([
        supabase
          .from("material_movements")
          .select("id, movement_type, quantity, from_location_id, to_location_id, reason, performed_by, created_at")
          .eq("material_id", panelId)
          .order("created_at", { ascending: false }),
        supabase
          .from("material_reservations")
          .select("id, quantity, target_type, fleet_item_id, employee_id, note, status, reserved_at")
          .eq("material_id", panelId)
          .order("reserved_at", { ascending: false }),
        supabase
          .from("order_materials")
          .select("id, quantity, status, order_id, orders(id, title)")
          .eq("material_id", panelId)
          .order("created_at", { ascending: false }),
        supabase
          .from("material_documents")
          .select("id, category, file_name, storage_path, size_bytes, created_at")
          .eq("material_id", panelId)
          .order("created_at", { ascending: false }),
      ]);

      let documentUrlByPath: Record<string, string> = {};
      const docPaths = (documents ?? []).map((d) => d.storage_path);
      if (docPaths.length > 0) {
        const { data: signed } = await supabase.storage.from("material-documents").createSignedUrls(docPaths, 60 * 10);
        documentUrlByPath = Object.fromEntries((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]).filter(([p]) => p));
      }

      let photoUrl: string | null = null;
      if (panelItem.photo_path) {
        const { data: signed } = await supabase.storage.from("material-photos").createSignedUrl(panelItem.photo_path, 60 * 10);
        photoUrl = signed?.signedUrl ?? null;
      }

      const reserved = reservedByMaterialId[panelId] ?? 0;

      panelData = {
        id: panelItem.id,
        materialNumber: panelItem.material_number,
        name: panelItem.name,
        category: panelItem.category,
        status: panelItem.status,
        notes: panelItem.notes,
        photoUrl,
        qrCode: panelItem.qr_code,
        unit: panelItem.unit,
        quantity: Number(panelItem.quantity),
        minQuantity: panelItem.min_quantity !== null ? Number(panelItem.min_quantity) : null,
        reservedQuantity: reserved,
        availableQuantity: availableQuantity(Number(panelItem.quantity), reserved),
        locationId: panelItem.location_id,
        locationName: panelItem.location_id ? locationNameById[panelItem.location_id] ?? null : null,
        locationOptions: allLocations,
        supplierName: panelItem.supplier_name,
        supplierContactName: panelItem.supplier_contact_name,
        supplierPhone: panelItem.supplier_phone,
        supplierEmail: panelItem.supplier_email,
        purchasePrice: panelItem.purchase_price !== null ? Number(panelItem.purchase_price) : null,
        unitPrice: panelItem.unit_price !== null ? Number(panelItem.unit_price) : null,
        lastOrderedAt: panelItem.last_ordered_at,
        isArchived: panelItem.is_archived,
        movements: (movements ?? []).map((m) => ({
          id: m.id,
          movement_type: m.movement_type,
          quantity: Number(m.quantity),
          from_location_name: m.from_location_id ? locationNameById[m.from_location_id] ?? null : null,
          to_location_name: m.to_location_id ? locationNameById[m.to_location_id] ?? null : null,
          reason: m.reason,
          performed_by_name: m.performed_by ? employeeNameById[m.performed_by] ?? null : null,
          created_at: m.created_at,
        })),
        reservations: (reservations ?? []).map((r) => ({
          id: r.id,
          quantity: Number(r.quantity),
          target_type: r.target_type,
          target_label:
            r.target_type === "fahrzeug"
              ? fleetLabelById[r.fleet_item_id ?? ""] ?? "Unbekanntes Fahrzeug"
              : employeeNameById[r.employee_id ?? ""] ?? "Unbekannter Mitarbeiter",
          note: r.note,
          status: r.status,
          reserved_at: r.reserved_at,
          releaseAction: releaseMaterialReservation.bind(null, r.id, returnTo),
          consumeAction: consumeMaterialReservation.bind(null, r.id, returnTo),
        })),
        fleetOptions: fleetItems.map((f) => ({ id: f.id, label: f.license_plate ? `${f.license_plate} · ${f.name}` : f.name })),
        employeeOptions: activeEmployees.map((e) => ({ id: e.id, label: e.full_name ?? "Unbenannt" })),
        orderMaterials: (orderMaterials ?? []).map((om) => ({
          id: om.id,
          orderId: om.order_id,
          orderTitle: (om as unknown as { orders: { id: string; title: string } | null }).orders?.title ?? "Unbekannter Auftrag",
          quantity: Number(om.quantity),
          status: om.status,
          consumeAction: consumeOrderMaterial.bind(null, om.id, returnTo),
        })),
        documents: (documents ?? []).map((d) => ({
          id: d.id,
          category: d.category,
          file_name: d.file_name,
          size_bytes: d.size_bytes,
          created_at: d.created_at,
          url: documentUrlByPath[d.storage_path] ?? null,
          deleteAction: deleteMaterialDocument.bind(null, d.id, d.storage_path, returnTo),
        })),
        canManage: isAdmin,
        activeTab: panelTab,
        hrefs: {
          close: panelCloseHref(),
          tabs: Object.fromEntries(PANEL_TABS.map((t) => [t, panelHref(panelId, t)])) as Record<PanelTabKey, string>,
        },
        updateStatusAction: updateMaterialStatus.bind(null, panelId, returnTo),
        updateProfileAction: updateMaterialProfile.bind(null, panelId, returnTo),
        uploadPhotoAction: uploadMaterialPhoto.bind(null, panelId, returnTo),
        removePhotoAction: removeMaterialPhoto.bind(null, panelId, returnTo),
        addMovementAction: addMaterialMovement.bind(null, panelId, returnTo),
        reserveAction: reserveMaterialForTarget.bind(null, panelId, returnTo),
        uploadDocumentAction: uploadMaterialDocument.bind(null, panelId, returnTo),
        archiveAction: archiveMaterial.bind(null, panelId, !panelItem.is_archived),
        deleteAction: deleteMaterial.bind(null, panelId, returnTo),
      };
    }
  }

  const importAction = importMaterialsCsv.bind(null, panelCloseHref());
  const addLocationAction = addMaterialLocation.bind(null, panelCloseHref());

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-white shadow-md shadow-brand/20">
            <Boxes className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Materialverwaltung</h1>
            <p className="mt-0.5 text-sm text-muted">{activeItems.length} Materialien im Lager</p>
          </div>
        </div>
        {isAdmin && (
          <Link href="/material/neu" className="rounded-lg bg-gradient-to-br from-brand to-brand-dark px-4 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md">
            + Neues Material
          </Link>
        )}
      </div>

      {raw.error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{raw.error}</p>}
      {raw.message && <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{raw.message}</p>}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.key} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <Icon className="h-4 w-4" />
              </span>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      <details className="mt-4 rounded-2xl border border-border bg-card shadow-sm">
        <summary className="cursor-pointer list-none px-5 py-3.5 text-sm font-semibold text-foreground">Material-Statistiken</summary>
        <div className="grid grid-cols-1 gap-4 border-t border-border p-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl bg-background p-3">
            <p className="text-lg font-semibold text-foreground">{verbrauchProMonat.toLocaleString("de-DE")}</p>
            <p className="text-xs text-muted">Verbrauch diesen Monat (Einheiten)</p>
          </div>
          <div className="rounded-xl bg-background p-3">
            <p className="text-lg font-semibold text-foreground">{formatEuro(materialkostenMonat)}</p>
            <p className="text-xs text-muted">Materialkosten diesen Monat</p>
          </div>
          <div className="rounded-xl bg-background p-3">
            <p className="text-lg font-semibold text-foreground">{formatEuro(lagerwert)}</p>
            <p className="text-xs text-muted">Lagerwert gesamt</p>
          </div>
          <div className="rounded-xl bg-background p-3">
            <p className="text-lg font-semibold text-foreground">{materialverbrauchJeAuftragMonat.toLocaleString("de-DE")}</p>
            <p className="text-xs text-muted">Materialverbrauch je Auftrag (Monat)</p>
          </div>
          <div className="rounded-xl bg-background p-3 sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Meist verwendete Materialien</p>
            <div className="mt-2 space-y-1 text-sm">
              {meistVerwendet.length === 0 && <p className="text-xs text-muted">Noch keine Entnahmen erfasst.</p>}
              {meistVerwendet.map((m) => (
                <div key={m.name} className="flex items-center justify-between">
                  <span className="truncate text-foreground">{m.name}</span>
                  <span className="text-muted">{m.qty.toLocaleString("de-DE")}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-background p-3 sm:col-span-2 lg:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Bestand nach Kategorie</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {bestandNachKategorie.length === 0 && <p className="text-xs text-muted">Keine Kategoriedaten vorhanden.</p>}
              {bestandNachKategorie.map((c) => (
                <div key={c.category} className="flex items-center justify-between text-sm">
                  <span className="truncate text-foreground">{MATERIAL_CATEGORY_LABELS[c.category]}</span>
                  <span className="text-muted">{c.quantity.toLocaleString("de-DE")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </details>

      {isAdmin && (
        <details className="mt-4 rounded-2xl border border-border bg-card shadow-sm">
          <summary className="cursor-pointer list-none px-5 py-3.5 text-sm font-semibold text-foreground">Lagerorte verwalten</summary>
          <div className="space-y-3 border-t border-border p-5">
            <div className="flex flex-wrap gap-2">
              {allLocations.length === 0 && <p className="text-xs text-muted">Noch keine Lagerorte angelegt.</p>}
              {allLocations.map((l) => (
                <form key={l.id} action={deleteMaterialLocation.bind(null, l.id, panelCloseHref())} className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs">
                  <span>{l.name}</span>
                  <button type="submit" className="text-muted hover:text-red-600" aria-label={`${l.name} löschen`}>
                    ×
                  </button>
                </form>
              ))}
            </div>
            <form action={addLocationAction} className="flex items-center gap-2">
              <input name="name" required placeholder="z. B. Hauptlager, Fahrzeuglager, Außenlager" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand" />
              <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                Hinzufügen
              </button>
            </form>
          </div>
        </details>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <form method="GET" action="/material" className="relative min-w-[220px] flex-1">
          {view !== "list" && <input type="hidden" name="view" value={view} />}
          <input
            type="search"
            name="q"
            defaultValue={raw.q ?? ""}
            placeholder="Material suchen…"
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-3 pr-3 text-base outline-none focus:border-brand sm:text-sm"
          />
        </form>

        <MaterialFilterPanel
          q={raw.q ?? ""}
          view={view}
          categories={MATERIAL_CATEGORIES}
          categoryLabels={MATERIAL_CATEGORY_LABELS}
          statuses={MATERIAL_STATUSES}
          statusLabels={MATERIAL_STATUS_LABELS}
          locationOptions={allLocations}
          supplierOptions={supplierOptions}
          initial={{
            category: categoryFilter,
            status: statusFilter,
            location: locationFilter,
            supplier: supplierFilter,
            lowStock: lowStockFilter,
            outOfStock: outOfStockFilter,
            archived: showArchived,
          }}
          activeCount={activeCount}
          listHref={viewHref("list")}
          gridHref={viewHref("grid")}
        />

        <MaterialScanner />
        {isAdmin && <MaterialImportButton action={importAction} />}
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1">
          {materialRows.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted">Keine Materialien gefunden.</p>
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {materialCards.map((item) => (
                <MaterialCard key={item.id} item={item} href={panelHref(item.id)} />
              ))}
            </div>
          ) : (
            <MaterialTable items={materialRows} panelBaseQuery={baseQuery} showingArchived={showArchived} />
          )}
        </div>

        {panelData && <MaterialDetailPanel data={panelData} />}
      </div>

      {!isAdmin && (
        <p className="mt-6 text-xs text-muted">
          Nur Owner, Admin, Geschäftsführer oder Disponent können das Lager bearbeiten oder neues Material anlegen.
        </p>
      )}
    </div>
  );
}
