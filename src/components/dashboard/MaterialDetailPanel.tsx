"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera,
  Euro,
  FileText,
  History,
  Info,
  MapPin,
  Package,
  Trash2,
  Truck,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { formatDate } from "@/lib/date";
import { formatEuro } from "@/lib/format";
import {
  MATERIAL_CATEGORIES,
  MATERIAL_CATEGORY_LABELS,
  MATERIAL_DOCUMENT_CATEGORIES,
  MATERIAL_DOCUMENT_CATEGORY_LABELS,
  MATERIAL_STATUS_BADGE_CLASS,
  MATERIAL_STATUS_LABELS,
  MATERIAL_STATUSES,
  MOVEMENT_TYPES,
  MOVEMENT_TYPE_LABELS,
  RESERVATION_TARGET_TYPES,
  RESERVATION_TARGET_TYPE_LABELS,
  initialsFor,
} from "@/lib/materials";

export type PanelTabKey = "uebersicht" | "bewegungen" | "auftraege" | "dokumente";

const TABS: Array<{ key: PanelTabKey; label: string; icon: LucideIcon }> = [
  { key: "uebersicht", label: "Übersicht", icon: Info },
  { key: "bewegungen", label: "Bewegungen", icon: History },
  { key: "auftraege", label: "Aufträge", icon: Wrench },
  { key: "dokumente", label: "Dokumente", icon: FileText },
];

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function QrCodePreview({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("qrcode")
      .then((QRCode) => {
        if (cancelled || !canvasRef.current) return;
        return QRCode.default.toCanvas(canvasRef.current, value, { width: 132, margin: 1 });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (failed) return <p className="text-xs text-muted">QR-Code konnte nicht erzeugt werden.</p>;
  return <canvas ref={canvasRef} className="rounded-lg" />;
}

export type MaterialDetailPanelData = {
  id: string;
  materialNumber: string | null;
  name: string;
  category: string | null;
  status: string;
  notes: string | null;
  photoUrl: string | null;
  qrCode: string | null;
  unit: string;
  quantity: number;
  minQuantity: number | null;
  reservedQuantity: number;
  availableQuantity: number;
  locationId: string | null;
  locationName: string | null;
  locationOptions: Array<{ id: string; name: string }>;
  supplierName: string | null;
  supplierContactName: string | null;
  supplierPhone: string | null;
  supplierEmail: string | null;
  purchasePrice: number | null;
  unitPrice: number | null;
  lastOrderedAt: string | null;
  isArchived: boolean;
  movements: Array<{
    id: string;
    movement_type: string;
    quantity: number;
    from_location_name: string | null;
    to_location_name: string | null;
    reason: string | null;
    performed_by_name: string | null;
    created_at: string;
  }>;
  reservations: Array<{
    id: string;
    quantity: number;
    target_type: string;
    target_label: string;
    note: string | null;
    status: string;
    reserved_at: string;
    releaseAction: (formData: FormData) => void;
    consumeAction: (formData: FormData) => void;
  }>;
  fleetOptions: Array<{ id: string; label: string }>;
  employeeOptions: Array<{ id: string; label: string }>;
  orderMaterials: Array<{
    id: string;
    orderId: string;
    orderTitle: string;
    quantity: number;
    status: string;
    consumeAction: (formData: FormData) => void;
  }>;
  documents: Array<{
    id: string;
    category: string;
    file_name: string;
    size_bytes: number | null;
    created_at: string;
    url: string | null;
    deleteAction: (formData: FormData) => void;
  }>;
  canManage: boolean;
  activeTab: PanelTabKey;
  hrefs: { close: string; tabs: Record<PanelTabKey, string> };
  updateStatusAction: (formData: FormData) => void;
  updateProfileAction: (formData: FormData) => void;
  uploadPhotoAction: (formData: FormData) => void;
  removePhotoAction: (formData: FormData) => void;
  addMovementAction: (formData: FormData) => void;
  reserveAction: (formData: FormData) => void;
  uploadDocumentAction: (formData: FormData) => void;
  archiveAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
};

export function MaterialDetailPanel({ data }: { data: MaterialDetailPanelData }) {
  const router = useRouter();
  const [reserveTarget, setReserveTarget] = useState<"fahrzeug" | "mitarbeiter">("fahrzeug");

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") router.push(data.hrefs.close);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router, data.hrefs.close]);

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10";
  const labelClass = "text-xs font-medium text-muted";

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px] lg:hidden" onClick={() => router.push(data.hrefs.close)} />
      <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md animate-slide-in-right overflow-y-auto border-l border-border bg-card p-5 shadow-xl lg:sticky lg:top-0 lg:z-0 lg:h-[calc(100vh-2rem)] lg:max-w-none lg:animate-none lg:shadow-none">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Materialakte</h2>
          <Link href={data.hrefs.close} className="rounded-full p-1.5 text-muted transition-colors hover:bg-background hover:text-foreground">
            <X className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="relative h-14 w-14 shrink-0">
            {data.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.photoUrl} alt={data.name} className="h-14 w-14 rounded-2xl object-cover shadow-sm" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-lg font-semibold text-white shadow-sm">
                {initialsFor(data.name)}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold tracking-tight text-foreground">{data.name}</h3>
            <p className="truncate text-sm text-muted">
              {data.materialNumber ?? "—"}
              {data.category ? ` · ${MATERIAL_CATEGORY_LABELS[data.category] ?? data.category}` : ""}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium shadow-sm ${MATERIAL_STATUS_BADGE_CLASS[data.status] ?? "bg-gray-100 text-gray-600"}`}>
            {MATERIAL_STATUS_LABELS[data.status] ?? data.status}
          </span>
          {data.isArchived && <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">Archiviert</span>}
          {data.canManage && (
            <form action={data.updateStatusAction} className="ml-auto">
              <select
                name="status"
                defaultValue={data.status}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium outline-none focus:border-brand"
              >
                {MATERIAL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {MATERIAL_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </form>
          )}
        </div>

        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.key}
                href={data.hrefs.tabs[t.key]}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  data.activeTab === t.key ? "bg-gradient-to-br from-brand to-brand-dark text-white shadow-sm" : "text-muted hover:bg-background hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-4">
          {data.activeTab === "uebersicht" && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-background p-2.5 text-center">
                  <p className="text-base font-semibold text-foreground">
                    {data.quantity.toLocaleString("de-DE")} {data.unit}
                  </p>
                  <p className="text-[11px] text-muted">Bestand</p>
                </div>
                <div className="rounded-xl bg-background p-2.5 text-center">
                  <p className="text-base font-semibold text-foreground">{data.reservedQuantity.toLocaleString("de-DE")}</p>
                  <p className="text-[11px] text-muted">Reserviert</p>
                </div>
                <div className="rounded-xl bg-background p-2.5 text-center">
                  <p className="text-base font-semibold text-foreground">{data.availableQuantity.toLocaleString("de-DE")}</p>
                  <p className="text-[11px] text-muted">Verfügbar</p>
                </div>
              </div>

              <div className="space-y-2.5 rounded-xl bg-background p-3">
                {data.minQuantity !== null && (
                  <div className="flex items-center gap-2.5">
                    <Package className="h-4 w-4 shrink-0 text-muted" />
                    <p className="text-foreground">Mindestbestand: {data.minQuantity.toLocaleString("de-DE")} {data.unit}</p>
                  </div>
                )}
                {data.locationName && (
                  <div className="flex items-center gap-2.5">
                    <MapPin className="h-4 w-4 shrink-0 text-muted" />
                    <p className="text-foreground">{data.locationName}</p>
                  </div>
                )}
                {data.supplierName && (
                  <div className="flex items-center gap-2.5">
                    <Truck className="h-4 w-4 shrink-0 text-muted" />
                    <p className="text-foreground">{data.supplierName}</p>
                  </div>
                )}
                {(data.purchasePrice !== null || data.unitPrice !== null) && (
                  <div className="flex items-center gap-2.5">
                    <Euro className="h-4 w-4 shrink-0 text-muted" />
                    <p className="text-foreground">
                      {data.purchasePrice !== null ? `EK ${formatEuro(data.purchasePrice)}` : ""}
                      {data.purchasePrice !== null && data.unitPrice !== null ? " · " : ""}
                      {data.unitPrice !== null ? `VK ${formatEuro(data.unitPrice)}` : ""}
                    </p>
                  </div>
                )}
                {data.lastOrderedAt && (
                  <div className="flex items-center gap-2.5">
                    <History className="h-4 w-4 shrink-0 text-muted" />
                    <p className="text-foreground">Letzte Bestellung: {formatDate(data.lastOrderedAt)}</p>
                  </div>
                )}
              </div>

              {data.qrCode && (
                <div className="flex items-center gap-3 rounded-xl bg-background p-3">
                  <QrCodePreview value={data.qrCode} />
                  <div className="min-w-0 text-xs">
                    <p className="font-medium text-foreground">QR-/Barcode</p>
                    <p className="mt-0.5 text-muted">{data.qrCode}</p>
                    <p className="mt-1 text-muted">Zum schnellen Ein- und Ausbuchen scannen oder ausdrucken.</p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Reservierungen (Fahrzeuge / Mitarbeiter)</p>
                <div className="mt-2 space-y-1.5">
                  {data.reservations.filter((r) => r.status === "reserviert").length === 0 && (
                    <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted">Keine offenen Reservierungen.</p>
                  )}
                  {data.reservations
                    .filter((r) => r.status === "reserviert")
                    .map((r) => (
                      <div key={r.id} className="rounded-xl bg-background p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{r.target_label}</p>
                            <p className="text-xs text-muted">
                              {r.quantity.toLocaleString("de-DE")} {data.unit} · {RESERVATION_TARGET_TYPE_LABELS[r.target_type] ?? r.target_type} · {formatDate(r.reserved_at)}
                            </p>
                            {r.note && <p className="mt-0.5 text-xs text-muted">{r.note}</p>}
                          </div>
                          {data.canManage && (
                            <div className="flex shrink-0 items-center gap-2">
                              <form action={r.consumeAction}>
                                <button type="submit" className="text-xs font-medium text-brand hover:text-brand-dark">
                                  Verbrauchen
                                </button>
                              </form>
                              <form action={r.releaseAction}>
                                <button type="submit" className="text-xs font-medium text-red-600 hover:text-red-700">
                                  Aufheben
                                </button>
                              </form>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
                {data.canManage && (
                  <form action={data.reserveAction} className="mt-2 space-y-2 rounded-xl border border-dashed border-border p-3">
                    <div className="flex gap-2">
                      {RESERVATION_TARGET_TYPES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setReserveTarget(t)}
                          className={`flex-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                            reserveTarget === t ? "border-brand bg-brand-soft text-brand-dark" : "border-border bg-background text-muted"
                          }`}
                        >
                          {RESERVATION_TARGET_TYPE_LABELS[t]}
                        </button>
                      ))}
                    </div>
                    <input type="hidden" name="target_type" value={reserveTarget} />
                    {reserveTarget === "fahrzeug" ? (
                      <select name="fleet_item_id" required defaultValue="" className={inputClass}>
                        <option value="" disabled>
                          Fahrzeug wählen…
                        </option>
                        {data.fleetOptions.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select name="employee_id" required defaultValue="" className={inputClass}>
                        <option value="" disabled>
                          Mitarbeiter wählen…
                        </option>
                        {data.employeeOptions.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.label}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" step="0.01" min="0.01" name="quantity" placeholder={`Menge (${data.unit})`} required className={inputClass} />
                      <input name="note" placeholder="Notiz (optional)" className={inputClass} />
                    </div>
                    <button type="submit" className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                      Reservieren
                    </button>
                  </form>
                )}
              </div>

              {data.notes && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Notizen</p>
                  <p className="mt-1 rounded-xl bg-background p-3 text-foreground">{data.notes}</p>
                </div>
              )}

              {data.canManage ? (
                <details className="rounded-xl border border-border">
                  <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted [&::-webkit-details-marker]:hidden">
                    Stammdaten bearbeiten
                  </summary>
                  <form action={data.updateProfileAction} className="space-y-3 border-t border-border p-3">
                    <div>
                      <label className={labelClass}>Bezeichnung</label>
                      <input name="name" defaultValue={data.name} required className={`mt-1 ${inputClass}`} />
                    </div>
                    <div>
                      <label className={labelClass}>Einheit</label>
                      <input name="unit" defaultValue={data.unit} className={`mt-1 ${inputClass}`} />
                    </div>
                    <div>
                      <label className={labelClass}>Kategorie</label>
                      <select name="category" defaultValue={data.category ?? ""} className={`mt-1 ${inputClass}`}>
                        <option value="">—</option>
                        {MATERIAL_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {MATERIAL_CATEGORY_LABELS[c]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Lagerort</label>
                      <select name="location_id" defaultValue={data.locationId ?? ""} className={`mt-1 ${inputClass}`}>
                        <option value="">—</option>
                        {data.locationOptions.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Mindestbestand</label>
                      <input type="number" step="0.01" min="0" name="min_quantity" defaultValue={data.minQuantity ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                    <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted">Lieferant</p>
                    <div>
                      <label className={labelClass}>Name</label>
                      <input name="supplier_name" defaultValue={data.supplierName ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                    <div>
                      <label className={labelClass}>Ansprechpartner</label>
                      <input name="supplier_contact_name" defaultValue={data.supplierContactName ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Telefon</label>
                        <input name="supplier_phone" defaultValue={data.supplierPhone ?? ""} className={`mt-1 ${inputClass}`} />
                      </div>
                      <div>
                        <label className={labelClass}>E-Mail</label>
                        <input type="email" name="supplier_email" defaultValue={data.supplierEmail ?? ""} className={`mt-1 ${inputClass}`} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Einkaufspreis (€)</label>
                        <input type="number" step="0.01" min="0" name="purchase_price" defaultValue={data.purchasePrice ?? ""} className={`mt-1 ${inputClass}`} />
                      </div>
                      <div>
                        <label className={labelClass}>Verkaufspreis (€)</label>
                        <input type="number" step="0.01" min="0" name="unit_price" defaultValue={data.unitPrice ?? ""} className={`mt-1 ${inputClass}`} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Notizen</label>
                      <textarea name="notes" defaultValue={data.notes ?? ""} rows={3} className={`mt-1 ${inputClass}`} />
                    </div>
                    <button type="submit" className="w-full rounded-lg bg-gradient-to-br from-brand to-brand-dark px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md">
                      Speichern
                    </button>
                  </form>
                </details>
              ) : (
                <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted">
                  Nur Owner, Admin, Geschäftsführer oder Disponent können Daten bearbeiten.
                </p>
              )}

              {data.canManage && (
                <div className="space-y-2 border-t border-border pt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Foto</p>
                  <div className="flex items-center gap-2 text-xs">
                    <form action={data.uploadPhotoAction} className="flex items-center gap-2">
                      <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 font-medium text-foreground hover:bg-background">
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

                  <p className="pt-2 text-xs font-medium uppercase tracking-wide text-muted">Aktionen</p>
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

          {data.activeTab === "bewegungen" && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Historie</p>
                <div className="mt-2 space-y-2">
                  {data.movements.length === 0 && (
                    <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted">Noch keine Materialbewegungen erfasst.</p>
                  )}
                  {data.movements.map((m) => (
                    <div key={m.id} className="rounded-xl border border-border bg-background p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-brand">{MOVEMENT_TYPE_LABELS[m.movement_type] ?? m.movement_type}</p>
                          <p className="font-medium text-foreground">
                            {m.quantity.toLocaleString("de-DE")} {data.unit} · {formatDate(m.created_at)}
                          </p>
                          {(m.from_location_name || m.to_location_name) && (
                            <p className="mt-0.5 text-xs text-muted">
                              {m.from_location_name ?? "—"} → {m.to_location_name ?? "—"}
                            </p>
                          )}
                          {m.reason && <p className="mt-0.5 text-xs text-muted">{m.reason}</p>}
                          {m.performed_by_name && <p className="mt-1 text-[11px] text-muted">Durch: {m.performed_by_name}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {data.canManage && (
                <form action={data.addMovementAction} className="space-y-2 rounded-xl border border-dashed border-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Bewegung erfassen</p>
                  <select name="movement_type" defaultValue="wareneingang" className={inputClass}>
                    {MOVEMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {MOVEMENT_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                  <input type="number" step="0.01" min="0" name="quantity" placeholder={`Menge (${data.unit})`} required className={inputClass} />
                  <div className="grid grid-cols-2 gap-2">
                    <select name="from_location_id" defaultValue="" className={inputClass}>
                      <option value="">Von Lagerort…</option>
                      {data.locationOptions.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                    <select name="to_location_id" defaultValue="" className={inputClass}>
                      <option value="">Nach Lagerort…</option>
                      {data.locationOptions.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input name="reason" placeholder="Notiz / Grund (optional)" className={inputClass} />
                  <p className="text-[11px] text-muted">
                    Bei Inventuranpassung bitte die gezählte Gesamtmenge eintragen – die Differenz wird automatisch protokolliert.
                  </p>
                  <button type="submit" className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                    Buchen
                  </button>
                </form>
              )}
            </div>
          )}

          {data.activeTab === "auftraege" && (
            <div className="space-y-3">
              {data.orderMaterials.length === 0 && (
                <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted">Diesem Material sind noch keine Aufträge zugeordnet.</p>
              )}
              {data.orderMaterials.map((om) => (
                <div key={om.id} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/auftraege/${om.orderId}`} className="truncate font-medium text-foreground hover:text-brand">
                        {om.orderTitle}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted">
                        {om.quantity.toLocaleString("de-DE")} {data.unit} · {om.status === "verbraucht" ? "Verbraucht" : "Reserviert"}
                      </p>
                    </div>
                    {data.canManage && om.status === "reserviert" && (
                      <form action={om.consumeAction}>
                        <button type="submit" className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-card">
                          Verbrauch buchen
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted">
                Material wird einem Auftrag über die Auftragsverwaltung zugewiesen. Hier lässt sich der Verbrauch buchen, wodurch der Bestand automatisch reduziert wird.
              </p>
            </div>
          )}

          {data.activeTab === "dokumente" && (
            <div className="space-y-3">
              {data.documents.length === 0 && <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted">Noch keine Dokumente hochgeladen.</p>}
              {data.documents.map((d) => (
                <div key={d.id} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-brand">{MATERIAL_DOCUMENT_CATEGORY_LABELS[d.category] ?? d.category}</p>
                      {d.url ? (
                        <a href={d.url} target="_blank" rel="noreferrer" className="truncate font-medium text-foreground hover:text-brand">
                          {d.file_name}
                        </a>
                      ) : (
                        <p className="truncate font-medium text-foreground">{d.file_name}</p>
                      )}
                      <p className="mt-1 text-[11px] text-muted">{formatBytes(d.size_bytes)}</p>
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
                    {MATERIAL_DOCUMENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {MATERIAL_DOCUMENT_CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                  <input type="file" name="file" required className="w-full text-xs" />
                  <button type="submit" className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                    Hochladen
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
