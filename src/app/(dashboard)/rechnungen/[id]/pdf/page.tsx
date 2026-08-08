import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { formatDate } from "@/lib/date";
import { formatEuro } from "@/lib/format";
import { INVOICE_KIND_LABELS, STATUS_BADGE_CLASS, STATUS_LABELS, calculateTotals, effectiveStatus } from "@/lib/invoices";
import { todayBerlinISO } from "@/lib/date";
import { PrintButton } from "@/components/dashboard/PrintButton";

/**
 * Druckfertige Angebots-/Rechnungsvorschau (Spec-Punkt 7). Es gibt keine
 * serverseitige PDF-Bibliothek und keinen Logo-Upload in diesem Projekt
 * (kein Einstellungen-Bereich für Firmenstammdaten) – daher ein
 * textbasierter Kopf mit dem Firmennamen statt eines echten Logos, und
 * "PDF speichern" läuft über den nativen Browser-Druckdialog (siehe
 * PrintButton).
 */
export default async function InvoicePdfPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getOrCreateProfile(supabase, user);
  if (!profile) redirect("/login?error=Profil+konnte+nicht+geladen+werden");

  const [{ data: invoice }, { data: company }] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, customers(name, contact_person, street, postal_code, city, email, phone), orders(title)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("companies").select("name").eq("id", profile.company_id).maybeSingle(),
  ]);

  if (!invoice) notFound();

  const { data: items } = await supabase.from("invoice_items").select("*").eq("invoice_id", id).order("position", { ascending: true });

  const totals = calculateTotals(items ?? [], Number(invoice.tax_rate ?? 19));
  const isQuote = invoice.kind === "angebot";
  const status = effectiveStatus({
    kind: invoice.kind,
    status: invoice.status,
    dueDate: invoice.due_date,
    validUntil: invoice.valid_until,
    todayISO: todayBerlinISO(),
  });
  const customer = invoice.customers as {
    name: string;
    contact_person: string | null;
    street: string | null;
    postal_code: string | null;
    city: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  const order = invoice.orders as { title: string } | null;

  return (
    <div className="mx-auto max-w-3xl p-6 print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href={`/rechnungen?panel=${id}`} className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Akte
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="flex items-start justify-between border-b border-border pb-6">
          <div>
            <p className="text-2xl font-bold tracking-tight text-foreground">{company?.name ?? "KanalPro"}</p>
            <p className="mt-1 text-xs text-muted">Rohr-, Kanal- und Industrieservice</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-foreground">{INVOICE_KIND_LABELS[invoice.kind] ?? invoice.kind}</p>
            <p className="text-sm text-muted">{invoice.invoice_number ?? "Ohne Nummer"}</p>
            <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-medium print:hidden ${STATUS_BADGE_CLASS[status] ?? "bg-gray-100 text-gray-600"}`}>
              {STATUS_LABELS[status] ?? status}
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Empfänger</p>
            <p className="mt-1 font-medium text-foreground">{customer?.name ?? "—"}</p>
            {customer?.contact_person && <p className="text-muted">{customer.contact_person}</p>}
            {customer?.street && <p className="text-muted">{customer.street}</p>}
            {(customer?.postal_code || customer?.city) && (
              <p className="text-muted">
                {customer?.postal_code ?? ""} {customer?.city ?? ""}
              </p>
            )}
            {order?.title && <p className="mt-1 text-muted">Projekt/Auftrag: {order.title}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Datum</p>
            <p className="mt-1 font-medium text-foreground">{invoice.issue_date ? formatDate(invoice.issue_date) : "—"}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">{isQuote ? "Gültig bis" : "Zahlungsziel"}</p>
            <p className="font-medium text-foreground">
              {isQuote ? (invoice.valid_until ? formatDate(invoice.valid_until) : "—") : invoice.due_date ? formatDate(invoice.due_date) : "—"}
            </p>
          </div>
        </div>

        <table className="mt-8 w-full text-left text-sm">
          <thead>
            <tr className="border-b-2 border-border text-xs uppercase text-muted">
              <th className="py-2 font-medium">Beschreibung</th>
              <th className="py-2 text-right font-medium">Menge</th>
              <th className="py-2 text-right font-medium">Einzelpreis</th>
              <th className="py-2 text-right font-medium">Summe</th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-muted">Keine Positionen erfasst.</td>
              </tr>
            )}
            {(items ?? []).map((item) => (
              <tr key={item.id} className="border-b border-border/60">
                <td className="py-2.5 text-foreground">{item.description}</td>
                <td className="py-2.5 text-right text-muted">{Number(item.quantity).toLocaleString("de-DE")}</td>
                <td className="py-2.5 text-right text-muted">{formatEuro(Number(item.unit_price))}</td>
                <td className="py-2.5 text-right font-medium text-foreground">{formatEuro(Number(item.quantity) * Number(item.unit_price))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <div className="w-64 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted">
              <span>Netto</span>
              <span>{formatEuro(totals.net)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>MwSt. ({Number(invoice.tax_rate ?? 19).toLocaleString("de-DE")}%)</span>
              <span>{formatEuro(totals.tax)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold text-foreground">
              <span>Gesamtsumme</span>
              <span>{formatEuro(totals.gross)}</span>
            </div>
            {!isQuote && Number(invoice.paid_amount) > 0 && (
              <>
                <div className="flex justify-between text-green-700">
                  <span>Bereits bezahlt</span>
                  <span>-{formatEuro(Number(invoice.paid_amount))}</span>
                </div>
                <div className="flex justify-between font-semibold text-foreground">
                  <span>Offener Betrag</span>
                  <span>{formatEuro(Math.max(0, totals.gross - Number(invoice.paid_amount)))}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-8 border-t border-border pt-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Notizen</p>
            <p className="mt-1 whitespace-pre-line text-foreground">{invoice.notes}</p>
          </div>
        )}

        <div className="mt-10 border-t border-border pt-4 text-xs text-muted">
          {isQuote
            ? "Dieses Angebot ist freibleibend und bis zum angegebenen Datum gültig."
            : "Bitte begleichen Sie den Rechnungsbetrag bis zum angegebenen Zahlungsziel."}
        </div>
      </div>
    </div>
  );
}
