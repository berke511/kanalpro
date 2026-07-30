import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  addCustomerContact,
  addCustomerNote,
  deleteCustomer,
  deleteCustomerContact,
  deleteCustomerDocument,
  updateCustomer,
  uploadCustomerDocument,
} from "@/app/(dashboard)/kunden/actions";
import { CustomerForm } from "@/components/dashboard/CustomerForm";
import { CustomerContactForm } from "@/components/dashboard/CustomerContactForm";
import { CustomerNoteForm } from "@/components/dashboard/CustomerNoteForm";
import { CustomerDocumentForm } from "@/components/dashboard/CustomerDocumentForm";
import {
  CUSTOMER_KIND_LABELS,
  CUSTOMER_STATUS_BADGE_CLASS,
  CUSTOMER_STATUS_LABELS,
} from "@/lib/customers";

const TABS = [
  { key: "stammdaten", label: "Stammdaten" },
  { key: "kontakte", label: "Ansprechpartner" },
  { key: "dokumente", label: "Dokumente" },
  { key: "notizen", label: "Notizen & Verlauf" },
];

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
  }>;
}) {
  const { id } = await params;
  const { error, message, tab, draft, duplicate, matches } = await searchParams;
  const activeTab = TABS.some((t) => t.key === tab) ? (tab as string) : "stammdaten";

  const supabase = await createClient();
  const { data: customer } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();

  if (!customer) {
    notFound();
  }

  const updateWithId = updateCustomer.bind(null, id);
  const deleteWithId = deleteCustomer.bind(null, id);

  let defaultValues: Record<string, unknown> = customer;
  if (draft) {
    try {
      defaultValues = JSON.parse(draft);
    } catch {
      // ignore malformed draft, fall back to stored customer data
    }
  }
  const duplicateWarning = duplicate === "1" && matches ? matches.split(";").map((m) => m.trim()) : undefined;

  const [creator, updater] = await Promise.all([
    customer.created_by
      ? supabase.from("profiles").select("full_name").eq("id", customer.created_by).maybeSingle()
      : Promise.resolve({ data: null }),
    customer.updated_by
      ? supabase.from("profiles").select("full_name").eq("id", customer.updated_by).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  let contacts: Array<{ id: string; name: string; role: string | null; phone: string | null; email: string | null; is_primary: boolean }> = [];
  let documents: Array<{ id: string; file_name: string; storage_path: string; size_bytes: number | null; created_at: string }> = [];
  let documentUrls: Record<string, string> = {};
  let notes: Array<{ id: string; note: string; created_at: string; author_id: string | null }> = [];
  let auditLog: Array<{ id: string; action: string; summary: string | null; created_at: string; actor_id: string | null }> = [];
  let authorNames: Record<string, string> = {};

  if (activeTab === "kontakte") {
    const { data } = await supabase
      .from("customer_contacts")
      .select("id, name, role, phone, email, is_primary")
      .eq("customer_id", id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    contacts = data ?? [];
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

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link href="/kunden" className="text-sm text-muted hover:text-foreground">
        ← Zurück zur Kundenliste
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{customer.name}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${CUSTOMER_STATUS_BADGE_CLASS[customer.status] ?? "bg-gray-100 text-gray-600"}`}
            >
              {CUSTOMER_STATUS_LABELS[customer.status] ?? customer.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            {customer.customer_number ?? "ohne Nummer"} · {CUSTOMER_KIND_LABELS[customer.kind] ?? customer.kind}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/auftraege/neu?customer_id=${customer.id}`}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-background"
          >
            + Auftrag
          </Link>
          <Link
            href={`/rechnungen/neu?customer_id=${customer.id}`}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-background"
          >
            + Angebot/Rechnung
          </Link>
          <form action={deleteWithId}>
            <button
              type="submit"
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Löschen
            </button>
          </form>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        Erstellt {formatDateTime(customer.created_at)}
        {creator.data?.full_name ? ` von ${creator.data.full_name}` : ""} · Zuletzt geändert{" "}
        {formatDateTime(customer.updated_at)}
        {updater.data?.full_name ? ` von ${updater.data.full_name}` : ""}
      </p>

      {message && (
        <p className="mt-4 rounded-lg bg-brand-soft px-4 py-3 text-sm text-brand-dark">{message}</p>
      )}
      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="mt-6 flex flex-wrap gap-2 border-b border-border pb-3">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/kunden/${id}?tab=${t.key}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              activeTab === t.key ? "bg-brand text-white" : "bg-card text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {activeTab === "stammdaten" && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <CustomerForm
            action={updateWithId}
            defaultValues={defaultValues as never}
            submitLabel={duplicateWarning ? "Trotzdem speichern" : "Änderungen speichern"}
            duplicateWarning={duplicateWarning}
          />
        </div>
      )}

      {activeTab === "kontakte" && (
        <div className="mt-6 space-y-4">
          {contacts.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted">
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
                <p className="mt-1 text-xs text-muted">
                  {[c.phone, c.email].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <form action={deleteCustomerContact.bind(null, id, c.id)}>
                <button type="submit" className="text-xs font-medium text-red-600 hover:text-red-700">
                  Entfernen
                </button>
              </form>
            </div>
          ))}
          <CustomerContactForm action={addCustomerContact.bind(null, id)} />
        </div>
      )}

      {activeTab === "dokumente" && (
        <div className="mt-6 space-y-4">
          {documents.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted">
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
                          <a
                            href={documentUrls[d.storage_path]}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-brand hover:underline"
                          >
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
                          <button type="submit" className="text-xs font-medium text-red-600 hover:text-red-700">
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
        <div className="mt-6 space-y-6">
          <div>
            <h2 className="text-sm font-semibold">Interne Notizen</h2>
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
            <h2 className="text-sm font-semibold">Änderungsverlauf (Audit-Log)</h2>
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
  );
}
