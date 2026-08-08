import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { formatEuro } from "@/lib/format";
import { monthRangeBerlin, todayBerlinISO } from "@/lib/date";
import { calculateTotals, daysBetweenISO } from "@/lib/invoices";
import { VerticalBarChart, HorizontalBarList, ProgressRing } from "@/components/dashboard/InvoiceCharts";

export default async function RechnungenStatistikenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await getOrCreateProfile(supabase, user);
  if (!profile) return null;

  const [{ data: invoices }, { data: items }] = await Promise.all([
    supabase.from("invoices").select("id, kind, status, customer_id, customers(name), issue_date, due_date, payment_date, paid_amount, tax_rate"),
    supabase.from("invoice_items").select("invoice_id, quantity, unit_price"),
  ]);

  const itemsByInvoiceId = new Map<string, Array<{ quantity: number; unit_price: number }>>();
  for (const it of items ?? []) {
    const list = itemsByInvoiceId.get(it.invoice_id) ?? [];
    list.push({ quantity: Number(it.quantity), unit_price: Number(it.unit_price) });
    itemsByInvoiceId.set(it.invoice_id, list);
  }

  const rows = (invoices ?? []).map((inv) => {
    const totals = calculateTotals(itemsByInvoiceId.get(inv.id) ?? [], Number(inv.tax_rate ?? 19));
    return { ...inv, customerName: (inv.customers as { name: string } | null)?.name ?? "Unbekannt", gross: totals.gross };
  });

  // 1) Umsatz pro Monat (letzte 6 Monate, bezahlte Rechnungen).
  const months = Array.from({ length: 6 }, (_, i) => monthRangeBerlin(-(5 - i)));
  const monthlyRevenue = months.map((m) => {
    const label = new Date(`${m.start}T00:00:00`).toLocaleDateString("de-DE", { month: "short" });
    const value = rows
      .filter((r) => r.kind === "rechnung" && r.status === "bezahlt")
      .filter((r) => {
        const d = r.payment_date ?? r.issue_date;
        return d && d >= m.start && d < m.end;
      })
      .reduce((sum, r) => sum + r.gross, 0);
    return { label, value };
  });

  // 2) Angebote → Annahmequote.
  const decidedQuotes = rows.filter((r) => r.kind === "angebot" && ["angenommen", "abgelehnt", "abgelaufen"].includes(r.status));
  const acceptedQuotes = decidedQuotes.filter((r) => r.status === "angenommen");
  const acceptanceRate = decidedQuotes.length > 0 ? (acceptedQuotes.length / decidedQuotes.length) * 100 : 0;

  // 3) Offene Rechnungen (nach Alter gestaffelt).
  const today = todayBerlinISO();
  const openBills = rows.filter((r) => r.kind === "rechnung" && ["offen", "teilbezahlt", "ueberfaellig"].includes(r.status));
  const ageBuckets = [
    { label: "Nicht fällig", min: -Infinity, max: 0 },
    { label: "1–14 Tage", min: 1, max: 14 },
    { label: "15–30 Tage", min: 15, max: 30 },
    { label: "31+ Tage", min: 31, max: Infinity },
  ];
  const openByAge = ageBuckets.map((b) => {
    const value = openBills
      .filter((r) => {
        if (!r.due_date) return b.label === "Nicht fällig";
        const overdueDays = daysBetweenISO(r.due_date, today);
        return overdueDays >= b.min && overdueDays <= b.max;
      })
      .reduce((sum, r) => sum + Math.max(0, r.gross - Number(r.paid_amount)), 0);
    return { label: b.label, value };
  });
  const openTotal = openBills.reduce((sum, r) => sum + Math.max(0, r.gross - Number(r.paid_amount)), 0);

  // 4) Zahlungsverhalten (bezahlte Rechnungen: pünktlich vs. verspätet).
  const paidWithDates = rows.filter((r) => r.kind === "rechnung" && r.status === "bezahlt" && r.due_date && r.payment_date);
  const behaviorBuckets = [
    { label: "Pünktlich / früh", test: (d: number) => d <= 0 },
    { label: "1–7 Tage zu spät", test: (d: number) => d >= 1 && d <= 7 },
    { label: "8–30 Tage zu spät", test: (d: number) => d >= 8 && d <= 30 },
    { label: "Über 30 Tage zu spät", test: (d: number) => d > 30 },
  ];
  const paymentBehavior = behaviorBuckets.map((b) => ({
    label: b.label,
    value: paidWithDates.filter((r) => b.test(daysBetweenISO(r.due_date!, r.payment_date!))).length,
  }));

  // 5) Top-Kunden (Gesamtumsatz, bezahlte Rechnungen).
  const revenueByCustomer = new Map<string, number>();
  for (const r of rows) {
    if (r.kind === "rechnung" && r.status === "bezahlt") {
      revenueByCustomer.set(r.customerName, (revenueByCustomer.get(r.customerName) ?? 0) + r.gross);
    }
  }
  const topCustomers = Array.from(revenueByCustomer.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value }));

  // 6) Umsatz nach Kunde (laufendes Jahr).
  const yearStart = `${new Date(`${today}T00:00:00`).getFullYear()}-01-01`;
  const revenueByCustomerYear = new Map<string, number>();
  for (const r of rows) {
    if (r.kind === "rechnung" && r.status === "bezahlt" && (r.payment_date ?? r.issue_date ?? "") >= yearStart) {
      revenueByCustomerYear.set(r.customerName, (revenueByCustomerYear.get(r.customerName) ?? 0) + r.gross);
    }
  }
  const revenueByCustomerThisYear = Array.from(revenueByCustomerYear.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));

  return (
    <div className="p-6">
      <Link href="/rechnungen" className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Übersicht
      </Link>
      <div className="mt-2 flex items-center gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-white shadow-md shadow-brand/20">
          <BarChart3 className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Statistiken</h1>
          <p className="mt-0.5 text-sm text-muted">Angebote &amp; Rechnungen</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Umsatz pro Monat</p>
          <p className="text-xs text-muted">Bezahlte Rechnungen, letzte 6 Monate</p>
          <div className="mt-4">
            <VerticalBarChart data={monthlyRevenue} formatValue={(v) => formatEuro(v)} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Angebote → Annahmequote</p>
          <div className="mt-4">
            <ProgressRing
              percent={acceptanceRate}
              label="Angenommen"
              sublabel={`${acceptedQuotes.length} von ${decidedQuotes.length} entschiedenen Angeboten`}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Offene Rechnungen nach Fälligkeit</p>
            <p className="text-sm font-semibold text-foreground">{formatEuro(openTotal)}</p>
          </div>
          <div className="mt-4">
            <HorizontalBarList data={openByAge} formatValue={(v) => formatEuro(v)} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Zahlungsverhalten</p>
          <p className="text-xs text-muted">Bezahlte Rechnungen nach Verzug zum Zahlungsziel</p>
          <div className="mt-4">
            <HorizontalBarList data={paymentBehavior} formatValue={(v) => `${v} Rechnung${v === 1 ? "" : "en"}`} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Top-Kunden</p>
          <p className="text-xs text-muted">Gesamtumsatz, bezahlte Rechnungen</p>
          <div className="mt-4">
            <HorizontalBarList data={topCustomers} formatValue={(v) => formatEuro(v)} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Umsatz nach Kunde</p>
          <p className="text-xs text-muted">Laufendes Jahr</p>
          <div className="mt-4">
            <HorizontalBarList data={revenueByCustomerThisYear} formatValue={(v) => formatEuro(v)} />
          </div>
        </div>
      </div>
    </div>
  );
}
