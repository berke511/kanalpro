
"use client";

import Link from "next/link";
import {
  Camera,
  Euro,
  FileText,
  Gauge,
  Info,
  MapPin,
  Pencil,
  Trash2,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { formatDate } from "@/lib/date";
import { formatEuro } from "@/lib/format";
import {
  FLEET_COST_CATEGORIES,
  FLEET_COST_CATEGORY_LABELS,
  FLEET_DOCUMENT_CATEGORIES,
  FLEET_DOCUMENT_CATEGORY_LABELS,
  FLEET_KIND_LABELS,
  FLEET_STATUS_LABELS,
  FLEET_STATUSES,
  FUEL_TYPE_LABELS,
  FUEL_TYPES,
  MAINTENANCE_RECORD_TYPE_LABELS,
  MAINTENANCE_RECORD_TYPES,
  OWNERSHIP_LABELS,
  OWNERSHIP_TYPES,
  initialsFor,
  isDueSoon,
  isOverdue,
} from "@/lib/fleet";

export type PanelTabKey = "uebersicht" | "technik" | "wartung" | "dokumente" | "kosten";

const TABS: Array<{ key: PanelTabKey; label: string; icon: LucideIcon }> = [
  { key: "uebersicht", label: "Übersicht", icon: Info },
  { key: "technik", label: "Technik", icon: Gauge },
  { key: "wartung", label: "Wartung / TÜV", icon: Wrench },
  { key: "dokumente", label: "Dokumente", icon: FileText },
  { key: "kosten", label: "Kosten / Historie", icon: Euro },
];

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DueBadge({ date, label }: { date: string | null; label: string }) {
  if (!date) return <span className="text-[11px] text-muted">{label}: —</span>;
  if (isOverdue(date)) {
    return (
      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
        {label} überfällig · {formatDate(date)}
      </span>
    );
  }
  if (isDueSoon(date)) {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
        {label} bald fällig · {formatDate(date)}
      </span>
    );
  }
  return (
    <span className="text-[11px] text-muted">
      {label}: {formatDate(date)}
    </span>
  );
}

export type FleetDetailPanelData = {
  id: string;
  kind: string;
  name: string;
  licensePlate: string | null;
  status: string;
  notes: string | null;
  photoUrl: string | null;
  inventoryNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  yearBuilt: number | null;
  location: string | null;
  serviceArea: string | null;
  ownership: string | null;
  fuelType: string | null;
  odometerKm: number | null;
  operatingHours: number | null;
  odometerIntervalKm: number | null;
  operatingHoursInterval: number | null;
  lastMaintenanceAt: string | null;
  nextMaintenanceAt: string | null;
  nextMaintenanceNote: string | null;
  tuvDueDate: string | null;
  uvvDueDate: string | null;
  insuranceDueDate: string | null;
  leasingEndDate: string | null;
  defaultCrewSize: number | null;
  maxCrewSize: number | null;
  defaultEquipment: string | null;
  linkedVehicle: { id: string; name: string } | null;
  linkedVehicleOptions: Array<{ id: string; label: string }>;
  maintenanceProgress: number | null;
  isArchived: boolean;
  assignedEmployees: Array<{ id: string; fullName: string | null; unassignAction: (formData: FormData) => void }>;
  employeeOptions: Array<{ id: string; label: string }>;
  currentOrder: { id: string; title: string; customerName: string | null; startTime: string | null } | null;
  maintenanceRecords: Array<{
    id: string;
    record_type: string;
    performed_at: string;
    description: string | null;
    cost: number | null;
    performed_by: string | null;
    odometer_km: number | null;
    operating_hours: number | null;
    removeAction: (formData: FormData) => void;
  }>;
  costEntries: Array<{
    id: string;
    category: string;
    amount: number;
    occurred_at: string;
    note: string | null;
    removeAction: (formData: FormData) => void;
  }>;
  costTotals: { wartung: number; reparatur: number; kraftstoff: number; versicherung: number; leasing: number; sonstige: number; total: number };
  documents: Array<{
    id: string;
    category: string;
    file_name: string;
    size_bytes: number | null;
    expires_at: string | null;
    created_at: string;
    url: string | null;
    deleteAction: (formData: FormData) => void;
  }>;
  canManage: boolean;
  activeTab: PanelTabKey;
  hrefs: { close: string; tabs: Record<PanelTabKey, string> };
  updateStatusAction: (formData: FormData) => void;
  updateProfileAction: (formData: FormData) => void;
  assignEmployeeAction: (formData: FormData) => void;
  uploadPhotoAction: (formData: FormData) => void;
  removePhotoAction: (formData: FormData) => void;
  addMaintenanceAction: (formData: FormData) => void;
  addCostAction: (formData: FormData) => void;
  uploadDocumentAction: (formData: FormData) => void;
  archiveAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
};

// Rendert die Fahrzeug-/Maschinen-Detailansicht als eigenständige Seite
// (keine Overlay-/Drawer-Positionierung mehr) – wird von der eigenen Route
// /fahrzeuge/[id] eingebettet, siehe dortige page.tsx. Bewusst als
// zweigeteiltes Layout aufgebaut: ein "Hero"-Kopfbereich mit Foto,
// Kennzeichen-Badge und Kennzahlen-Kacheln auf einen Blick, darunter die
// Tabs mit den Detailinhalten – analog zu modernen SaaS-Detailseiten
// (z. B. GitHub-Profile), statt der bisherigen kompakten Panel-Optik.
export function FleetDetailPanel({ data }: { data: FleetDetailPanelData }) {
  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10";
  const labelClass = "text-xs font-medium text-muted";
  const subtitle = [data.manufacturer, data.model].filter(Boolean).join(" ") || FLEET_KIND_LABELS[data.kind] || data.kind;

  const assignedNames = data.assignedEmployees.map((e) => e.fullName ?? "Unbenannt");
  const statTiles: Array<{ key: string; label: string; value: string; tone?: "warn" | "danger" }> = [
    {
      key: "odometer",
      label: "Kilometerstand",
      value: data.odometerKm !== null ? `${data.odometerKm.toLocaleString("de-DE")} km` : "—",
    },
    {
      key: "hours",
      label: "Betriebsstunden",
      value: data.operatingHours !== null ? `${data.operatingHours.toLocaleString("de-DE")} Std.` : "—",
    },
    {
      key: "maintenance",
      label: "Nächste Wartung",
      value: data.nextMaintenanceAt ? formatDate(data.nextMaintenanceAt) : "—",
      tone: isOverdue(data.nextMaintenanceAt) ? "danger" : isDueSoon(data.nextMaintenanceAt) ? "warn" : undefined,
    },
    {
      key: "assigned",
      label: "Zugewiesen an",
      value: assignedNames.length > 0 ? assignedNames.join(", ") : "Niemand",
    },
  ];

  return (
    <>
      <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#3a63ff] via-[#3151e6] to-[#5b3ec9] px-6 py-6 text-white shadow-lg shadow-brand/25 sm:px-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/20 blur-2xl" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-14 shrink-0">
              {data.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.photoUrl} alt={data.name} className="h-14 w-14 rounded-2xl object-cover shadow-sm" />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-lg font-semibold text-white">
                  {initialsFor(data.name)}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-semibold tracking-tight">{data.name}</h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  {FLEET_STATUS_LABELS[data.status] ?? data.status}
                </span>
                {data.isArchived && <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium">Archiviert</span>}
              </div>
              <p className="mt-1 truncate text-sm text-white/80">
                {subtitle}
                {data.licensePlate && ` · ${data.licensePlate}`}
              </p>
            </div>
          </div>
          {data.canManage && (
            <div className="flex flex-wrap items-center gap-2">
              <form action={data.updateStatusAction}>
                <select
                  name="status"
                  defaultValue={data.status}
                  onChange={(e) => e.currentTarget.form?.requestSubmit()}
                  className="rounded-[11px] border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium text-white outline-none [color-scheme:dark]"
                >
                  {FLEET_STATUSES.map((s) => (
                    <option key={s} value={s} className="text-foreground">
                      {FLEET_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </form>
              <Link
                href={data.hrefs.tabs.technik}
                className="flex items-center gap-1.5 rounded-[11px] bg-white px-3.5 py-2 text-sm font-bold text-brand-dark shadow-md hover:bg-white/90"
              >
                <Pencil className="h-4 w-4" />
                Bearbeiten
              </Link>
            </div>
          )}
        </div>

        <div className="relative z-10 mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statTiles.map((tile) => (
            <div key={tile.key} className="rounded-xl bg-white/10 px-3 py-2.5">
              <p className="text-[10.5px] text-white/70">{tile.label}</p>
              <p
                className={`mt-0.5 truncate text-sm font-bold tabular-nums ${
                  tile.tone === "danger" ? "text-red-200" : tile.tone === "warn" ? "text-amber-200" : ""
                }`}
                title={tile.value}
              >
                {tile.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex gap-1.5 overflow-x-auto rounded-2xl border border-border bg-card p-1.5 shadow-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.key}
              href={data.hrefs.tabs[t.key]}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] px-3 py-1.5 text-sm font-medium transition-colors ${
                data.activeTab === t.key ? "bg-gradient-to-br from-brand to-brand-dark text-white shadow-sm" : "text-muted hover:bg-background hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_20px_rgba(16,24,40,.06)]">
        {data.activeTab === "uebersicht" && (
            <div className="space-y-4 text-sm">
              <div className="space-y-2.5 rounded-xl bg-background p-3">
                {data.location && (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                    <p className="text-foreground">
                      {data.location}
                      {data.serviceArea ? ` · Einsatzgebiet: ${data.serviceArea}` : ""}
                    </p>
                  </div>
                )}
                {data.inventoryNumber && (
                  <div className="flex items-center gap-2.5">
                    <Info className="h-4 w-4 shrink-0 text-muted" />
                    <p className="text-foreground">Inventarnr. {data.inventoryNumber}</p>
                  </div>
                )}
                {data.ownership && (
                  <div className="flex items-center gap-2.5">
                    <Euro className="h-4 w-4 shrink-0 text-muted" />
                    <p className="text-foreground">{OWNERSHIP_LABELS[data.ownership] ?? data.ownership}</p>
                  </div>
                )}
                {!data.location && !data.inventoryNumber && !data.ownership && (
                  <p className="text-muted">Noch keine Stammdaten hinterlegt.</p>
                )}
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Aktueller Auftrag</p>
                {data.currentOrder ? (
                  <Link
                    href={`/auftraege/${data.currentOrder.id}`}
                    className="mt-2 block rounded-xl border border-border bg-background p-3 transition-colors hover:border-brand/30 hover:bg-brand-soft/30"
                  >
                    <p className="font-medium text-foreground">{data.currentOrder.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                      {data.currentOrder.customerName && <span>{data.currentOrder.customerName}</span>}
                      {data.currentOrder.startTime && <span>{data.currentOrder.startTime.slice(0, 5)} Uhr</span>}
                    </div>
                  </Link>
                ) : (
                  <p className="mt-2 rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted">Kein Einsatz für heute geplant.</p>
                )}
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Zugewiesene Mitarbeiter</p>
                <div className="mt-2 space-y-1.5">
                  {data.assignedEmployees.length === 0 && (
                    <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted">Kein Mitarbeiter zugewiesen.</p>
                  )}
                  {data.assignedEmployees.map((e) => (
                    <div key={e.id} className="flex items-center justify-between gap-2 rounded-xl bg-background p-2.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">
                          {initialsFor(e.fullName)}
                        </span>
                        <p className="text-sm font-medium text-foreground">{e.fullName ?? "Unbenannt"}</p>
                      </div>
                      {data.canManage && (
                        <form action={e.unassignAction}>
                          <button type="submit" className="text-xs font-medium text-red-600 hover:text-red-700">
                            Entfernen
                          </button>
                        </form>
                      )}
                    </div>
                  ))}
                </div>
                {data.canManage && (
                  <form action={data.assignEmployeeAction} className="mt-2 flex items-center gap-2">
                    <select name="employee_id" required defaultValue="" className={inputClass}>
                      <option value="" disabled>
                        Mitarbeiter zuweisen…
                      </option>
                      {data.employeeOptions.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.label}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="shrink-0 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-dark">
                      <Users className="h-3.5 w-3.5" />
                    </button>
                  </form>
                )}
              </div>

              {data.linkedVehicle && (
                <div className="flex items-center gap-2.5 rounded-xl bg-background p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <Wrench className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-muted">Verknüpft mit</p>
                    <p className="truncate font-medium text-foreground">{data.linkedVehicle.name}</p>
                  </div>
                </div>
              )}

              {data.notes && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Notizen</p>
                  <p className="mt-1 rounded-xl bg-background p-3 text-foreground">{data.notes}</p>
                </div>
              )}

              {data.canManage && (
                <div className="space-y-2 border-t border-border pt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Aktionen</p>
                  <form action={data.archiveAction}>
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-brand/30 hover:bg-brand-soft"
                    >
                      {data.isArchived ? "Archivierung aufheben" : "Archivieren"}
                    </button>
                  </form>
                  <form
                    action={data.deleteAction}
                    onSubmit={(e) => {
                      if (!window.confirm("Diesen Eintrag unwiderruflich löschen? Dies kann nicht rückgängig gemacht werden.")) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50">
                      Endgültig löschen
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {data.activeTab === "technik" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-background p-3">
                <div className="h-12 w-12 shrink-0">
                  {data.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.photoUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-sm font-semibold text-brand">{initialsFor(data.name)}</span>
                  )}
                </div>
                {data.canManage && (
                  <div className="flex flex-1 items-center gap-2 text-xs">
                    <form action={data.uploadPhotoAction} className="flex items-center gap-2">
                      <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 font-medium text-foreground hover:bg-card">
                        <Camera className="h-3.5 w-3.5" />
                        Foto
                        <input type="file" name="file" accept="image/*" className="hidden" onChange={(e) => e.currentTarget.form?.requestSubmit()} />
                      </label>
                    </form>
                    {data.photoUrl && (
                      <form action={data.removePhotoAction}>
                        <button type="submit" className="text-red-600 hover:text-red-700">
                          Entfernen
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {data.canManage ? (
                <form action={data.updateProfileAction} className="space-y-3">
                  <input type="hidden" name="status" value={data.status} />
                  <input type="hidden" name="kind" value={data.kind} />
                  <div>
                    <label className={labelClass}>Bezeichnung</label>
                    <input name="name" defaultValue={data.name} required className={`mt-1 ${inputClass}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Kennzeichen</label>
                      <input name="license_plate" defaultValue={data.licensePlate ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                    <div>
                      <label className={labelClass}>Inventarnummer</label>
                      <input name="inventory_number" defaultValue={data.inventoryNumber ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Hersteller</label>
                      <input name="manufacturer" defaultValue={data.manufacturer ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                    <div>
                      <label className={labelClass}>Modell</label>
                      <input name="model" defaultValue={data.model ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Baujahr</label>
                      <input type="number" name="year_built" defaultValue={data.yearBuilt ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                    <div>
                      <label className={labelClass}>Kraftstoffart</label>
                      <select name="fuel_type" defaultValue={data.fuelType ?? ""} className={`mt-1 ${inputClass}`}>
                        <option value="">—</option>
                        {FUEL_TYPES.map((f) => (
                          <option key={f} value={f}>
                            {FUEL_TYPE_LABELS[f]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Standort</label>
                      <input name="location" defaultValue={data.location ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                    <div>
                      <label className={labelClass}>Einsatzgebiet</label>
                      <input name="service_area" defaultValue={data.serviceArea ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Eigentum / Leasing</label>
                      <select name="ownership" defaultValue={data.ownership ?? ""} className={`mt-1 ${inputClass}`}>
                        <option value="">—</option>
                        {OWNERSHIP_TYPES.map((o) => (
                          <option key={o} value={o}>
                            {OWNERSHIP_LABELS[o]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Leasing-Ende</label>
                      <input type="date" name="leasing_end_date" defaultValue={data.leasingEndDate ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Kilometerstand</label>
                      <input type="number" step="0.1" name="odometer_km" defaultValue={data.odometerKm ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                    <div>
                      <label className={labelClass}>Betriebsstunden</label>
                      <input type="number" step="0.1" name="operating_hours" defaultValue={data.operatingHours ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Wartungsintervall (km)</label>
                      <input type="number" step="0.1" name="odometer_interval_km" defaultValue={data.odometerIntervalKm ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                    <div>
                      <label className={labelClass}>Wartungsintervall (Std.)</label>
                      <input type="number" step="0.1" name="operating_hours_interval" defaultValue={data.operatingHoursInterval ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                  </div>

                  <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted">Rohr- & Kanalbranche</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Standardbesatzung</label>
                      <input type="number" name="default_crew_size" defaultValue={data.defaultCrewSize ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                    <div>
                      <label className={labelClass}>Maximale Besatzung</label>
                      <input type="number" name="max_crew_size" defaultValue={data.maxCrewSize ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Standardausrüstung</label>
                    <textarea name="default_equipment" defaultValue={data.defaultEquipment ?? ""} rows={2} className={`mt-1 ${inputClass}`} />
                  </div>
                  <div>
                    <label className={labelClass}>Verknüpftes Fahrzeug / Maschine</label>
                    <select name="linked_vehicle_id" defaultValue={data.linkedVehicle?.id ?? ""} className={`mt-1 ${inputClass}`}>
                      <option value="">Keine Verknüpfung</option>
                      {data.linkedVehicleOptions.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Notizen</label>
                    <textarea name="notes" defaultValue={data.notes ?? ""} rows={3} className={`mt-1 ${inputClass}`} />
                  </div>
                  <button type="submit" className="w-full rounded-lg bg-gradient-to-br from-brand to-brand-dark px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md">
                    Speichern
                  </button>
                </form>
              ) : (
                <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted">
                  Nur Owner, Admin, Geschäftsführer oder Disponent können Daten bearbeiten.
                </p>
              )}
            </div>
          )}

          {data.activeTab === "wartung" && (
            <div className="space-y-4">
              <div className="space-y-2 rounded-xl bg-background p-3">
                <DueBadge date={data.nextMaintenanceAt} label="Wartung" />
                <br />
                <DueBadge date={data.tuvDueDate} label="TÜV" />
                <br />
                <DueBadge date={data.uvvDueDate} label="UVV" />
                <br />
                <DueBadge date={data.insuranceDueDate} label="Versicherung" />
                {data.maintenanceProgress !== null && (
                  <div className="pt-1">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-card">
                      <div
                        className={`h-full rounded-full ${data.maintenanceProgress >= 100 ? "bg-red-500" : data.maintenanceProgress >= 75 ? "bg-amber-500" : "bg-brand"}`}
                        style={{ width: `${Math.min(100, Math.max(4, data.maintenanceProgress))}%` }}
                      />
                    </div>
                  </div>
                )}
                {data.nextMaintenanceNote && <p className="text-xs text-muted">{data.nextMaintenanceNote}</p>}
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Wartungs- & Prüfhistorie</p>
                <div className="mt-2 space-y-2">
                  {data.maintenanceRecords.length === 0 && (
                    <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted">Noch keine Einträge erfasst.</p>
                  )}
                  {data.maintenanceRecords.map((r) => (
                    <div key={r.id} className="rounded-xl border border-border bg-background p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-brand">{MAINTENANCE_RECORD_TYPE_LABELS[r.record_type] ?? r.record_type}</p>
                          <p className="font-medium text-foreground">{formatDate(r.performed_at)}</p>
                          {r.description && <p className="mt-0.5 text-xs text-muted">{r.description}</p>}
                          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted">
                            {r.performed_by && <span>Durch: {r.performed_by}</span>}
                            {r.cost !== null && <span>{formatEuro(r.cost)}</span>}
                          </div>
                        </div>
                        {data.canManage && (
                          <form action={r.removeAction}>
                            <button type="submit" className="rounded-md p-1 text-muted hover:bg-card hover:text-red-600">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {data.canManage && (
                <form action={data.addMaintenanceAction} className="space-y-2 rounded-xl border border-dashed border-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Eintrag hinzufügen</p>
                  <select name="record_type" defaultValue="wartung" className={inputClass}>
                    {MAINTENANCE_RECORD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {MAINTENANCE_RECORD_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelClass}>Datum</label>
                      <input type="date" name="performed_at" required className={`mt-1 ${inputClass}`} />
                    </div>
                    <div>
                      <label className={labelClass}>Nächster Termin</label>
                      <input type="date" name="next_maintenance_at" className={`mt-1 ${inputClass}`} />
                    </div>
                  </div>
                  <input name="description" placeholder="Beschreibung" className={inputClass} />
                  <div className="grid grid-cols-2 gap-2">
                    <input name="performed_by" placeholder="Durchgeführt von" className={inputClass} />
                    <input type="number" step="0.01" name="cost" placeholder="Kosten (€)" className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" step="0.1" name="odometer_km" placeholder="Km-Stand" className={inputClass} />
                    <input type="number" step="0.1" name="operating_hours" placeholder="Betriebsstunden" className={inputClass} />
                  </div>
                  <button type="submit" className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                    Hinzufügen
                  </button>
                </form>
              )}
            </div>
          )}

          {data.activeTab === "dokumente" && (
            <div className="space-y-3">
              {data.documents.length === 0 && <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted">Noch keine Dokumente hochgeladen.</p>}
              {data.documents.map((d) => (
                <div key={d.id} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-brand">{FLEET_DOCUMENT_CATEGORY_LABELS[d.category] ?? d.category}</p>
                      {d.url ? (
                        <a href={d.url} target="_blank" rel="noreferrer" className="truncate font-medium text-foreground hover:text-brand">
                          {d.file_name}
                        </a>
                      ) : (
                        <p className="truncate font-medium text-foreground">{d.file_name}</p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                        <span>{formatBytes(d.size_bytes)}</span>
                        {d.expires_at && <DueBadge date={d.expires_at} label="Gültig bis" />}
                      </div>
                    </div>
                    {data.canManage && (
                      <form action={d.deleteAction}>
                        <button type="submit" className="rounded-md p-1 text-muted hover:bg-card hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))}

              {data.canManage && (
                <form action={data.uploadDocumentAction} className="space-y-2 rounded-xl border border-dashed border-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Dokument hochladen</p>
                  <select name="category" defaultValue="sonstiges" className={inputClass}>
                    {FLEET_DOCUMENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {FLEET_DOCUMENT_CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                  <div>
                    <label className={labelClass}>Ablaufdatum (optional)</label>
                    <input type="date" name="expires_at" className={`mt-1 ${inputClass}`} />
                  </div>
                  <input type="file" name="file" required className="w-full text-xs" />
                  <button type="submit" className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                    Hochladen
                  </button>
                </form>
              )}
            </div>
          )}

          {data.activeTab === "kosten" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-background p-2.5 text-center">
                  <p className="text-base font-semibold text-foreground">{formatEuro(data.costTotals.wartung)}</p>
                  <p className="text-[11px] text-muted">Wartungskosten</p>
                </div>
                <div className="rounded-xl bg-background p-2.5 text-center">
                  <p className="text-base font-semibold text-foreground">{formatEuro(data.costTotals.reparatur)}</p>
                  <p className="text-[11px] text-muted">Reparaturkosten</p>
                </div>
                <div className="rounded-xl bg-background p-2.5 text-center">
                  <p className="text-base font-semibold text-foreground">{formatEuro(data.costTotals.kraftstoff)}</p>
                  <p className="text-[11px] text-muted">Kraftstoffkosten</p>
                </div>
                <div className="rounded-xl bg-background p-2.5 text-center">
                  <p className="text-base font-semibold text-foreground">{formatEuro(data.costTotals.total)}</p>
                  <p className="text-[11px] text-muted">Gesamtkosten</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Sonstige Kosten</p>
                <div className="mt-2 space-y-2">
                  {data.costEntries.length === 0 && (
                    <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted">Noch keine Kosteneinträge erfasst.</p>
                  )}
                  {data.costEntries.map((c) => (
                    <div key={c.id} className="flex items-start justify-between gap-2 rounded-xl border border-border bg-background p-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-brand">{FLEET_COST_CATEGORY_LABELS[c.category] ?? c.category}</p>
                        <p className="font-medium text-foreground">
                          {formatEuro(c.amount)} · {formatDate(c.occurred_at)}
                        </p>
                        {c.note && <p className="mt-0.5 text-xs text-muted">{c.note}</p>}
                      </div>
                      {data.canManage && (
                        <form action={c.removeAction}>
                          <button type="submit" className="rounded-md p-1 text-muted hover:bg-card hover:text-red-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </form>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {data.canManage && (
                <form action={data.addCostAction} className="space-y-2 rounded-xl border border-dashed border-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Kosten erfassen</p>
                  <select name="category" defaultValue="kraftstoff" className={inputClass}>
                    {FLEET_COST_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {FLEET_COST_CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" step="0.01" name="amount" placeholder="Betrag (€)" required className={inputClass} />
                    <input type="date" name="occurred_at" required className={inputClass} />
                  </div>
                  <input name="note" placeholder="Notiz (optional)" className={inputClass} />
                  <button type="submit" className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                    Hinzufügen
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
    </>
  );
}
