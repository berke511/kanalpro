import { ClipboardList, CalendarDays, Receipt, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { dateFromISO, todayBerlinISO } from "@/lib/date";
import { redirect } from "next/navigation";

// Wochenanfang/-ende relativ zum heutigen Kalendertag in Europe/Berlin (nicht
// Server-Prozesszeit) – identische Logik wie in der Einsatzplanung, siehe
// dort für die ausführliche Begründung.
function currentWeekRangeBerlin() {
  const today = dateFromISO(todayBerlinISO());
  const day = today.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setUTCDate(monday.getUTCDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  return { start: toISO(monday), end: toISO(sunday) };
}

const WORKFLOW = [
  "Kunde anlegen oder auswählen",
  "Auftrag erstellen",
  "Mitarbeiter, Fahrzeuge & Maschinen zuweisen",
  "Auftrag erscheint automatisch im Außendienst",
  "Arbeiten, Material & Zeiten vor Ort dokumentieren",
  "Kunde unterschreibt digital",
  "Büro erstellt Angebot, Rechnung oder Abschlussbericht",
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getOrCreateProfile(supabase, user);
  const { start: weekStart, end: weekEnd } = currentWeekRangeBerlin();

  const [openOrders, ordersThisWeek, employees, openInvoices] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "offen"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("scheduled_date", weekStart)
      .lte("scheduled_date", weekEnd),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("invoices").select("id", { count: "exact", head: true }).eq("status", "versendet"),
  ]);

  const KPI_CARDS = [
    { label: "Offene Aufträge", value: openOrders.count ?? 0, icon: ClipboardList },
    { label: "Aufträge diese Woche", value: ordersThisWeek.count ?? 0, icon: CalendarDays },
    { label: "Aktive Mitarbeiter", value: employees.count ?? 0, icon: Users },
    { label: "Offene Rechnungen", value: openInvoices.count ?? 0, icon: Receipt },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Willkommen{profile?.full_name ? `, ${profile.full_name}` : ""}
      </h1>
      <p className="mt-2 text-sm text-muted">
        Hier ist die Übersicht für {profile?.companies?.name ?? "Ihr Unternehmen"}.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_CARDS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="rounded-2xl border border-border bg-card shadow-sm p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <Icon className="h-4 w-4" />
              </span>
              <p className="mt-3 text-sm text-muted">{kpi.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{kpi.value}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card shadow-sm p-6">
        <h2 className="text-sm font-semibold">Ihr Arbeitsablauf in KanalPro</h2>
        <ol className="mt-4 space-y-3">
          {WORKFLOW.map((step, i) => (
            <li key={step} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                {i + 1}
              </span>
              <span className="pt-0.5 text-sm">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
