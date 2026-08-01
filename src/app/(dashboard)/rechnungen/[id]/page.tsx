import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  addInvoiceItem,
  deleteInvoice,
  deleteInvoiceItem,
  updateInvoice,
} from "@/app/(dashboard)/rechnungen/actions";
import { InvoiceForm } from "@/components/dashboard/InvoiceForm";
import { InvoiceItemForm } from "@/components/dashboard/InvoiceItemForm";
import { INVOICE_KIND_LABELS } from "@/lib/invoices";

function formatEuro(value: number) {
  return value.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

export default async function RechnungDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { id } = await params;
  const { error, message } = await searchParams;

  const supabase = await createClient();
  const [{ data: invoice }, { data: items }, { data: orders }, { data: customers }] = await Promise.all([
    supabase.from("invoices").select("*").eq("id", id).maybeSingle(),
    supabase.from("invoice_items").select("*").eq("invoice_id", id).order("position", { ascending: true }),
    supabase.from("orders").select("id, title, customers(name)").order("created_at", { ascending: false }),
    supabase.from("customers").select("id, name").order("name", { ascending: true }),
  ]);

  if (!invoice) {
    notFound();
  }

  const updateWithId = updateInvoice.bind(null, id);
  const deleteWithId = deleteInvoice.bind(null, id);
  const addItemWithId = addInvoiceItem.bind(null, id);

  const total = (items ?? []).reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unit_price),
    0,
  );

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Link href="/rechnungen" className="text-sm text-muted hover:text-foreground">
        ← Zurück zur Übersicht
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {INVOICE_KIND_LABELS[invoice.kind] ?? invoice.kind} {invoice.invoice_number ? `– ${invoice.invoice_number}` : ""}
        </h1>
        <form action={deleteWithId}>
          <button
            type="submit"
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Löschen
          </button>
        </form>
      </div>

      {message && (
        <p className="mt-4 rounded-lg bg-brand-soft px-4 py-3 text-sm text-brand-dark">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-card shadow-sm p-6">
        <InvoiceForm
          action={updateWithId}
          defaultValues={invoice}
          submitLabel="Änderungen speichern"
          orders={(orders ?? []).map((o) => ({
            id: o.id,
            label: o.customers?.name ? `${o.title} (${o.customers.name})` : o.title,
          }))}
          customers={(customers ?? []).map((c) => ({ id: c.id, label: c.name }))}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card shadow-sm p-6">
        <h2 className="text-sm font-semibold">Positionen</h2>

        {(!items || items.length === 0) && (
          <p className="mt-3 text-sm text-muted">Noch keine Positionen hinzugefügt.</p>
        )}

        {items && items.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-background text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Beschreibung</th>
                  <th className="px-3 py-2 font-medium">Menge</th>
                  <th className="px-3 py-2 font-medium">Preis/Einheit</th>
                  <th className="px-3 py-2 font-medium">Summe</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{item.description}</td>
                    <td className="px-3 py-2 text-muted">{item.quantity}</td>
                    <td className="px-3 py-2 text-muted">{formatEuro(Number(item.unit_price))}</td>
                    <td className="px-3 py-2 font-medium">
                      {formatEuro(Number(item.quantity) * Number(item.unit_price))}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <form action={deleteInvoiceItem.bind(null, id, item.id)}>
                        <button type="submit" className="text-xs font-medium text-red-600 hover:text-red-700">
                          Entfernen
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-right text-sm font-semibold">
                    Gesamt
                  </td>
                  <td colSpan={2} className="px-3 py-2 text-sm font-semibold">
                    {formatEuro(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="mt-4">
          <InvoiceItemForm action={addItemWithId} />
        </div>
      </div>
    </div>
  );
}
