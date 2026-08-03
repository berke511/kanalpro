"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  FileEdit,
  FileText,
  Info,
  Mail,
  MapPin,
  MoreVertical,
  NotebookText,
  Package,
  Paperclip,
  Phone,
  Receipt,
  Star,
  Trash2,
  Truck,
  Upload,
  User,
  Users,
  Wrench,
  X,
  Archive,
  ArchiveRestore,
  type LucideIcon,
} from "lucide-react";
import { formatDate, formatDateTime, formatTime } from "@/lib/date";
import { formatEuro } from "@/lib/format";
import {
  ORDER_AUDIT_ACTION_LABELS,
  ORDER_KIND_LABELS,
  ORDER_PRIORITY_BADGE_CLASS,
  ORDER_PRIORITY_LABELS,
  ORDER_STATUSES,
  ORDER_STATUS_BADGE_CLASS,
  STATUS_LABELS,
  type OrderProgressStep,
} from "@/lib/orders";
import {
  deleteOrder,
  duplicateOrder,
  setOrderArchived,
  toggleOrderFavorite,
  updateOrderStatus,
} from "@/app/(dashboard)/auftraege/actions";
import { AssignEmployeeForm, AssignVehicleForm } from "@/components/dashboard/OrderResourceForms";
import { OrderMaterialForm } from "@/components/dashboard/OrderMaterialForm";
import { OrderDocumentForm } from "@/components/dashboard/OrderDocumentForm";

export type PanelTabKey = "uebersicht" | "details" | "ressourcen" | "material" | "dokumente" | "aktivitaeten";

const TABS: Array<{ key: PanelTabKey; label: string; icon: LucideIcon }> = [
  { key: "uebersicht", label: "Übersicht", icon: Info },
  { key: "details", label: "Details", icon: FileText },
  { key: "ressourcen", label: "Ressourcen", icon: Users },
  { key: "material", label: "Material", icon: Package },
  { key: "dokumente", label: "Dokumente", icon: Paperclip },
  { key: "aktivitaeten", label: "Aktivitäten", icon: NotebookText },
];

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type OrderDetailPanelData = {
  order: {
    id: string;
    order_number: string | null;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    order_kind: string;
    service_type: string | null;
    is_favorite: boolean;
    is_archived: boolean;
    scheduled_date: string | null;
    start_time: string | null;
    planned_duration_minutes: number | null;
    time_window_start: string | null;
    time_window_end: string | null;
    all_day: boolean;
    is_recurring: boolean;
    internal_notes: string | null;
    access_info: string | null;
    arrival_info: string | null;
    onsite_contact: string | null;
    safety_notes: string | null;
    order_value: number | null;
    created_at: string;
    updated_at: string;
  };
  customer: { id: string; name: string; phone: string | null; email: string | null } | null;
  primaryContact: { name: string; phone: string | null; email: string | null } | null;
  property: {
    name: string;
    street: string | null;
    postal_code: string | null;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  createdByName: string | null;
  updatedByName: string | null;
  dispatcherName: string | null;
  progress: { percent: number; steps: OrderProgressStep[] };
  lastActivity: { text: string; createdAt: string; authorName: string } | null;
  employees: Array<{ assignmentId: string; id: string; name: string; unassignAction: (formData: FormData) => void }>;
  vehicles: Array<{
    resourceId: string;
    id: string;
    name: string;
    licensePlate: string | null;
    unassignAction: (formData: FormData) => void;
  }>;
  materials: Array<{
    linkId: string;
    name: string;
    unit: string | null;
    quantity: number;
    removeAction: (formData: FormData) => void;
  }>;
  documents: Array<{
    id: string;
    file_name: string;
    category: string;
    size_bytes: number | null;
    created_at: string;
    url: string | null;
    deleteAction: (formData: FormData) => void;
  }>;
  activity: Array<{ id: string; action: string; summary: string | null; authorName: string; createdAt: string }>;
  activeTab: PanelTabKey;
  canManageResources: boolean;
  employeeOptions: Array<{ id: string; label: string }>;
  vehicleOptions: Array<{ id: string; label: string }>;
  materialOptions: Array<{ id: string; label: string; unit: string | null }>;
  hrefs: {
    close: string;
    tabs: Record<PanelTabKey, string>;
    fullProfile: string;
    newReport: string;
    newQuote: string | null;
    newInvoice: string | null;
  };
  assignEmployeeAction: (formData: FormData) => void;
  assignVehicleAction: (formData: FormData) => void;
  addMaterialAction: (formData: FormData) => void;
  uploadDocumentAction: (formData: FormData) => void;
};

export function OrderDetailPanel({ data }: { data: OrderDetailPanelData }) {
  const router = useRouter();
  const { order } = data;
  const [, startTransition] = useTransition();
  const [favorite, setFavorite] = useState(order.is_favorite);
  const [menuOpen, setMenuOpen] = useState(false);

  // Setzt den Favoriten-Zustand zurück, sobald ein anderer Auftrag im Panel
  // angezeigt wird (z. B. durch Klick auf einen anderen Tabellen-Eintrag,
  // ohne dass die Komponente neu gemountet wird). Direkt beim Rendern statt
  // in einem Effect, um kaskadierende Re-Renders zu vermeiden (gleiches
  // Muster wie CustomerSearchInput).
  const [prevOrderId, setPrevOrderId] = useState(order.id);
  if (order.id !== prevOrderId) {
    setPrevOrderId(order.id);
    setFavorite(order.is_favorite);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") router.push(data.hrefs.close);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router, data.hrefs.close]);

  function handleFavoriteClick() {
    const next = !favorite;
    setFavorite(next);
    startTransition(async () => {
      await toggleOrderFavorite(order.id, next);
      router.refresh();
    });
  }

  function handleStatusChange(status: string) {
    startTransition(async () => {
      await updateOrderStatus(order.id, status);
      router.refresh();
    });
  }

  function handleDuplicate() {
    setMenuOpen(false);
    startTransition(async () => {
      await duplicateOrder(order.id);
      router.refresh();
    });
  }

  function handleArchiveToggle() {
    setMenuOpen(false);
    startTransition(async () => {
      await setOrderArchived(order.id, !order.is_archived);
      router.refresh();
    });
  }

  function handleDelete() {
    setMenuOpen(false);
    const ok = window.confirm(
      `Auftrag "${order.order_number ?? order.title}" wirklich endgültig löschen? Dies kann nicht rückgängig gemacht werden.`,
    );
    if (!ok) return;
    startTransition(async () => {
      await deleteOrder(order.id);
    });
  }

  const propertyAddress = data.property
    ? [data.property.street, [data.property.postal_code, data.property.city].filter(Boolean).join(" ")]
        .filter(Boolean)
        .join(", ")
    : "";
  const hasCoords = data.property?.latitude != null && data.property?.longitude != null;

  return (
    <>
      <Link
        href={data.hrefs.close}
        aria-label="Detailpanel schließen"
        className="fixed inset-0 z-40 bg-black/30 animate-fade-in"
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-border bg-card shadow-2xl animate-slide-in-right">
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="break-words text-lg font-semibold tracking-tight">{order.order_number ?? "Ohne Nummer"}</h2>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_BADGE_CLASS[order.status] ?? "bg-gray-100 text-gray-600"}`}
              >
                {STATUS_LABELS[order.status] ?? order.status}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${ORDER_PRIORITY_BADGE_CLASS[order.priority] ?? "bg-gray-100 text-gray-600"}`}
              >
                {ORDER_PRIORITY_LABELS[order.priority] ?? order.priority}
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-muted">
              {order.title || ORDER_KIND_LABELS[order.order_kind] || order.order_kind}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={handleFavoriteClick}
              aria-label={favorite ? "Favorit entfernen" : "Als Favorit markieren"}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-amber-500"
            >
              <Star className={`h-4 w-4 ${favorite ? "fill-amber-400 text-amber-400" : ""}`} />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Aktionen"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-foreground"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {menuOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-10 cursor-default"
                    aria-label="Menü schließen"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-border bg-card p-1.5 shadow-lg">
                    <Link
                      href={data.hrefs.fullProfile}
                      className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-background"
                      onClick={() => setMenuOpen(false)}
                    >
                      <FileEdit className="h-3.5 w-3.5" /> Bearbeiten
                    </Link>
                    <button
                      type="button"
                      onClick={handleDuplicate}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-background"
                    >
                      <Copy className="h-3.5 w-3.5" /> Auftrag duplizieren
                    </button>
                    <button
                      type="button"
                      onClick={handleArchiveToggle}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-background"
                    >
                      {order.is_archived ? (
                        <>
                          <ArchiveRestore className="h-3.5 w-3.5" /> Dearchivieren
                        </>
                      ) : (
                        <>
                          <Archive className="h-3.5 w-3.5" /> Archivieren
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Löschen
                    </button>
                  </div>
                </>
              )}
            </div>
            <Link
              href={data.hrefs.close}
              aria-label="Schließen"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Schnellaktionen: immer sichtbar, unabhängig vom aktiven Reiter */}
        <div className="grid grid-cols-3 gap-2 border-b border-border p-4 sm:grid-cols-4">
          <Link
            href={data.hrefs.fullProfile}
            className="flex flex-col items-center gap-1 rounded-lg border border-border px-2 py-2.5 text-center text-xs font-medium hover:bg-background"
          >
            <FileEdit className="h-4 w-4" />
            Bearbeiten
          </Link>
          <Link
            href={data.hrefs.newReport}
            className="flex flex-col items-center gap-1 rounded-lg border border-border px-2 py-2.5 text-center text-xs font-medium hover:bg-background"
          >
            <Wrench className="h-4 w-4" />
            Einsatzbericht
          </Link>
          {data.hrefs.newQuote ? (
            <Link
              href={data.hrefs.newQuote}
              className="flex flex-col items-center gap-1 rounded-lg border border-border px-2 py-2.5 text-center text-xs font-medium hover:bg-background"
            >
              <FileText className="h-4 w-4" />
              Angebot
            </Link>
          ) : (
            <span className="flex flex-col items-center gap-1 rounded-lg border border-border/50 px-2 py-2.5 text-center text-xs font-medium text-muted/40">
              <FileText className="h-4 w-4" />
              Angebot
            </span>
          )}
          {data.hrefs.newInvoice ? (
            <Link
              href={data.hrefs.newInvoice}
              className="flex flex-col items-center gap-1 rounded-lg border border-border px-2 py-2.5 text-center text-xs font-medium hover:bg-background"
            >
              <Receipt className="h-4 w-4" />
              Rechnung
            </Link>
          ) : (
            <span className="flex flex-col items-center gap-1 rounded-lg border border-border/50 px-2 py-2.5 text-center text-xs font-medium text-muted/40">
              <Receipt className="h-4 w-4" />
              Rechnung
            </span>
          )}
          <Link
            href={data.hrefs.tabs.dokumente}
            className="flex flex-col items-center gap-1 rounded-lg border border-border px-2 py-2.5 text-center text-xs font-medium hover:bg-background"
          >
            <Upload className="h-4 w-4" />
            Dokument
          </Link>
          <div className="col-span-2 flex flex-col gap-1 rounded-lg border border-border px-2 py-1.5 text-center sm:col-span-4">
            <label className="text-[10px] font-medium uppercase tracking-wide text-muted">Status ändern</label>
            <select
              value={order.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full rounded-md border-0 bg-transparent px-1 py-1 text-sm font-medium outline-none"
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s] ?? s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.key}
                href={data.hrefs.tabs[t.key]}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${
                  data.activeTab === t.key ? "bg-brand text-white" : "text-muted hover:bg-background hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </Link>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {data.activeTab === "uebersicht" && (
            <div className="space-y-5">
              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  <User className="h-3.5 w-3.5" />
                  Kunde
                </h3>
                {data.customer ? (
                  <div className="mt-2 rounded-lg border border-border bg-background/60 p-3 text-sm">
                    <p className="font-medium">{data.customer.name}</p>
                    {data.primaryContact && <p className="text-xs text-muted">{data.primaryContact.name}</p>}
                    <div className="mt-2 flex gap-2">
                      {(data.primaryContact?.phone || data.customer.phone) && (
                        <a
                          href={`tel:${data.primaryContact?.phone || data.customer.phone}`}
                          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-background"
                        >
                          <Phone className="h-3 w-3" /> Anrufen
                        </a>
                      )}
                      {(data.primaryContact?.email || data.customer.email) && (
                        <a
                          href={`mailto:${data.primaryContact?.email || data.customer.email}`}
                          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-background"
                        >
                          <Mail className="h-3 w-3" /> E-Mail
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted">Kein Kunde verknüpft.</p>
                )}
              </div>

              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  <MapPin className="h-3.5 w-3.5" />
                  Objekt
                </h3>
                {data.property ? (
                  <div className="mt-2">
                    <p className="text-sm font-medium">{data.property.name}</p>
                    <p className="text-xs text-muted">{propertyAddress || "—"}</p>
                    {hasCoords && (
                      <div className="mt-2 overflow-hidden rounded-lg border border-border">
                        <iframe
                          title="Kartenansicht"
                          className="h-32 w-full"
                          loading="lazy"
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${data.property.longitude! - 0.006}%2C${data.property.latitude! - 0.004}%2C${data.property.longitude! + 0.006}%2C${data.property.latitude! + 0.004}&layer=mapnik&marker=${data.property.latitude}%2C${data.property.longitude}`}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted">Kein Objekt verknüpft.</p>
                )}
              </div>

              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  <Calendar className="h-3.5 w-3.5" />
                  Termin
                </h3>
                <p className="mt-2 text-sm">
                  {order.scheduled_date ? formatDate(order.scheduled_date) : "Noch nicht terminiert"}
                  {order.start_time && !order.all_day && ` · ${formatTime(order.start_time)} Uhr`}
                  {order.all_day && " · ganztägig"}
                </p>
                {order.planned_duration_minutes && (
                  <p className="text-xs text-muted">Geplante Dauer: {order.planned_duration_minutes} Min.</p>
                )}
              </div>

              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  <Users className="h-3.5 w-3.5" />
                  Zugewiesene Ressourcen
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {data.employees.map((e) => (
                    <span key={e.assignmentId} className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-dark">
                      {e.name}
                    </span>
                  ))}
                  {data.vehicles.map((v) => (
                    <span key={v.resourceId} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {v.licensePlate || v.name}
                    </span>
                  ))}
                  {data.employees.length === 0 && data.vehicles.length === 0 && (
                    <p className="text-sm text-muted">Noch keine Ressourcen zugewiesen.</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Fortschritt
                </h3>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-background">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${data.progress.percent}%` }} />
                  </div>
                  <span className="shrink-0 text-xs font-medium tabular-nums text-muted">{data.progress.percent}%</span>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {data.progress.steps.map((step) => (
                    <li key={step.key} className="flex items-center justify-between gap-2 text-sm">
                      <span className={`flex items-center gap-1.5 ${step.done ? "text-foreground" : "text-muted"}`}>
                        <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${step.done ? "text-green-600" : "text-border"}`} />
                        {step.label}
                        {!step.done && <span className="text-xs text-muted">(offen)</span>}
                      </span>
                      {step.timestamp && <span className="shrink-0 text-xs text-muted">{formatDateTime(step.timestamp)}</span>}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  <Clock className="h-3.5 w-3.5" />
                  Letzte Aktivität
                </h3>
                {data.lastActivity ? (
                  <p className="mt-2 text-sm text-muted">
                    {data.lastActivity.text} · {data.lastActivity.authorName} · {formatDateTime(data.lastActivity.createdAt)}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-muted">Noch keine Aktivität erfasst.</p>
                )}
              </div>
            </div>
          )}

          {data.activeTab === "details" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Beschreibung</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm">{order.description || "—"}</p>
              </div>

              <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">Auftragsart</dt>
                  <dd className="mt-0.5">{ORDER_KIND_LABELS[order.order_kind] ?? order.order_kind}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">Leistung</dt>
                  <dd className="mt-0.5">{order.service_type || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">Auftragswert</dt>
                  <dd className="mt-0.5">{order.order_value ? formatEuro(order.order_value) : "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">Wiederkehrend</dt>
                  <dd className="mt-0.5">{order.is_recurring ? "Ja" : "Nein"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">Zeitfenster</dt>
                  <dd className="mt-0.5">
                    {order.time_window_start && order.time_window_end
                      ? `${formatTime(order.time_window_start)}–${formatTime(order.time_window_end)} Uhr`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">Disponent</dt>
                  <dd className="mt-0.5">{data.dispatcherName ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">Angelegt</dt>
                  <dd className="mt-0.5">
                    {formatDateTime(order.created_at)}
                    {data.createdByName && ` · ${data.createdByName}`}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">Zuletzt geändert</dt>
                  <dd className="mt-0.5">
                    {formatDateTime(order.updated_at)}
                    {data.updatedByName && ` · ${data.updatedByName}`}
                  </dd>
                </div>
              </dl>

              <div className="space-y-3">
                {order.onsite_contact && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Ansprechpartner vor Ort</p>
                    <p className="mt-1 text-sm">{order.onsite_contact}</p>
                  </div>
                )}
                {order.arrival_info && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Anfahrtshinweise</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{order.arrival_info}</p>
                  </div>
                )}
                {order.access_info && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Zugangsinformationen</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{order.access_info}</p>
                  </div>
                )}
                {order.safety_notes && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Sicherheits-/Gefahrenhinweise</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{order.safety_notes}</p>
                  </div>
                )}
                {order.internal_notes && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Interne Notizen</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{order.internal_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {data.activeTab === "ressourcen" && (
            <div className="space-y-6">
              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  <Users className="h-3.5 w-3.5" />
                  Mitarbeiter
                </h3>
                <div className="mt-2 space-y-2">
                  {data.employees.length === 0 && <p className="text-sm text-muted">Noch keine Mitarbeiter zugewiesen.</p>}
                  {data.employees.map((e) => (
                    <div key={e.assignmentId} className="flex items-center justify-between rounded-lg border border-border bg-background/60 p-2.5 text-sm">
                      <span>{e.name}</span>
                      {data.canManageResources && (
                        <form action={e.unassignAction}>
                          <button type="submit" className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700">
                            <Trash2 className="h-3.5 w-3.5" /> Entfernen
                          </button>
                        </form>
                      )}
                    </div>
                  ))}
                </div>
                {data.canManageResources && (
                  <div className="mt-3">
                    <AssignEmployeeForm action={data.assignEmployeeAction} options={data.employeeOptions} />
                  </div>
                )}
              </div>

              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  <Truck className="h-3.5 w-3.5" />
                  Fahrzeuge
                </h3>
                <div className="mt-2 space-y-2">
                  {data.vehicles.length === 0 && <p className="text-sm text-muted">Noch keine Fahrzeuge zugewiesen.</p>}
                  {data.vehicles.map((v) => (
                    <div key={v.resourceId} className="flex items-center justify-between rounded-lg border border-border bg-background/60 p-2.5 text-sm">
                      <span>
                        {v.licensePlate || v.name}
                        {v.licensePlate && v.name ? ` · ${v.name}` : ""}
                      </span>
                      {data.canManageResources && (
                        <form action={v.unassignAction}>
                          <button type="submit" className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700">
                            <Trash2 className="h-3.5 w-3.5" /> Entfernen
                          </button>
                        </form>
                      )}
                    </div>
                  ))}
                </div>
                {data.canManageResources && (
                  <div className="mt-3">
                    <AssignVehicleForm action={data.assignVehicleAction} options={data.vehicleOptions} />
                  </div>
                )}
              </div>

              {!data.canManageResources && (
                <p className="rounded-lg bg-background/60 p-3 text-xs text-muted">
                  Ihre Rolle erlaubt keine Änderung der Ressourcenzuweisung.
                </p>
              )}
            </div>
          )}

          {data.activeTab === "material" && (
            <div className="space-y-4">
              {data.materials.length === 0 && (
                <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted">
                  Noch kein Material erfasst.
                </p>
              )}
              {data.materials.map((m) => (
                <div key={m.linkId} className="flex items-center justify-between rounded-xl border border-border bg-background/60 p-3 text-sm">
                  <span>
                    {m.quantity} {m.unit ?? ""} {m.name}
                  </span>
                  <form action={m.removeAction}>
                    <button type="submit" className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700">
                      <Trash2 className="h-3.5 w-3.5" /> Entfernen
                    </button>
                  </form>
                </div>
              ))}
              <OrderMaterialForm action={data.addMaterialAction} options={data.materialOptions} />
            </div>
          )}

          {data.activeTab === "dokumente" && (
            <div className="space-y-4">
              {data.documents.length === 0 && (
                <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted">
                  Noch keine Dokumente hochgeladen.
                </p>
              )}
              {data.documents.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-left text-sm">
                    <tbody>
                      {data.documents.map((d) => (
                        <tr key={d.id} className="border-b border-border last:border-0">
                          <td className="px-3 py-2.5">
                            {d.url ? (
                              <a href={d.url} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">
                                {d.file_name}
                              </a>
                            ) : (
                              d.file_name
                            )}
                            <p className="text-xs text-muted">
                              {d.category} · {formatBytes(d.size_bytes)} · {formatDateTime(d.created_at)}
                            </p>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <form action={d.deleteAction}>
                              <button type="submit" className="ml-auto flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700">
                                <Trash2 className="h-3.5 w-3.5" /> Löschen
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <OrderDocumentForm action={data.uploadDocumentAction} />
            </div>
          )}

          {data.activeTab === "aktivitaeten" && (
            <div className="space-y-3">
              {data.activity.length === 0 && <p className="text-sm text-muted">Noch keine Aktivitäten erfasst.</p>}
              {data.activity.map((item) => (
                <div key={item.id} className="rounded-lg border border-border bg-background/60 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {ORDER_AUDIT_ACTION_LABELS[item.action] ?? item.action}
                    </span>
                    <span className="text-xs text-muted">
                      {item.authorName} · {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                  {item.summary && <p className="mt-1.5 break-words">{item.summary}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border p-3">
          <Link href={data.hrefs.fullProfile} className="block text-center text-xs font-medium text-muted hover:text-foreground">
            Vollständiges Profil öffnen →
          </Link>
        </div>
      </aside>
    </>
  );
}
