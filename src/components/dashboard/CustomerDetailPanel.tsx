"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Building2,
  Calendar,
  FileText,
  Mail,
  MapPin,
  NotebookText,
  Paperclip,
  Phone,
  Receipt,
  Trash2,
  User,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/date";
import { formatEuro } from "@/lib/format";
import {
  CUSTOMER_KIND_LABELS,
  CUSTOMER_STATUS_BADGE_CLASS,
  CUSTOMER_STATUS_DOT_CLASS,
  CUSTOMER_STATUS_LABELS,
  isCompanyKind,
} from "@/lib/customers";
import { CustomerPropertyForm } from "@/components/dashboard/CustomerPropertyForm";
import { CustomerDocumentForm } from "@/components/dashboard/CustomerDocumentForm";
import { CustomerNoteForm } from "@/components/dashboard/CustomerNoteForm";

export type PanelTabKey = "uebersicht" | "stammdaten" | "objekte" | "dokumente" | "aktivitaeten";

const TABS: Array<{ key: PanelTabKey; label: string; icon: LucideIcon }> = [
  { key: "uebersicht", label: "Übersicht", icon: User },
  { key: "stammdaten", label: "Stammdaten", icon: Building2 },
  { key: "objekte", label: "Objekte", icon: Boxes },
  { key: "dokumente", label: "Dokumente", icon: Paperclip },
  { key: "aktivitaeten", label: "Aktivitäten", icon: NotebookText },
];

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type CustomerDetailPanelData = {
  customer: {
    id: string;
    kind: string;
    status: string;
    name: string;
    customer_number: string | null;
    email: string | null;
    phone: string | null;
    mobile: string | null;
    website: string | null;
    street: string | null;
    postal_code: string | null;
    city: string | null;
    country: string;
    billing_street: string | null;
    billing_postal_code: string | null;
    billing_city: string | null;
    billing_same_as_main: boolean;
    service_street: string | null;
    service_postal_code: string | null;
    service_city: string | null;
    service_same_as_main: boolean;
    latitude: number | null;
    longitude: number | null;
    legal_form: string | null;
    vat_id: string | null;
    payment_term_days: number | null;
    debitor_number: string | null;
    tags: string[];
    created_at: string;
  };
  employeeName: string | null;
  primaryContact: { name: string; role: string | null; phone: string | null; email: string | null } | null;
  kpis: {
    objectsCount: number;
    revenue: number;
    quotesCount: number;
    invoicesCount: number;
    lastOrderDate: string | null;
  };
  activeTab: PanelTabKey;
  properties: Array<{
    id: string;
    name: string;
    street: string | null;
    postal_code: string | null;
    city: string | null;
    notes: string | null;
    deleteAction: (formData: FormData) => void;
  }>;
  documents: Array<{
    id: string;
    file_name: string;
    storage_path: string;
    size_bytes: number | null;
    created_at: string;
    url: string | null;
    deleteAction: (formData: FormData) => void;
  }>;
  activity: Array<{
    id: string;
    kind: "note" | "audit";
    text: string;
    authorName: string;
    createdAt: string;
  }>;
  hrefs: {
    close: string;
    tabs: Record<PanelTabKey, string>;
    fullProfile: string;
    editCustomer: string;
    newOrder: string;
    newQuote: string;
    newInvoice: string;
  };
  addPropertyAction: (formData: FormData) => void;
  addNoteAction: (formData: FormData) => void;
  uploadDocumentAction: (formData: FormData) => void;
};

export function CustomerDetailPanel({ data }: { data: CustomerDetailPanelData }) {
  const router = useRouter();
  const { customer } = data;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") router.push(data.hrefs.close);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router, data.hrefs.close]);

  const mainAddress = [customer.street, [customer.postal_code, customer.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  const fullAddress = [mainAddress, customer.country].filter(Boolean).join(", ");
  const hasCoords = customer.latitude != null && customer.longitude != null;

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
              <h2 className="break-words text-lg font-semibold tracking-tight">{customer.name}</h2>
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${CUSTOMER_STATUS_BADGE_CLASS[customer.status] ?? "bg-gray-100 text-gray-600"}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${CUSTOMER_STATUS_DOT_CLASS[customer.status] ?? "bg-gray-400"}`} />
                {CUSTOMER_STATUS_LABELS[customer.status] ?? customer.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">
              {customer.customer_number ?? "ohne Nummer"} · {CUSTOMER_KIND_LABELS[customer.kind] ?? customer.kind}
            </p>
          </div>
          <Link
            href={data.hrefs.close}
            aria-label="Schließen"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Link>
        </div>

        {/* Schnellaktionen: immer sichtbar, unabhängig vom aktiven Reiter */}
        <div className="grid grid-cols-3 gap-2 border-b border-border p-4 sm:grid-cols-4">
          <Link
            href={data.hrefs.newOrder}
            className="flex flex-col items-center gap-1 rounded-lg border border-border px-2 py-2.5 text-center text-xs font-medium hover:bg-background"
          >
            <Wrench className="h-4 w-4" />
            Auftrag
          </Link>
          <Link
            href={data.hrefs.newQuote}
            className="flex flex-col items-center gap-1 rounded-lg border border-border px-2 py-2.5 text-center text-xs font-medium hover:bg-background"
          >
            <FileText className="h-4 w-4" />
            Angebot
          </Link>
          <Link
            href={data.hrefs.newInvoice}
            className="flex flex-col items-center gap-1 rounded-lg border border-border px-2 py-2.5 text-center text-xs font-medium hover:bg-background"
          >
            <Receipt className="h-4 w-4" />
            Rechnung
          </Link>
          <Link
            href={data.hrefs.tabs.objekte}
            className="flex flex-col items-center gap-1 rounded-lg border border-border px-2 py-2.5 text-center text-xs font-medium hover:bg-background"
          >
            <Boxes className="h-4 w-4" />
            Objekt
          </Link>
          <Link
            href={data.hrefs.editCustomer}
            className="flex flex-col items-center gap-1 rounded-lg border border-border px-2 py-2.5 text-center text-xs font-medium hover:bg-background"
          >
            <Building2 className="h-4 w-4" />
            Bearbeiten
          </Link>
          {customer.email ? (
            <a
              href={`mailto:${customer.email}`}
              className="flex flex-col items-center gap-1 rounded-lg border border-border px-2 py-2.5 text-center text-xs font-medium hover:bg-background"
            >
              <Mail className="h-4 w-4" />
              E-Mail
            </a>
          ) : (
            <span className="flex flex-col items-center gap-1 rounded-lg border border-border/50 px-2 py-2.5 text-center text-xs font-medium text-muted/40">
              <Mail className="h-4 w-4" />
              E-Mail
            </span>
          )}
          {customer.phone || customer.mobile ? (
            <a
              href={`tel:${customer.phone ?? customer.mobile}`}
              className="flex flex-col items-center gap-1 rounded-lg border border-border px-2 py-2.5 text-center text-xs font-medium hover:bg-background"
            >
              <Phone className="h-4 w-4" />
              Anrufen
            </a>
          ) : (
            <span className="flex flex-col items-center gap-1 rounded-lg border border-border/50 px-2 py-2.5 text-center text-xs font-medium text-muted/40">
              <Phone className="h-4 w-4" />
              Anrufen
            </span>
          )}
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
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Objekte", value: data.kpis.objectsCount },
                  { label: "Umsatz", value: data.kpis.revenue > 0 ? formatEuro(data.kpis.revenue) : "—" },
                  { label: "Angebote", value: data.kpis.quotesCount },
                  { label: "Rechnungen", value: data.kpis.invoicesCount },
                ].map((kpi) => (
                  <div key={kpi.label} className="rounded-xl border border-border bg-background/60 p-3">
                    <p className="text-xs text-muted">{kpi.label}</p>
                    <p className="mt-0.5 text-base font-semibold tabular-nums">{kpi.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  <User className="h-3.5 w-3.5" />
                  Ansprechpartner
                </h3>
                {data.primaryContact ? (
                  <div className="mt-2 rounded-lg border border-border bg-background/60 p-3 text-sm">
                    <p className="font-medium">{data.primaryContact.name}</p>
                    {data.primaryContact.role && <p className="text-xs text-muted">{data.primaryContact.role}</p>}
                    <p className="mt-1 text-xs text-muted">
                      {[data.primaryContact.phone, data.primaryContact.email].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted">Kein Ansprechpartner hinterlegt.</p>
                )}
              </div>

              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  <Phone className="h-3.5 w-3.5" />
                  Kontaktdaten
                </h3>
                <p className="mt-2 text-sm">{customer.email || "—"}</p>
                <p className="text-sm text-muted">{customer.phone || customer.mobile || "—"}</p>
              </div>

              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  <MapPin className="h-3.5 w-3.5" />
                  Adresse
                </h3>
                <p className="mt-2 text-sm">{fullAddress || "Keine Adresse hinterlegt"}</p>
                {hasCoords ? (
                  <div className="mt-2 overflow-hidden rounded-lg border border-border">
                    <iframe
                      title="Kartenansicht"
                      className="h-40 w-full"
                      loading="lazy"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${customer.longitude! - 0.006}%2C${customer.latitude! - 0.004}%2C${customer.longitude! + 0.006}%2C${customer.latitude! + 0.004}&layer=mapnik&marker=${customer.latitude}%2C${customer.longitude}`}
                    />
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${customer.latitude}&mlon=${customer.longitude}#map=17/${customer.latitude}/${customer.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block bg-background/60 px-3 py-1.5 text-center text-xs font-medium text-brand hover:underline"
                    >
                      Größere Karte öffnen
                    </a>
                  </div>
                ) : (
                  fullAddress && <p className="mt-1 text-xs text-muted">Keine Kartenansicht verfügbar (keine Koordinaten hinterlegt).</p>
                )}
              </div>

              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  <Calendar className="h-3.5 w-3.5" />
                  Letzter Auftrag
                </h3>
                <p className="mt-2 text-sm">{data.kpis.lastOrderDate ? formatDate(data.kpis.lastOrderDate) : "—"}</p>
              </div>
            </div>
          )}

          {data.activeTab === "stammdaten" && (
            <div className="space-y-5">
              <Link
                href={data.hrefs.editCustomer}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
              >
                Stammdaten bearbeiten
              </Link>

              <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">Kundenart</dt>
                  <dd className="mt-0.5">{CUSTOMER_KIND_LABELS[customer.kind] ?? customer.kind}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">Kundennummer</dt>
                  <dd className="mt-0.5">{customer.customer_number ?? "—"}</dd>
                </div>
                {isCompanyKind(customer.kind) && (
                  <>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted">Rechtsform</dt>
                      <dd className="mt-0.5">{customer.legal_form ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted">USt-IdNr.</dt>
                      <dd className="mt-0.5">{customer.vat_id ?? "—"}</dd>
                    </div>
                  </>
                )}
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">Zahlungsziel</dt>
                  <dd className="mt-0.5">{customer.payment_term_days ? `${customer.payment_term_days} Tage` : "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">Debitorennummer</dt>
                  <dd className="mt-0.5">{customer.debitor_number ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">Website</dt>
                  <dd className="mt-0.5 break-words">{customer.website ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">Verantwortlicher</dt>
                  <dd className="mt-0.5">{data.employeeName ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">Angelegt am</dt>
                  <dd className="mt-0.5">{formatDateTime(customer.created_at)}</dd>
                </div>
              </dl>

              {customer.tags.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Tags</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {customer.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-dark">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Hauptadresse</p>
                  <p className="mt-1 text-sm">{fullAddress || "—"}</p>
                </div>
                {!customer.billing_same_as_main && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Rechnungsadresse</p>
                    <p className="mt-1 text-sm">
                      {[customer.billing_street, [customer.billing_postal_code, customer.billing_city].filter(Boolean).join(" ")]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </p>
                  </div>
                )}
                {!customer.service_same_as_main && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Einsatzadresse</p>
                    <p className="mt-1 text-sm">
                      {[customer.service_street, [customer.service_postal_code, customer.service_city].filter(Boolean).join(" ")]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {data.activeTab === "objekte" && (
            <div className="space-y-4">
              {data.properties.length === 0 && (
                <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted">
                  Noch keine Objekte (Einsatzorte/Liegenschaften) hinterlegt.
                </p>
              )}
              {data.properties.map((p) => (
                <div key={p.id} className="flex items-start justify-between rounded-xl border border-border bg-background/60 p-3">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="mt-1 text-xs text-muted">
                      {[p.street, [p.postal_code, p.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "—"}
                    </p>
                    {p.notes && <p className="mt-1 text-xs text-muted">{p.notes}</p>}
                  </div>
                  <form action={p.deleteAction}>
                    <button type="submit" className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700">
                      <Trash2 className="h-3.5 w-3.5" />
                      Entfernen
                    </button>
                  </form>
                </div>
              ))}
              <CustomerPropertyForm action={data.addPropertyAction} />
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
                              {formatBytes(d.size_bytes)} · {formatDateTime(d.created_at)}
                            </p>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <form action={d.deleteAction}>
                              <button type="submit" className="ml-auto flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700">
                                <Trash2 className="h-3.5 w-3.5" />
                                Löschen
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <CustomerDocumentForm action={data.uploadDocumentAction} />
            </div>
          )}

          {data.activeTab === "aktivitaeten" && (
            <div className="space-y-4">
              <CustomerNoteForm action={data.addNoteAction} />
              {data.activity.length === 0 && <p className="text-sm text-muted">Noch keine Aktivitäten.</p>}
              {data.activity.map((item) => (
                <div key={item.id} className="rounded-lg border border-border bg-background/60 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.kind === "note" ? "bg-brand-soft text-brand-dark" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {item.kind === "note" ? "Notiz" : "System"}
                    </span>
                    <span className="text-xs text-muted">
                      {item.authorName} · {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1.5 break-words">{item.text}</p>
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
