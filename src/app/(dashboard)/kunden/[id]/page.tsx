import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Info,
  MapPin,
  MoreVertical,
  NotebookText,
  Paperclip,
  Plus,
  Receipt,
  Save,
  Trash2,
  User,
  Users,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  addCustomerContact,
  addCustomerNote,
  deleteCustomer,
  deleteCustomerContact,
  deleteCustomerDocument,
  duplicateCustomer,
  updateCustomer,
  uploadCustomerDocument,
} from "@/app/(dashboard)/kunden/actions";
import { CustomerForm } from "@/components/dashboard/CustomerForm";
import { CustomerContactForm } from "@/components/dashboard/CustomerContactForm";
import { CustomerNoteForm } from "@/components/dashboard/CustomerNoteForm";
import { CustomerDocumentForm } from "@/components/dashboard/CustomerDocumentForm";
import { CustomerKindIcon } from "@/components/dashboard/CustomerKindIcon";
import {
  CUSTOMER_KIND_LABELS,
  CUSTOMER_STATUS_BADGE_CLASS,
  CUSTOMER_STATUS_DOT_CLASS,
  CUSTOMER_STATUS_LABELS,
} from "@/lib/customers";

const TABS: Array<{ key: string; label: string; icon: LucideIcon }> = [
  { key: "allgemein", label: "Allgemein", icon: User },
  { key: "adressen", label: "Adressen", icon: MapPin },
  { key: "kontakte", label: "Ansprechpartner", icon: Users },
  { key: "auftraege", label: "Aufträge", icon: Wrench },
  { key: "rechnungen", label: "Abrechnung", icon: Receipt },
  { key: "dokumente", label: "Dokumente", icon: Paperclip },
  { key: "notizen", label: "Notizen & Verlauf", icon: NotebookText },
];

const FORM_ID_ALLGEMEIN = "customer-edit-allgemein";
const FORM_ID_ADRESSEN = "customer-edit-adressen";

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function KundeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    message?: string;
    tab?: string;
    draft?: string;
    duplicate?: string;
    matches?: string;
    missing?: string;
  }>;
}) {
  const { id } = await params;
  const { error, message, tab, draft, duplicate, matches, missing } = await searchParams;
  const activeTab = TABS.some((t) => t.key === tab) ? (tab as string) : "allgemein";

  const supabase = await createClient();
  const { data: customer } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();

  if (!customer) {
    notFound();
  }

  const updateWithId = updateCustomer.bind(null, id);
  const deleteWithId = deleteCustomer.bind(null, id);
  const duplicateWithId = duplicateCustomer.bind(null, id);

  let defaultValues: Record<string, unknown> = customer;
  if (draft) {
    try {
      defaultValues = JSON.parse(draft);
    } catch {
      // ignore malformed draft, fall back to stored customer data
    }
  }
  const duplicateWarning = duplicate === "1" && matches ? matches.split(";").map((m) => m.trim()) : undefined;
  const missingFields = missing ? missing.split(",") : undefined;

  const [creator, updater, { data: employees }] = await Promise.all([
    customer.created_by
      ? supabase.from("profiles").select("full_name").eq("id", customer.created_by).maybeSingle()
      : Promise.resolve({ data: null }),
    customer.updated_by
      ? supabase.from("profiles").select("full_name").eq("id", customer.updated_by).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("profiles").select("id, full_name").order("full_name", { ascending: true }),
  ]);

  let contacts: Array<{ id: string; name: string; role: string | null; phone: string | null; email: string | null; is_primary: boolean }> = [];
  let documents: Array<{ id: string; file_name: string; storage_path: string; size_bytes: number | null; created_at: string }> = [];
  let documentUrls: Record<string, string> = {};
  let notes: Array<{ id: string; note: string; created_at: string; author_id: string | null }> = [];
  let auditLog: Array<{ id: string; action: string; summary: string | null; created_at: string; actor_id: string | null }> = [];
  let authorNames: Record<string, string> = {};
  let orders: Array<{ id: string; title: string; status: string; scheduled_date: string | null }> = [];
  let invoices: Array<{ id: string; kind: string; invoice_number: string | null; status: string; issue_date: string }> = [];

  if (activeTab === "kontakte") {
    const { data } = await supabase
      .from("customer_contacts")
      .select("id, name, role, phone, email, is_primary")
      .eq("customer_id", id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    contacts = data ?? [];
  }

  if (activeTab === "auftraege") {
    const { data } = await supabase
      .from("orders")
      .select("id, title, status, scheduled_date")
      .eq("customer_id", id)
      .order("created_at", { ascending: false });
    orders = data ?? [];
  }

  if (activeTab === "rechnungen") {
    const { data } = await supabase
      .from("invoices")
      .select("id, kind, invoice_number, status, issue_date")
      .eq("customer_id", id)
      .order("created_at", { ascending: false });
    invoices = data ?? [];
  }

  if (activeTab === "dokumente") {
    const { data } = await supabase
      .from("customer_documents")
      .select("id, file_name, storage_path, size_bytes, created_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false });
    documents = data ?? [];

    if (documents.length > 0) {
      const { data: signed } = await supabase.storage
        .from("customer-documents")
        .createSignedUrls(documents.map((d) => d.storage_path), 60 * 10);
      documentUrls = Object.fromEntries(
        (signed ?? []).map((s) => [s.path ?? "", s.signedUrl]).filter(([path]) => path),
      );
    }
  }

  if (activeTab === "notizen") {
    const [{ data: noteData }, { data: auditData }] = await Promise.all([
      supabase
        .from("customer_notes")
        .select("id, note, created_at, author_id")
        .eq("customer_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("customer_audit_log")
        .select("id, action, summary, created_at, actor_id")
        .eq("customer_id", id)
        .order("created_at", { ascending: false }),
    ]);
    notes = noteData ?? [];
    auditLog = auditData ?? [];

    const authorIds = Array.from(
      new Set([...notes.map((n) => n.author_id), ...auditLog.map((a) => a.actor_id)].filter(Boolean) as string[]),
    );
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", authorIds);
      authorNames = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name ?? "Unbekannt"]));
    }
  }

  const showSaveButton = activeTab === "allgemein" || activeTab === "adressen";
  const saveFormId = activeTab === "adressen" ? FORM_ID_ADRESSEN : FORM_ID_ALLGEMEIN;

  return (
    <div className={`mx-auto max-w-6xl p-4 sm:p-6 ${showSaveButton ? "pb-28 lg:pb-6" : ""}`}>
      <Link href="/kunden" className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Kundenliste
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <CustomerKindIcon kind={customer.kind} className="h-5 w-5 text-muted" />
            <h1 className="text-2xl font-semibold tracking-tight">{customer.name}</h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${CUSTOMER_STATUS_BADGE_CLASS[customer.status] ?? "bg-gray-100 text-gray-600"}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${CUSTOMER_STATUS_DOT_CLASS[customer.status] ?? "bg-gray-400"}`} />
              {CUSTOMER_STATUS_LABELS[customer.status] ?? customer.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            {customer.customer_number ?? "ohne Nummer"} · {CUSTOMER_KIND_LABELS[customer.kind] ?? customer.kind}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showSaveButton && (
            <button
              type="submit"
              form={saveFormId}
              className="hidden items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark lg:inline-flex"
            >
              <Save className="h-4 w-4" />
              Speichern
            </button>
          )}
          <Link
            href={`/kunden/${id}?tab=${activeTab}`}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-background"
          >
            <X className="h-4 w-4" />
            Abbrechen
          </Link>
          <Link
            href={`/auftraege/neu?customer_id=${id}`}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-background"
          >
            <Wrench className="h-4 w-4" />
            Auftrag erstellen
          </Link>
          <div className="hidden gap-2 lg:flex">
            <form action={duplicateWithId}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-background"
              >
                <Copy className="h-4 w-4" />
                Duplizieren
              </button>
            </form>
            <form action={deleteWithId}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-card px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Löschen
              </button>
            </form>
          </div>
          {/* Auf Mobile werden die selteneren Aktionen in ein Menü eingeklappt,
              damit die Aktionsleiste nicht über mehrere Zeilen umbricht. */}
          <details className="relative lg:hidden">
            <summary className="flex list-none items-center rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-background [&::-webkit-details-marker]:hidden">
              <MoreVertical className="h-4 w-4" />
            </summary>
            <div className="absolute right-0 z-10 mt-2 w-48 rounded-lg border border-border bg-card p-1.5 shadow-lg">
              <form action={duplicateWithId}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-background"
                >
                  <Copy className="h-4 w-4" />
                  Duplizieren
                </button>
              </form>
              <form action={deleteWithId}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Löschen
                </button>
              </form>
            </div>
          </details>
        </div>
      </div>

      {message && <p className="mt-4 rounded-lg bg-brand-soft px-4 py-3 text-sm text-brand-dark">{message}</p>}
      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="mt-6 flex gap-2 overflow-x-auto border-b border-border pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.key}
              href={`/kunden/${id}?tab=${t.key}`}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${
                activeTab === t.key ? "bg-brand text-white" : "bg-card text-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </div>

      {showSaveButton && (
        <div
          className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 p-3 backdrop-blur lg:hidden"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <button
            type="submit"
            form={saveFormId}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"
          >
            <Save className="h-4 w-4" />
            Speichern
          </button>
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_300px] lg:items-start">
        <div>
          {activeTab === "allgemein" && (
            <CustomerForm
              formId={FORM_ID_ALLGEMEIN}
              action={updateWithId}
              defaultValues={defaultValues as never}
              submitLabel={duplicateWarning ? "Trotzdem speichern" : "Änderungen speichern"}
              duplicateWarning={duplicateWarning}
              missingFields={missingFields}
              section="allgemein"
              showProgress
              customerId={id}
              employees={employees ?? []}
            />
          )}

          {activeTab === "adressen" && (
            <CustomerForm
              formId={FORM_ID_ADRESSEN}
              action={updateWithId}
              defaultValues={defaultValues as never}
              submitLabel="Änderungen speichern"
              section="adressen"
              showProgress={false}
            />
          )}

          {activeTab === "kontakte" && (
            <div className="space-y-4">
              {contacts.length === 0 && (
                <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted">
                  Noch keine Ansprechpartner hinterlegt.
                </p>
              )}
              {contacts.map((c) => (
                <div key={c.id} className="flex items-start justify-between rounded-2xl border border-border bg-card p-4">
                  <div>
                    <p className="text-sm font-medium">
                      {c.name}
                      {c.is_primary && (
                        <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-dark">
                          Hauptkontakt
                        </span>
                      )}
                    </p>
                    {c.role && <p className="text-xs text-muted">{c.role}</p>}
                    <p className="mt-1 text-xs text-muted">{[c.phone, c.email].filter(Boolean).join(" · ") || "—"}</p>
                  </div>
                  <form action={deleteCustomerContact.bind(null, id, c.id)}>
                    <button
                      type="submit"
                      className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Entfernen
                    </button>
                  </form>
                </div>
              ))}
              <CustomerContactForm action={addCustomerContact.bind(null, id)} />
            </div>
          )}

          {activeTab === "auftraege" && (
            <div className="space-y-4">
              {orders.length === 0 && (
                <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted">
                  Noch keine Aufträge für diesen Kunden.
                </p>
              )}
              {orders.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                  <table className="w-full text-left text-sm">
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-3">
                            <Link href={`/auftraege/${o.id}`} className="font-medium text-foreground hover:text-brand">
                              {o.title}
                            </Link>
                            <p className="text-xs text-muted">{o.scheduled_date ? formatDateTime(o.scheduled_date) : "Kein Termin"}</p>
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-muted">{o.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Link
                href={`/auftraege/neu?customer_id=${id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                <Plus className="h-4 w-4" />
                Neuer Auftrag
              </Link>
            </div>
          )}

          {activeTab === "rechnungen" && (
            <div className="space-y-4">
              {invoices.length === 0 && (
                <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted">
                  Noch keine Angebote oder Rechnungen für diesen Kunden.
                </p>
              )}
              {invoices.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                  <table className="w-full text-left text-sm">
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-3">
                            <Link href={`/rechnungen/${inv.id}`} className="font-medium text-foreground hover:text-brand">
                              {inv.kind === "angebot" ? "Angebot" : "Rechnung"} {inv.invoice_number ?? ""}
                            </Link>
                            <p className="text-xs text-muted">{formatDateTime(inv.issue_date)}</p>
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-muted">{inv.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Link
                href={`/rechnungen/neu?customer_id=${id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                <Plus className="h-4 w-4" />
                Neues Angebot / Neue Rechnung
              </Link>
            </div>
          )}

          {activeTab === "dokumente" && (
            <div className="space-y-4">
              {documents.length === 0 && (
                <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted">
                  Noch keine Dokumente hochgeladen.
                </p>
              )}
              {documents.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                  <table className="w-full text-left text-sm">
                    <tbody>
                      {documents.map((d) => (
                        <tr key={d.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-3">
                            {documentUrls[d.storage_path] ? (
                              <a href={documentUrls[d.storage_path]} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">
                                {d.file_name}
                              </a>
                            ) : (
                              d.file_name
                            )}
                            <p className="text-xs text-muted">
                              {formatBytes(d.size_bytes)} · {formatDateTime(d.created_at)}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <form action={deleteCustomerDocument.bind(null, id, d.id, d.storage_path)}>
                              <button
                                type="submit"
                                className="ml-auto flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                              >
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
              <CustomerDocumentForm action={uploadCustomerDocument.bind(null, id)} />
            </div>
          )}

          {activeTab === "notizen" && (
            <div className="space-y-6">
              <div>
                <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                  <NotebookText className="h-4 w-4" />
                  Interne Notizen
                </h2>
                <div className="mt-3">
                  <CustomerNoteForm action={addCustomerNote.bind(null, id)} />
                </div>
                <div className="mt-4 space-y-3">
                  {notes.length === 0 && <p className="text-sm text-muted">Noch keine Notizen.</p>}
                  {notes.map((n) => (
                    <div key={n.id} className="rounded-lg border border-border bg-card p-3">
                      <p className="text-sm">{n.note}</p>
                      <p className="mt-1 text-xs text-muted">
                        {n.author_id ? authorNames[n.author_id] ?? "Unbekannt" : "Unbekannt"} · {formatDateTime(n.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                  <Info className="h-4 w-4" />
                  Änderungsverlauf (Audit-Log)
                </h2>
                <div className="mt-3 space-y-2">
                  {auditLog.length === 0 && <p className="text-sm text-muted">Noch keine Einträge.</p>}
                  {auditLog.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm">
                      <span>
                        <span className="font-medium">
                          {a.action === "created" ? "Angelegt" : a.action === "updated" ? "Aktualisiert" : "Gelöscht"}
                        </span>
                        {a.summary ? ` – ${a.summary}` : ""}
                      </span>
                      <span className="text-xs text-muted">
                        {a.actor_id ? authorNames[a.actor_id] ?? "Unbekannt" : "Unbekannt"} · {formatDateTime(a.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <Info className="h-4 w-4" />
              Kundenübersicht
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Kundennummer</dt>
                <dd className="mt-0.5 font-medium">{customer.customer_number ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Status</dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${CUSTOMER_STATUS_BADGE_CLASS[customer.status] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${CUSTOMER_STATUS_DOT_CLASS[customer.status] ?? "bg-gray-400"}`} />
                    {CUSTOMER_STATUS_LABELS[customer.status] ?? customer.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Erstellt am</dt>
                <dd className="mt-0.5">{formatDateTime(customer.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Erstellt von</dt>
                <dd className="mt-0.5">{creator.data?.full_name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Letzte Änderung</dt>
                <dd className="mt-0.5">{formatDateTime(customer.updated_at)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Geändert von</dt>
                <dd className="mt-0.5">{updater.data?.full_name ?? "—"}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <Zap className="h-4 w-4" />
              Schnellaktionen
            </h2>
            <div className="mt-3 flex flex-col gap-2">
              <Link
                href={`/auftraege/neu?customer_id=${id}`}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-background"
              >
                <Plus className="h-4 w-4" />
                Auftrag
              </Link>
              <Link
                href={`/rechnungen/neu?customer_id=${id}`}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-background"
              >
                <Plus className="h-4 w-4" />
                Angebot/Rechnung
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
