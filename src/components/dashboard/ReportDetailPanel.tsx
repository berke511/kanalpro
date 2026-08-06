"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Camera,
  Clock,
  FileText,
  History,
  PenLine,
  Trash2,
  Truck,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/date";
import { formatEuro } from "@/lib/format";
import {
  REPORT_PHOTO_CATEGORIES,
  REPORT_PHOTO_CATEGORY_LABELS,
  REPORT_STATUS_BADGE_CLASS,
  REPORT_STATUS_LABELS,
  REPORT_STATUSES,
  WORK_TYPES,
  WORK_TYPE_LABELS,
  formatMinutesAsHours,
  initialsFor,
} from "@/lib/reports";
import { SignaturePad } from "@/components/dashboard/SignaturePad";

export type PanelTabKey = "kunde" | "auftrag" | "mitarbeiter" | "arbeitszeit" | "material" | "fotos" | "unterschrift" | "pdf" | "historie";

const TABS: Array<{ key: PanelTabKey; label: string; icon: LucideIcon }> = [
  { key: "kunde", label: "Kunde", icon: Building2 },
  { key: "auftrag", label: "Auftrag", icon: Wrench },
  { key: "mitarbeiter", label: "Mitarbeiter", icon: Users },
  { key: "arbeitszeit", label: "Arbeitszeit", icon: Clock },
  { key: "material", label: "Material", icon: Truck },
  { key: "fotos", label: "Fotos", icon: Camera },
  { key: "unterschrift", label: "Unterschrift", icon: PenLine },
  { key: "pdf", label: "PDF", icon: FileText },
  { key: "historie", label: "Historie", icon: History },
];

export type ReportDetailPanelData = {
  id: string;
  reportNumber: string | null;
  status: string;
  isArchived: boolean;
  reportDate: string;
  startTime: string | null;
  endTime: string | null;
  breakMinutes: number | null;
  durationMinutes: number | null;
  weather: string | null;
  workTypes: string[];
  workPerformed: string;
  internalNotes: string | null;
  customer: {
    name: string;
    contactPerson: string | null;
    phone: string | null;
    email: string | null;
    street: string | null;
    postalCode: string | null;
    city: string | null;
  } | null;
  order: {
    id: string;
    orderNumber: string | null;
    title: string;
    orderKind: string | null;
    onsiteContact: string | null;
    propertyName: string | null;
    propertyStreet: string | null;
    propertyCity: string | null;
  };
  employees: Array<{ id: string; name: string; removeAction: (formData: FormData) => void }>;
  employeeOptions: Array<{ id: string; label: string }>;
  machines: Array<{ id: string; label: string; removeAction: (formData: FormData) => void }>;
  machineOptions: Array<{ id: string; label: string }>;
  materials: Array<{
    id: string;
    materialId: string;
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number | null;
    consumedAt: string | null;
    consumeAction: (formData: FormData) => void;
    removeAction: (formData: FormData) => void;
  }>;
  materialOptions: Array<{ id: string; label: string; unit: string }>;
  photos: Array<{ id: string; category: string; fileName: string; url: string | null; createdAt: string; deleteAction: (formData: FormData) => void }>;
  signature: { name: string | null; role: string | null; signedAt: string | null; url: string | null };
  pdfGeneratedAt: string | null;
  history: Array<{ id: string; action: string; summary: string | null; actorName: string | null; createdAt: string }>;
  canManage: boolean;
  canArchiveOrDelete: boolean;
  canLinkCommercial: boolean;
  invoicePreparedAt: string | null;
  activeTab: PanelTabKey;
  hrefs: { close: string; tabs: Record<PanelTabKey, string> };
  updateStatusAction: (formData: FormData) => void;
  updateDetailsAction: (formData: FormData) => void;
  addEmployeeAction: (formData: FormData) => void;
  addMachineAction: (formData: FormData) => void;
  addMaterialAction: (formData: FormData) => void;
  uploadPhotoAction: (formData: FormData) => void;
  saveSignatureAction: (formData: FormData) => void;
  markPdfAction: (formData: FormData) => void;
  finalizeOrderAction: (formData: FormData) => void;
  prepareInvoiceAction: (formData: FormData) => void;
  archiveAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
};

export function ReportDetailPanel({ data }: { data: ReportDetailPanelData }) {
  const router = useRouter();

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

  const photosByCategory = REPORT_PHOTO_CATEGORIES.map((cat) => ({
    category: cat,
    items: data.photos.filter((p) => p.category === cat),
  }));

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px] lg:hidden" onClick={() => router.push(data.hrefs.close)} />
      <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md animate-slide-in-right overflow-y-auto border-l border-border bg-card p-5 shadow-xl lg:sticky lg:top-0 lg:z-0 lg:h-[calc(100vh-2rem)] lg:max-w-none lg:animate-none lg:shadow-none">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Einsatzbericht</h2>
          <Link href={data.hrefs.close} className="rounded-full p-1.5 text-muted transition-colors hover:bg-background hover:text-foreground">
            <X className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-lg font-semibold text-white shadow-sm">
            {initialsFor(data.customer?.name ?? data.order.title)}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold tracking-tight text-foreground">{data.reportNumber ?? "Einsatzbericht"}</h3>
            <p className="truncate text-sm text-muted">
              {data.order.orderNumber ?? data.order.title} · {formatDate(data.reportDate)}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium shadow-sm ${REPORT_STATUS_BADGE_CLASS[data.status] ?? "bg-gray-100 text-gray-600"}`}>
            {REPORT_STATUS_LABELS[data.status] ?? data.status}
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
                {REPORT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {REPORT_STATUS_LABELS[s]}
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
          {/* Kundendaten */}
          {data.activeTab === "kunde" && (
            <div className="space-y-3 text-sm">
              {data.customer ? (
                <div className="space-y-2.5 rounded-xl bg-background p-3">
                  <p className="font-semibold text-foreground">{data.customer.name}</p>
                  {data.customer.contactPerson && <p className="text-muted">Ansprechpartner: {data.customer.contactPerson}</p>}
                  {data.customer.phone && <p className="text-muted">Tel.: {data.customer.phone}</p>}
                  {data.customer.email && <p className="text-muted">{data.customer.email}</p>}
                  {(data.customer.street || data.customer.city) && (
                    <p className="text-muted">
                      {data.customer.street}
                      {data.customer.street && data.customer.city ? ", " : ""}
                      {data.customer.postalCode} {data.customer.city}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted">Kein Kunde hinterlegt.</p>
              )}
            </div>
          )}

          {/* Auftragsdaten */}
          {data.activeTab === "auftrag" && (
            <div className="space-y-3 text-sm">
              <div className="space-y-2.5 rounded-xl bg-background p-3">
                <p className="font-semibold text-foreground">{data.order.orderNumber ?? data.order.title}</p>
                <p className="text-muted">{data.order.title}</p>
                {data.order.onsiteContact && <p className="text-muted">Ansprechpartner vor Ort: {data.order.onsiteContact}</p>}
                {(data.order.propertyStreet || data.order.propertyName) && (
                  <p className="text-muted">
                    {data.order.propertyName ? `${data.order.propertyName} – ` : ""}
                    {data.order.propertyStreet}
                    {data.order.propertyStreet && data.order.propertyCity ? ", " : ""}
                    {data.order.propertyCity}
                  </p>
                )}
              </div>
              <Link href={`/auftraege?panel=${data.order.id}`} className="inline-block text-sm font-medium text-brand hover:text-brand-dark">
                Zum Auftrag →
              </Link>
              {data.canLinkCommercial && data.status !== "abgeschlossen" && (
                <form action={data.finalizeOrderAction}>
                  <button type="submit" className="w-full rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-background">
                    Auftrag auf „Abgeschlossen“ setzen
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Mitarbeiter */}
          {data.activeTab === "mitarbeiter" && (
            <div className="space-y-3 text-sm">
              <div className="space-y-2">
                {data.employees.length === 0 && <p className="text-muted">Keine Mitarbeiter zugeordnet.</p>}
                {data.employees.map((e) => (
                  <div key={e.id} className="flex items-center justify-between rounded-xl bg-background p-2.5">
                    <span className="flex items-center gap-2 text-foreground">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-[10px] font-semibold text-brand">{initialsFor(e.name)}</span>
                      {e.name}
                    </span>
                    {data.canManage && (
                      <form action={e.removeAction}>
                        <button type="submit" className="text-muted hover:text-red-600" aria-label={`${e.name} entfernen`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
              {data.canManage && data.employeeOptions.length > 0 && (
                <form action={data.addEmployeeAction} className="flex items-center gap-2 border-t border-border pt-3">
                  <select name="employee_id" required className={inputClass}>
                    <option value="">Mitarbeiter hinzufügen…</option>
                    {data.employeeOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="shrink-0 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                    +
                  </button>
                </form>
              )}

              <p className="border-t border-border pt-3 text-xs font-semibold uppercase tracking-wide text-muted">Maschinen & Fahrzeuge</p>
              <div className="space-y-2">
                {data.machines.length === 0 && <p className="text-muted">Keine Maschinen/Fahrzeuge zugeordnet.</p>}
                {data.machines.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-xl bg-background p-2.5">
                    <span className="text-foreground">{m.label}</span>
                    {data.canManage && (
                      <form action={m.removeAction}>
                        <button type="submit" className="text-muted hover:text-red-600" aria-label={`${m.label} entfernen`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
              {data.canManage && data.machineOptions.length > 0 && (
                <form action={data.addMachineAction} className="flex items-center gap-2">
                  <select name="fleet_item_id" required className={inputClass}>
                    <option value="">Maschine/Fahrzeug hinzufügen…</option>
                    {data.machineOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="shrink-0 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                    +
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Arbeitszeit */}
          {data.activeTab === "arbeitszeit" && (
            <form action={data.updateDetailsAction} className="space-y-4 text-sm">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-background p-2.5">
                  <p className="text-base font-semibold text-foreground">{formatMinutesAsHours(data.durationMinutes)}</p>
                  <p className="text-[11px] text-muted">Arbeitszeit</p>
                </div>
                <div className="rounded-xl bg-background p-2.5">
                  <p className="text-base font-semibold text-foreground">{data.breakMinutes ?? 0} min</p>
                  <p className="text-[11px] text-muted">Pause</p>
                </div>
                <div className="rounded-xl bg-background p-2.5">
                  <p className="text-base font-semibold text-foreground">{data.weather ?? "—"}</p>
                  <p className="text-[11px] text-muted">Wetter</p>
                </div>
              </div>

              {data.canManage ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelClass}>Datum</label>
                      <input type="date" name="report_date" defaultValue={data.reportDate.slice(0, 10)} className={`mt-1 ${inputClass}`} />
                    </div>
                    <div>
                      <label className={labelClass}>Pause (min)</label>
                      <input type="number" min="0" name="break_minutes" defaultValue={data.breakMinutes ?? 0} className={`mt-1 ${inputClass}`} />
                    </div>
                    <div>
                      <label className={labelClass}>Beginn</label>
                      <input type="time" name="start_time" defaultValue={data.startTime ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                    <div>
                      <label className={labelClass}>Ende</label>
                      <input type="time" name="end_time" defaultValue={data.endTime ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Wetter (optional)</label>
                    <input name="weather" defaultValue={data.weather ?? ""} className={`mt-1 ${inputClass}`} />
                  </div>
                  <div>
                    <p className={labelClass}>Durchgeführte Arbeiten</p>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                      {WORK_TYPES.map((w) => (
                        <label key={w} className="flex items-center gap-1.5 text-xs">
                          <input type="checkbox" name="work_types" value={w} defaultChecked={data.workTypes.includes(w)} className="h-3.5 w-3.5 rounded border-border text-brand focus:ring-brand" />
                          {WORK_TYPE_LABELS[w]}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Freitext</label>
                    <textarea name="work_performed" defaultValue={data.workPerformed} rows={4} className={`mt-1 ${inputClass}`} />
                  </div>
                  <div>
                    <label className={labelClass}>Interne Notizen (nicht im Kunden-PDF sichtbar)</label>
                    <textarea name="internal_notes" defaultValue={data.internalNotes ?? ""} rows={3} className={`mt-1 ${inputClass}`} />
                  </div>
                  <button type="submit" className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                    Speichern
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="whitespace-pre-wrap text-foreground">{data.workPerformed}</p>
                  {data.workTypes.length > 0 && <p className="text-muted">{data.workTypes.map((w) => WORK_TYPE_LABELS[w] ?? w).join(", ")}</p>}
                </div>
              )}
            </form>
          )}

          {/* Material */}
          {data.activeTab === "material" && (
            <div className="space-y-3 text-sm">
              {data.materials.length === 0 && <p className="text-muted">Kein Material erfasst.</p>}
              {data.materials.map((m) => (
                <div key={m.id} className="rounded-xl bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">{m.name}</p>
                      <p className="text-xs text-muted">
                        {m.quantity.toLocaleString("de-DE")} {m.unit}
                        {m.unitPrice !== null ? ` · ${formatEuro(m.quantity * m.unitPrice)}` : ""}
                      </p>
                    </div>
                    {m.consumedAt ? (
                      <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Abgebucht</span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Offen</span>
                    )}
                  </div>
                  {data.canManage && !m.consumedAt && (
                    <div className="mt-2 flex gap-2">
                      <form action={m.consumeAction}>
                        <button type="submit" className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-card">
                          Bestand abbuchen
                        </button>
                      </form>
                      <form action={m.removeAction}>
                        <button type="submit" className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                          Entfernen
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              ))}
              {data.canManage && (
                <form action={data.addMaterialAction} className="space-y-2 border-t border-border pt-3">
                  <label className={labelClass}>Material hinzufügen</label>
                  <select name="material_id" required className={inputClass}>
                    <option value="">Material auswählen…</option>
                    {data.materialOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input type="number" step="0.01" min="0.01" name="quantity" required placeholder="Menge" className={inputClass} />
                    <button type="submit" className="shrink-0 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                      Hinzufügen
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Fotos */}
          {data.activeTab === "fotos" && (
            <div className="space-y-4 text-sm">
              {photosByCategory.map(({ category, items }) => (
                <div key={category}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{REPORT_PHOTO_CATEGORY_LABELS[category]}</p>
                  {items.length === 0 ? (
                    <p className="mt-1 text-xs text-muted">Keine Fotos.</p>
                  ) : (
                    <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                      {items.map((p) => (
                        <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg bg-background">
                          {p.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.url} alt={p.fileName} className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-muted">
                              <Camera className="h-4 w-4" />
                            </span>
                          )}
                          {data.canManage && (
                            <form action={p.deleteAction} className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <button type="submit" className="rounded-full bg-black/60 p-1 text-white hover:bg-black/80" aria-label="Foto löschen">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </form>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {data.canManage && (
                <form action={data.uploadPhotoAction} className="space-y-2 border-t border-border pt-3">
                  <select name="category" defaultValue="baustelle" className={inputClass}>
                    {REPORT_PHOTO_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {REPORT_PHOTO_CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                  <input type="file" name="files" accept="image/*" multiple className="block w-full text-xs" />
                  <button type="submit" className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                    Fotos hochladen
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Unterschrift */}
          {data.activeTab === "unterschrift" && (
            <div className="space-y-4 text-sm">
              {data.signature.signedAt ? (
                <div className="space-y-2.5 rounded-xl bg-background p-3">
                  {data.signature.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.signature.url} alt="Unterschrift" className="h-24 rounded-lg border border-border bg-white object-contain p-2" />
                  )}
                  <p className="text-foreground">
                    {data.signature.name}
                    {data.signature.role ? ` · ${data.signature.role}` : ""}
                  </p>
                  <p className="text-muted">Unterschrieben am {formatDateTime(data.signature.signedAt)}</p>
                </div>
              ) : (
                <p className="text-muted">Noch keine Unterschrift erfasst.</p>
              )}
              {data.canManage && (
                <form action={data.saveSignatureAction} className="space-y-3 border-t border-border pt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelClass}>Name</label>
                      <input name="customer_signature_name" required defaultValue={data.signature.name ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                    <div>
                      <label className={labelClass}>Funktion</label>
                      <input name="customer_signature_role" defaultValue={data.signature.role ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                  </div>
                  <SignaturePad name="signature_data_url" />
                  <button type="submit" className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                    Unterschrift speichern
                  </button>
                </form>
              )}
            </div>
          )}

          {/* PDF-Vorschau */}
          {data.activeTab === "pdf" && (
            <div className="space-y-3 text-sm">
              <div className="space-y-2.5 rounded-xl bg-background p-4">
                <p className="font-semibold text-foreground">{data.reportNumber ?? "Einsatzbericht"}</p>
                <p className="text-muted">{data.customer?.name ?? "—"}</p>
                <p className="text-muted">
                  {data.order.orderNumber ?? data.order.title} · {formatDate(data.reportDate)}
                </p>
                <p className="whitespace-pre-wrap text-foreground">{data.workPerformed}</p>
                {data.pdfGeneratedAt ? (
                  <p className="text-xs text-muted">Zuletzt erzeugt: {formatDateTime(data.pdfGeneratedAt)}</p>
                ) : (
                  <p className="text-xs text-muted">Noch nicht erzeugt.</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-background"
              >
                PDF-Vorschau drucken/speichern
              </button>
              <form action={data.markPdfAction}>
                <button type="submit" className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                  Als „erzeugt“ markieren
                </button>
              </form>
              {data.canLinkCommercial && (
                <form action={data.prepareInvoiceAction}>
                  <button
                    type="submit"
                    disabled={Boolean(data.invoicePreparedAt)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-background disabled:opacity-40"
                  >
                    {data.invoicePreparedAt ? "Rechnungsentwurf bereits erstellt" : "Rechnung vorbereiten"}
                  </button>
                </form>
              )}
              <p className="text-xs text-muted">
                Der Versand des Berichts per E-Mail an den Kunden ist noch nicht angebunden – dafür wird ein verbundener E-Mail-Anbieter benötigt.
              </p>
            </div>
          )}

          {/* Historie */}
          {data.activeTab === "historie" && (
            <div className="space-y-2 text-sm">
              {data.history.length === 0 && <p className="text-muted">Keine Einträge vorhanden.</p>}
              {data.history.map((h) => (
                <div key={h.id} className="rounded-xl bg-background p-2.5">
                  <p className="text-foreground">{h.summary ?? h.action}</p>
                  <p className="text-xs text-muted">
                    {formatDateTime(h.createdAt)}
                    {h.actorName ? ` · ${h.actorName}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {data.canArchiveOrDelete && (
          <div className="mt-6 flex items-center justify-between gap-2 border-t border-border pt-4">
            <form action={data.archiveAction}>
              <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-background">
                {data.isArchived ? "Dearchivieren" : "Archivieren"}
              </button>
            </form>
            <form
              action={data.deleteAction}
              onSubmit={(e) => {
                if (!window.confirm("Diesen Bericht unwiderruflich löschen?")) e.preventDefault();
              }}
            >
              <button type="submit" className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
                Löschen
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
