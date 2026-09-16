"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  FileEdit,
  FileText,
  Info,
  Mail,
  MapPin,
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
  type LucideIcon,
} from "lucide-react";
import { formatDate, formatDateTime, formatTime } from "@/lib/date";
import { formatEuro } from "@/lib/format";
import {
  ORDER_AUDIT_ACTION_LABELS,
  ORDER_KIND_LABELS,
  ORDER_PRIORITY_LABELS,
  ORDER_STATUSES,
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
import { OrderForm } from "@/components/dashboard/OrderForm";

export type PanelTabKey = "uebersicht" | "details" | "ressourcen" | "material" | "dokumente" | "aktivitaeten" | "bearbeiten";

const TABS: Array<{ key: PanelTabKey; label: string; icon: LucideIcon }> = [
  { key: "uebersicht", label: "Übersicht", icon: Info },
  { key: "details", label: "Details", icon: FileText },
  { key: "ressourcen", label: "Ressourcen", icon: Users },
  { key: "material", label: "Material", icon: Package },
  { key: "dokumente", label: "Dokumente", icon: Paperclip },
  { key: "aktivitaeten", label: "Aktivitäten", icon: NotebookText },
  { key: "bearbeiten", label: "Bearbeiten", icon: FileEdit },
];

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Initialen für das Hero-Icon: bevorzugt der Kundenname, sonst der
// Auftragstitel (analog zu initialsFor() in lib/invoices.ts / lib/fleet.ts).
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
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
  editForm: {
    customers: Array<{ id: string; label: string }>;
    employees: Array<{ id: string; label: string }>;
    vehicles: Array<{ id: string; label: string }>;
    machines: Array<{ id: string; label: string }>;
    selectedEmployeeIds: string[];
    selectedVehicleIds: string[];
    selectedMachineIds: string[];
    updateAction: (formData: FormData) => void;
  };
  hrefs: {
    tabs: Record<PanelTabKey, string>;
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

  // Setzt den Favoriten-Zustand zurück, sobald ein anderer Auftrag angezeigt
  // wird, ohne dass die Komponente neu gemountet wird – direkt beim Rendern
  // statt in einem Effect, um kaskadierende Re-Renders zu vermeiden (gleiches
  // Muster wie CustomerSearchInput).
  const [prevOrderId, setPrevOrderId] = useState(order.id);
  if (order.id !== prevOrderId) {
    setPrevOrderId(order.id);
    setFavorite(order.is_favorite);
  }

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
    startTransition(async () => {
      await duplicateOrder(order.id);
      router.refresh();
    });
  }

  function handleArchiveToggle() {
    startTransition(async () => {
      await setOrderArchived(order.id, !order.is_archived);
      router.refresh();
    });
  }

  function handleDelete() {
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

  const quickBtnClass =
    "flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-brand/30 hover:bg-brand-soft";
  const glassBtnClass =
    "flex items-center gap-1.5 rounded-[11px] border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20";

  const terminLabel = order.scheduled_date
    ? `${formatDate(order.scheduled_date)}${
        order.all_day ? " · ganztägig" : order.start_time ? ` · ${formatTime(order.start_time)} Uhr` : ""
      }`
    : "Nicht terminiert";
  const resourceCount = data.employees.length + data.vehicles.length;
  const resourceLabel =
    resourceCount === 0 ? "Keine zugewiesen" : `${data.employees.length} MA · ${data.vehicles.length} Fzg/Masch.`;
  const standortLabel = propertyAddress || data.customer?.name || "—";

  const heroStatTiles = [
    { key: "termin", label: "Termin", value: terminLabel },
    { key: "ressourcen", label: "Ressourcen", value: resourceLabel },
    { key: "standort", label: "Standort", value: standortLabel },
    { key: "wert", label: "Auftragswert", value: order.order_value ? formatEuro(order.order_value) : "—" },
  ];

  return (
    <>
      <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#3a63ff] via-[#3151e6] to-[#5b3ec9] px-6 py-6 text-white shadow-lg shadow-brand/25 sm:px-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/20 blur-2xl" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-lg font-semibold text-white">
              {initials(data.customer?.name ?? order.title)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-semibold tracking-tight">
                  {order.order_number ? `${order.order_number} · ` : ""}
                  {order.title}
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
                {order.priority !== "standard" && (
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium">
                    {ORDER_PRIORITY_LABELS[order.priority] ?? order.priority}
                  </span>
                )}
                {order.is_archived && <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium">Archiviert</span>}
              </div>
              <p className="mt-1 truncate text-sm text-white/80">
                {data.customer?.name ?? "Kein Kunde zugeordnet"} · {ORDER_KIND_LABELS[order.order_kind] ?? order.order_kind}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleFavoriteClick}
              aria-label={favorite ? "Favorit entfernen" : "Als Favorit markieren"}
              className="flex h-9 w-9 items-center justify-center rounded-[11px] border border-white/30 bg-white/10 hover:bg-white/20"
            >
              <Star className={`h-4 w-4 ${favorite ? "fill-amber-300 text-amber-300" : "text-white"}`} />
            </button>
            <select
              value={order.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="rounded-[11px] border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium text-white outline-none [color-scheme:dark]"
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s} className="text-foreground">
                  {STATUS_LABELS[s] ?? s}
                </option>
              ))}
            </select>
            <button type="button" onClick={handleDuplicate} className={glassBtnClass}>
              <Copy className="h-4 w-4" />
              Duplizieren
            </button>
            <button type="button" onClick={handleArchiveToggle} className={glassBtnClass}>
              {order.is_archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              {order.is_archived ? "Dearchivieren" : "Archivieren"}
            </button>
            <button type="button" onClick={handleDelete} className={glassBtnClass}>
              <Trash2 className="h-4 w-4" />
              Auftrag löschen
            </button>
          </div>
        </div>

        <div className="relative z-10 mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {heroStatTiles.map((tile) => (
            <div key={tile.key} className="rounded-xl bg-white/10 px-3 py-2.5">
              <p className="text-[10.5px] text-white/70">{tile.label}</p>
              <p className="mt-0.5 truncate text-sm font-bold tabular-nums" title={tile.value}>
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
          <div className="space-y-5">
            <div className="flex flex-wrap gap-1.5">
              <Link href={data.hrefs.newReport} className={quickBtnClass}>
                <Wrench className="h-3.5 w-3.5" />
                Einsatzbericht
              </Link>
              {data.hrefs.newQuote && (
                <Link href={data.hrefs.newQuote} className={quickBtnClass}>
                  <FileText className="h-3.5 w-3.5" />
                  Angebot erstellen
                </Link>
              )}
              {data.hrefs.newInvoice && (
                <Link href={data.hrefs.newInvoice} className={quickBtnClass}>
                  <Receipt className="h-3.5 w-3.5" />
                  Rechnung erstellen
                </Link>
              )}
              <Link href={data.hrefs.tabs.dokumente} className={quickBtnClass}>
                <Upload className="h-3.5 w-3.5" />
                Dokument hochladen
              </Link>
              <Link href={data.hrefs.tabs.bearbeiten} className={quickBtnClass}>
                <FileEdit className="h-3.5 w-3.5" />
                Bearbeiten
              </Link>
            </div>

            <div>
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                <User className="h-3.5 w-3.5" />
                Kunde
              </h3>
              {data.customer ? (
                <div className="mt-2 rounded-lg border border-border bg-background/60 p-3 text-sm">
                  <Link href={`/kunden/${data.customer.id}`} className="font-medium text-foreground hover:text-brand">
                    {data.customer.name}
                  </Link>
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

        {data.activeTab === "bearbeiten" && (
          <OrderForm
            action={data.editForm.updateAction}
            defaultValues={{
              title: order.title,
              description: order.description,
              order_kind: order.order_kind,
              priority: order.priority,
              status: order.status,
              customer_id: data.customer?.id ?? null,
              scheduled_date: order.scheduled_date,
              start_time: order.start_time,
              planned_duration_minutes: order.planned_duration_minutes,
            }}
            submitLabel="Änderungen speichern"
            customers={data.editForm.customers}
            employees={data.editForm.employees}
            vehicles={data.editForm.vehicles}
            machines={data.editForm.machines}
            selectedEmployeeIds={data.editForm.selectedEmployeeIds}
            selectedVehicleIds={data.editForm.selectedVehicleIds}
            selectedMachineIds={data.editForm.selectedMachineIds}
          />
        )}
      </div>
    </>
  );
}
