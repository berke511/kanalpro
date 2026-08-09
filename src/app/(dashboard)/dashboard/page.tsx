import Link from "next/link";
import {
  ClipboardList,
  CalendarDays,
  Receipt,
  Users,
  UserCog,
  Truck,
  Package,
  FileText,
  MessageSquare,
  UserPlus,
  FilePlus2,
  Send,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { dateFromISO, todayBerlinISO, yesterdayBerlinISO, monthRangeBerlin, formatDate, formatTime } from "@/lib/date";
import { redirect } from "next/navigation";
import { formatEuro } from "@/lib/format";
import { calculateTotals, daysBetweenISO, isBillOverdue, initialsFor, QUOTE_PENDING_STATUSES, BILL_OPEN_STATUSES } from "@/lib/invoices";
import { FLEET_STATUS_LABELS, FLEET_STATUS_BADGE_CLASS } from "@/lib/fleet";
import { EMPLOYEE_STATUS_LABELS, EMPLOYEE_STATUS_DOT_CLASS } from "@/lib/employees";
import { listMyConversations } from "@/lib/messaging";

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

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const WORKFLOW = [
  "Kunde anlegen oder auswählen",
  "Auftrag erstellen",
  "Mitarbeiter, Fahrzeuge & Maschinen zuweisen",
  "Auftrag erscheint automatisch im Außendienst",
  "Arbeiten, Material & Zeiten vor Ort dokumentieren",
  "Kunde unterschreibt digital",
  "Büro erstellt Angebot, Rechnung oder Abschlussbericht",
];

const QUICK_ACTIONS = [
  { label: "Neuer Auftrag", href: "/auftraege/neu", icon: ClipboardList, gradient: "from-indigo-400 to-indigo-700" },
  { label: "Neuer Kunde", href: "/kunden/neu", icon: UserPlus, gradient: "from-blue-400 to-blue-700" },
  { label: "Einsatz planen", href: "/einsatzplanung", icon: CalendarDays, gradient: "from-cyan-400 to-cyan-700" },
  { label: "Rechnung erstellen", href: "/rechnungen/neu", icon: FilePlus2, gradient: "from-amber-400 to-amber-700" },
  { label: "Nachricht senden", href: "/nachrichten/neu", icon: Send, gradient: "from-brand to-brand-dark" },
];

function customerLabel(c: { name: string | null; company_name: string | null } | null): string {
  if (!c) return "Unbekannter Kunde";
  return c.company_name?.trim() || c.name?.trim() || "Unbekannter Kunde";
}

function dayTag(diffDays: number): { text: string; className: string } {
  if (diffDays <= 0) return { text: diffDays === 0 ? "HEUTE" : "ÜBERFÄLLIG", className: "bg-red-50 text-red-700" };
  if (diffDays <= 21) return { text: `${diffDays} T.`, className: "bg-amber-50 text-amber-700" };
  return { text: `${diffDays} T.`, className: "bg-background text-muted" };
}

function activityDayLabel(iso: string, todayISO: string, yesterdayISO: string): string {
  const day = iso.slice(0, 10);
  if (day === todayISO) return "Heute";
  if (day === yesterdayISO) return "Gestern";
  return formatDate(iso);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getOrCreateProfile(supabase, user);
  if (!profile) {
    redirect("/login");
  }

  const todayISO = todayBerlinISO();
  const yesterdayISO = yesterdayBerlinISO();
  const { start: weekStart, end: weekEnd } = currentWeekRangeBerlin();
  const { start: monthStart, end: monthEnd } = monthRangeBerlin(0);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = dateFromISO(weekStart);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const last7Dates = Array.from({ length: 7 }, (_, i) => {
    const d = dateFromISO(todayISO);
    d.setUTCDate(d.getUTCDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const [
    { data: customers },
    { data: orders },
    { data: profiles },
    { data: fleetItems },
    { count: materialsTotalCount },
    { data: lowStockMaterials },
    { count: reportsTotalCount },
    { count: reportsWeekCount },
    { data: invoices },
    { data: invoiceItems },
    { data: invoiceHistory },
    { data: customerAudit },
    conversations,
  ] = await Promise.all([
    supabase.from("customers").select("id, created_at").eq("is_archived", false),
    supabase
      .from("orders")
      .select("id, title, order_kind, status, priority, scheduled_date, start_time, completed_at, customer_id, customers(name, company_name)")
      .eq("is_archived", false),
    supabase.from("profiles").select("id, full_name, status").eq("is_archived", false).order("full_name", { ascending: true }),
    supabase
      .from("fleet_items")
      .select("id, name, license_plate, kind, status, tuv_due_date, next_maintenance_at")
      .eq("is_archived", false)
      .order("name", { ascending: true }),
    supabase.from("materials").select("id", { count: "exact", head: true }).eq("is_archived", false),
    supabase
      .from("materials")
      .select("id, name, quantity, min_quantity, unit")
      .eq("is_archived", false)
      .eq("status", "niedriger_bestand")
      .order("quantity", { ascending: true })
      .limit(5),
    supabase.from("service_reports").select("id", { count: "exact", head: true }),
    supabase.from("service_reports").select("id", { count: "exact", head: true }).gte("created_at", weekStart),
    supabase
      .from("invoices")
      .select("id, kind, status, customer_id, customers(name, company_name), issue_date, due_date, payment_date, paid_amount, tax_rate, sent_at, invoice_number")
      .eq("is_archived", false),
    supabase.from("invoice_items").select("invoice_id, quantity, unit_price"),
    supabase.from("invoice_history").select("id, invoice_label, action, summary, actor_id, created_at").order("created_at", { ascending: false }).limit(6),
    supabase.from("customer_audit_log").select("id, customer_label, action, summary, actor_id, created_at").order("created_at", { ascending: false }).limit(6),
    listMyConversations(supabase, profile.id),
  ]);

  const ordersList = orders ?? [];
  const activeStatuses = new Set(["abgeschlossen", "storniert"]);
  const openOrders = ordersList.filter((o) => !activeStatuses.has(o.status));
  const highPriorityOrders = openOrders.filter((o) => o.priority === "zeitkritisch" || o.priority === "notfall");
  const ordersThisWeek = ordersList.filter((o) => o.scheduled_date && o.scheduled_date >= weekStart && o.scheduled_date <= weekEnd);
  const todayOrders = ordersList
    .filter((o) => o.scheduled_date === todayISO)
    .sort((a, b) => (a.start_time ?? "99:99").localeCompare(b.start_time ?? "99:99"));
  const todayOrderIds = todayOrders.map((o) => o.id);

  const [{ data: todayAssignments }, { data: todayResources }] = await Promise.all([
    todayOrderIds.length > 0
      ? supabase.from("order_assignments").select("order_id, profiles!order_assignments_employee_id_fkey(full_name)").in("order_id", todayOrderIds)
      : Promise.resolve({ data: [] as Array<{ order_id: string; profiles: { full_name: string | null } | null }> }),
    todayOrderIds.length > 0
      ? supabase.from("order_resources").select("order_id, fleet_items(name, license_plate)").in("order_id", todayOrderIds)
      : Promise.resolve({ data: [] as Array<{ order_id: string; fleet_items: { name: string | null; license_plate: string | null } | null }> }),
  ]);

  const employeesByOrder = new Map<string, string[]>();
  for (const a of todayAssignments ?? []) {
    const list = employeesByOrder.get(a.order_id) ?? [];
    if (a.profiles?.full_name) list.push(a.profiles.full_name);
    employeesByOrder.set(a.order_id, list);
  }
  const vehiclesByOrder = new Map<string, string[]>();
  for (const r of todayResources ?? []) {
    const list = vehiclesByOrder.get(r.order_id) ?? [];
    if (r.fleet_items?.name) list.push(r.fleet_items.name);
    vehiclesByOrder.set(r.order_id, list);
  }

  const weekCounts = weekDates.map((d) => ordersList.filter((o) => o.scheduled_date === d).length);
  const trendCounts = last7Dates.map((d) => ordersList.filter((o) => o.scheduled_date === d).length);
  const trendMax = Math.max(1, ...trendCounts);

  const profilesList = profiles ?? [];
  const profilesMap = new Map(profilesList.map((p) => [p.id, p.full_name]));
  const employeesEinsatz = profilesList.filter((p) => p.status === "einsatz");
  const employeesVacation = profilesList.filter((p) => p.status === "urlaub");
  const teamHeute = [...profilesList].sort((a, b) => (a.status === "einsatz" ? -1 : 1) - (b.status === "einsatz" ? -1 : 1)).slice(0, 5);

  const fleetList = fleetItems ?? [];
  const fleetEinsatz = fleetList.filter((f) => f.status === "im_einsatz");
  const fleetWartung = fleetList.filter((f) => f.status === "wartung" || f.status === "werkstatt");
  const fleetStatusList = [...fleetList]
    .sort((a, b) => (a.status === "im_einsatz" ? -1 : 1) - (b.status === "im_einsatz" ? -1 : 1))
    .slice(0, 4);

  const fahrzeugAuslastung = fleetList.length > 0 ? (fleetEinsatz.length / fleetList.length) * 100 : 0;
  const mitarbeiterAuslastung = profilesList.length > 0 ? (employeesEinsatz.length / profilesList.length) * 100 : 0;

  const itemsByInvoiceId = new Map<string, Array<{ quantity: number; unit_price: number }>>();
  for (const it of invoiceItems ?? []) {
    const list = itemsByInvoiceId.get(it.invoice_id) ?? [];
    list.push({ quantity: Number(it.quantity), unit_price: Number(it.unit_price) });
    itemsByInvoiceId.set(it.invoice_id, list);
  }
  const invoiceRows = (invoices ?? []).map((inv) => {
    const totals = calculateTotals(itemsByInvoiceId.get(inv.id) ?? [], Number(inv.tax_rate ?? 19));
    return { ...inv, customerName: customerLabel(inv.customers as { name: string | null; company_name: string | null } | null), gross: totals.gross };
  });

  const bills = invoiceRows.filter((r) => r.kind === "rechnung");
  const openBills = bills.filter((r) => BILL_OPEN_STATUSES.includes(r.status) || r.status === "ueberfaellig");
  const openAmount = openBills.reduce((sum, r) => sum + Math.max(0, r.gross - Number(r.paid_amount)), 0);
  const overdueBills = openBills
    .filter((r) => r.status === "ueberfaellig" || isBillOverdue(r.status, r.due_date, todayISO))
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));

  const monthlyRevenue = bills
    .filter((r) => r.status === "bezahlt")
    .filter((r) => {
      const d = r.payment_date ?? r.issue_date;
      return d && d >= monthStart && d < monthEnd;
    })
    .reduce((sum, r) => sum + r.gross, 0);

  const revenueByCustomerThisMonth = new Map<string, number>();
  for (const r of bills) {
    if (r.status !== "bezahlt") continue;
    const d = r.payment_date ?? r.issue_date;
    if (!d || d < monthStart || d >= monthEnd) continue;
    revenueByCustomerThisMonth.set(r.customerName, (revenueByCustomerThisMonth.get(r.customerName) ?? 0) + r.gross);
  }
  const topCustomers = Array.from(revenueByCustomerThisMonth.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const openQuotes = invoiceRows
    .filter((r) => r.kind === "angebot" && QUOTE_PENDING_STATUSES.includes(r.status))
    .sort((a, b) => (a.sent_at ?? a.issue_date ?? "").localeCompare(b.sent_at ?? b.issue_date ?? ""))
    .slice(0, 3);

  // Fälligkeiten: überfällige Rechnung, nächste TÜV-Frist, nächste Wartung.
  type DueEntry = { dateISO: string; text: string; sub: string };
  const dueEntries: DueEntry[] = [];
  if (overdueBills[0]) {
    const b = overdueBills[0];
    dueEntries.push({
      dateISO: b.due_date ?? todayISO,
      text: `Rechnung #${b.invoice_number} überfällig`,
      sub: `${b.customerName} · ${formatEuro(Math.max(0, b.gross - Number(b.paid_amount)))}`,
    });
  }
  for (const f of fleetList) {
    if (f.tuv_due_date && daysBetweenISO(todayISO, f.tuv_due_date) <= 45) {
      dueEntries.push({ dateISO: f.tuv_due_date, text: `TÜV ${f.name} läuft ab`, sub: "Fahrzeuge & Maschinen" });
    }
    if (f.next_maintenance_at && daysBetweenISO(todayISO, f.next_maintenance_at) <= 45) {
      dueEntries.push({ dateISO: f.next_maintenance_at, text: `Wartung ${f.name} fällig`, sub: "Fahrzeuge & Maschinen" });
    }
  }
  dueEntries.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const dueList = dueEntries.slice(0, 3);

  // Letzte Aktivitäten: Rechnungs-/Kundenverlauf + kürzlich abgeschlossene Aufträge zusammengeführt.
  type ActivityEntry = { text: string; createdAt: string };
  const activities: ActivityEntry[] = [];
  for (const h of invoiceHistory ?? []) {
    const actor = h.actor_id ? profilesMap.get(h.actor_id) ?? "Jemand" : "System";
    activities.push({ text: `${actor}: ${h.summary ?? h.action} (${h.invoice_label ?? "Beleg"})`, createdAt: h.created_at });
  }
  for (const c of customerAudit ?? []) {
    const actor = c.actor_id ? profilesMap.get(c.actor_id) ?? "Jemand" : "System";
    activities.push({ text: `${actor}: ${c.summary ?? c.action} (${c.customer_label ?? "Kunde"})`, createdAt: c.created_at });
  }
  for (const o of ordersList) {
    if (o.completed_at) {
      activities.push({ text: `Auftrag „${o.title}" wurde abgeschlossen`, createdAt: o.completed_at });
    }
  }
  activities.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const recentActivities = activities.slice(0, 6);

  const unreadConversations = conversations.filter((c) => c.unread);

  const KPI_CARDS = [
    { label: "Offene Aufträge", value: openOrders.length, sub: `${highPriorityOrders.length} hohe Priorität`, icon: ClipboardList, gradient: "from-indigo-400 to-indigo-700", warn: highPriorityOrders.length > 0 },
    { label: "Aufträge diese Woche", value: ordersThisWeek.length, sub: `${todayOrders.length} heute geplant`, icon: CalendarDays, gradient: "from-emerald-400 to-emerald-700", warn: false },
    { label: "Aktive Mitarbeiter", value: profilesList.length, sub: `${employeesEinsatz.length} aktuell im Einsatz`, icon: Users, gradient: "from-purple-400 to-purple-700", warn: false },
    { label: "Offene Rechnungen", value: openBills.length, sub: overdueBills.length > 0 ? `${overdueBills.length} überfällig` : "keine überfällig", icon: Receipt, gradient: "from-amber-400 to-amber-700", warn: overdueBills.length > 0 },
  ];

  const MODULE_GROUPS = [
    {
      title: "Betrieb",
      items: [
        { name: "Kunden", href: "/kunden", value: String(customers?.length ?? 0), sub: `${(customers ?? []).filter((c) => c.created_at >= monthStart).length} neue diesen Monat`, icon: Users, gradient: "from-blue-400 to-blue-700" },
        { name: "Aufträge", href: "/auftraege", value: `${openOrders.length} offen`, sub: `${ordersList.length} insgesamt`, icon: ClipboardList, gradient: "from-indigo-400 to-indigo-700" },
        { name: "Einsatzplanung", href: "/einsatzplanung", value: `${todayOrders.length} heute`, sub: `${ordersThisWeek.length} diese Woche`, icon: CalendarDays, gradient: "from-cyan-400 to-cyan-700" },
      ],
    },
    {
      title: "Ressourcen",
      items: [
        { name: "Mitarbeiter", href: "/mitarbeiter", value: String(profilesList.length), sub: `${employeesVacation.length} im Urlaub`, icon: UserCog, gradient: "from-purple-400 to-purple-700" },
        { name: "Fahrzeuge", href: "/fahrzeuge", value: String(fleetList.length), sub: `${fleetWartung.length} in Wartung`, icon: Truck, gradient: "from-orange-400 to-orange-700" },
        { name: "Material", href: "/material", value: String(materialsTotalCount ?? 0), sub: `${(lowStockMaterials ?? []).length} knapp`, icon: Package, gradient: "from-teal-400 to-teal-700" },
      ],
    },
    {
      title: "Abschluss & Kommunikation",
      items: [
        { name: "Einsatzberichte", href: "/berichte", value: String(reportsTotalCount ?? 0), sub: `${reportsWeekCount ?? 0} diese Woche`, icon: FileText, gradient: "from-slate-400 to-slate-700" },
        { name: "Angebote & Rechnungen", href: "/rechnungen", value: formatEuro(openAmount), sub: `${openBills.length} offen, ${overdueBills.length} überfällig`, icon: Receipt, gradient: "from-amber-400 to-amber-700" },
        { name: "Nachrichten", href: "/nachrichten", value: String(unreadConversations.length), sub: "ungelesen", icon: MessageSquare, gradient: "from-brand to-brand-dark" },
      ],
    },
  ];

  return (
    <div className="p-4 sm:p-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#3a63ff] via-[#3151e6] to-[#5b3ec9] px-6 py-8 text-white shadow-lg shadow-brand/25 sm:px-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full bg-white/20 blur-2xl" />
        <div className="pointer-events-none absolute bottom-[-90px] left-[22%] h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-[27px]">
              Willkommen{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
            </h1>
            <p className="mt-1.5 text-sm text-white/80">
              {new Date(`${todayISO}T00:00:00`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} ·{" "}
              {profile?.companies?.name ?? "Ihr Unternehmen"}
            </p>
          </div>
          <div className="flex gap-7">
            <div className="text-right">
              <div className="text-2xl font-bold tracking-tight sm:text-[26px]">{openOrders.length}</div>
              <div className="mt-0.5 text-[11px] text-white/75">Offene Aufträge</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold tracking-tight sm:text-[26px]">{todayOrders.length}</div>
              <div className="mt-0.5 text-[11px] text-white/75">Einsätze heute</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold tracking-tight sm:text-[26px]">{formatEuro(monthlyRevenue)}</div>
              <div className="mt-0.5 text-[11px] text-white/75">Umsatz diesen Monat</div>
            </div>
          </div>
        </div>
        <div className="relative z-10 mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold backdrop-blur-sm">
            {ordersThisWeek.length} Aufträge diese Woche geplant
          </span>
          <span className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold backdrop-blur-sm">
            {fleetEinsatz.length} von {fleetList.length} Fahrzeugen im Einsatz
          </span>
          {unreadConversations.length > 0 && (
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold backdrop-blur-sm">
              {unreadConversations.length} neue Nachricht{unreadConversations.length === 1 ? "" : "en"}
            </span>
          )}
          {openQuotes.length > 0 && (
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold backdrop-blur-sm">
              {openQuotes.length} offene Angebote warten auf Antwort
            </span>
          )}
        </div>
      </div>

      {/* Schnellaktionen */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {QUICK_ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.label}
              href={a.href}
              className="flex items-center gap-2.5 rounded-2xl border border-border bg-card p-3.5 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${a.gradient} text-white shadow-sm`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-[12.5px] font-semibold">{a.label}</span>
            </Link>
          );
        })}
      </div>

      {/* KPI-Kacheln */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_CARDS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="rounded-2xl border border-border bg-card p-[18px] shadow-sm">
              <span className={`flex h-9 w-9 items-center justify-center rounded-[11px] bg-gradient-to-br ${kpi.gradient} text-white shadow-md`}>
                <Icon className="h-4 w-4" />
              </span>
              <p className="mt-3.5 text-2xl font-bold tracking-tight tabular-nums">{kpi.value}</p>
              <p className="mt-0.5 text-xs text-muted">{kpi.label}</p>
              <p className={`mt-2 text-[11px] font-semibold ${kpi.warn ? "text-amber-700" : "text-muted-2"}`}>{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.55fr_360px] lg:items-start">
        <div className="space-y-5">
          {/* Heutiger Einsatzplan */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[14.5px] font-semibold">Heutiger Einsatzplan</h3>
              <Link href="/einsatzplanung" className="flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-dark">
                Zur Einsatzplanung <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              {todayOrders.length} geplante{todayOrders.length === 1 ? "r" : ""} Einsatz{todayOrders.length === 1 ? "" : "e"} für heute
            </p>
            {todayOrders.length === 0 ? (
              <p className="mt-5 rounded-xl border border-dashed border-border bg-background p-6 text-center text-xs text-muted">
                Für heute sind keine Einsätze geplant.
              </p>
            ) : (
              <div className="mt-2 divide-y divide-border">
                {todayOrders.map((o) => {
                  const isPriority = o.priority === "zeitkritisch" || o.priority === "notfall";
                  const isRunning = o.status === "in_bearbeitung";
                  const badge = isPriority
                    ? { text: "Priorität", cls: "bg-red-50 text-red-700" }
                    : isRunning
                      ? { text: "Läuft", cls: "bg-green-50 text-green-700" }
                      : { text: "Geplant", cls: "bg-brand-soft text-brand" };
                  const employees = employeesByOrder.get(o.id) ?? [];
                  const vehicles = vehiclesByOrder.get(o.id) ?? [];
                  return (
                    <div key={o.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="w-11 shrink-0 text-[12.5px] font-bold tabular-nums">{formatTime(o.start_time)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-semibold">
                          {o.title} – {customerLabel(o.customers as { name: string | null; company_name: string | null } | null)}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          {employees.length === 0 && vehicles.length === 0 && <span className="text-[11px] text-muted-2">Noch nicht besetzt</span>}
                          {employees.map((e) => (
                            <span key={e} className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted">
                              {e}
                            </span>
                          ))}
                          {vehicles.map((v) => (
                            <span key={v} className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted">
                              {v}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold ${badge.cls}`}>{badge.text}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Wochenübersicht */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[14.5px] font-semibold">Wochenübersicht</h3>
              <Link href="/einsatzplanung" className="flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-dark">
                Ganze Woche ansehen <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <p className="mt-0.5 text-xs text-muted">Einsätze pro Tag, aktuelle Woche</p>
            <div className="mt-3.5 grid grid-cols-7 gap-2">
              {weekDates.map((d, i) => {
                const isToday = d === todayISO;
                const count = weekCounts[i];
                return (
                  <div key={d} className={`rounded-xl border p-2.5 text-center ${isToday ? "border-brand bg-brand-soft" : "border-border bg-background"}`}>
                    <div className="text-[10px] font-semibold uppercase text-muted-2">{WEEKDAY_LABELS[i]}</div>
                    <div className="mt-0.5 text-sm font-bold">{Number(d.slice(8, 10))}</div>
                    <div className={`mt-1.5 text-[10.5px] ${isToday ? "font-bold text-brand" : "text-muted-2"}`}>
                      {count > 0 ? `${count} ${count === 1 ? "Einsatz" : "Einsätze"}` : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trend-Diagramm */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[14.5px] font-semibold">Aufträge nach Tag · letzte 7 Tage</h3>
            </div>
            <div className="mt-4 flex h-[70px] items-end gap-2">
              {last7Dates.map((d, i) => (
                <div key={d} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className={`w-full rounded-t ${d === todayISO ? "bg-brand" : "bg-brand-soft"}`}
                    style={{ height: `${Math.max(6, (trendCounts[i] / trendMax) * 100)}%` }}
                  />
                  <div className="text-[9.5px] text-muted-2">
                    {new Date(`${d}T00:00:00`).toLocaleDateString("de-DE", { weekday: "short" })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Module gruppiert */}
          <div className="space-y-5">
            {MODULE_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-2">{group.title}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.name} href={item.href} className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
                        <span className={`flex h-9 w-9 items-center justify-center rounded-[11px] bg-gradient-to-br ${item.gradient} text-white shadow-md`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <p className="mt-2.5 text-[13px] font-semibold">{item.name}</p>
                        <p className="mt-0.5 text-lg font-bold tracking-tight">{item.value}</p>
                        <p className="text-[10.5px] text-muted-2">{item.sub}</p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Fahrzeug-Status */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[14.5px] font-semibold">Fahrzeug-Status</h3>
              <Link href="/fahrzeuge" className="flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-dark">
                Alle Fahrzeuge <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <p className="mt-0.5 text-xs text-muted">Aktueller Stand der Flotte</p>
            {fleetStatusList.length === 0 ? (
              <p className="mt-4 text-xs text-muted">Noch keine Fahrzeuge angelegt.</p>
            ) : (
              <div className="mt-2 divide-y divide-border">
                {fleetStatusList.map((f) => (
                  <Link key={f.id} href={`/fahrzeuge/${f.id}`} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-slate-400 to-slate-600 text-white shadow-sm">
                      <Truck className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-semibold">{f.name}</div>
                      <div className="truncate text-[11px] text-muted-2">{f.license_plate || "Kein Kennzeichen"}</div>
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold ${FLEET_STATUS_BADGE_CLASS[f.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {FLEET_STATUS_LABELS[f.status] ?? f.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Materialwarnungen */}
          {(lowStockMaterials ?? []).length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[14.5px] font-semibold">Materialwarnungen</h3>
                <Link href="/material" className="flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-dark">
                  Zum Lager <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <p className="mt-0.5 text-xs text-muted">Artikel mit niedrigem Bestand</p>
              <div className="mt-2 divide-y divide-border">
                {(lowStockMaterials ?? []).map((m) => {
                  const min = Number(m.min_quantity) || 1;
                  const percent = Math.max(6, Math.min(100, (Number(m.quantity) / min) * 100));
                  const critical = Number(m.quantity) < min * 0.5;
                  return (
                    <div key={m.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">{m.name}</span>
                      <span className="shrink-0 text-[11px] text-muted-2">
                        {m.quantity} von {m.min_quantity} {m.unit}
                      </span>
                      <div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-background">
                        <div className={`h-full rounded-full ${critical ? "bg-red-500" : "bg-amber-500"}`} style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-[13.5px] font-semibold">Team heute</h3>
            <p className="mb-3 mt-0.5 text-[11.5px] text-muted-2">Wer im Einsatz, verfügbar oder abwesend ist</p>
            {teamHeute.length === 0 ? (
              <p className="text-xs text-muted">Noch keine Mitarbeiter angelegt.</p>
            ) : (
              teamHeute.map((p) => (
                <div key={p.id} className="flex items-center gap-2.5 py-1.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-700 text-[9.5px] font-bold text-white">
                    {initialsFor(p.full_name)}
                  </span>
                  <span className="flex-1 truncate text-[12.5px]">{p.full_name || "Unbenannt"}</span>
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${EMPLOYEE_STATUS_DOT_CLASS[p.status] ?? "bg-gray-400"}`} />
                  <span className="shrink-0 text-[11px] text-muted-2">{EMPLOYEE_STATUS_LABELS[p.status] ?? p.status}</span>
                </div>
              ))
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-[13.5px] font-semibold">Auslastung</h3>
            <p className="mb-3 mt-0.5 text-[11.5px] text-muted-2">Fahrzeuge &amp; Mitarbeiter heute</p>
            <div className="flex items-center gap-4 py-1.5">
              <RingBadge percent={fahrzeugAuslastung} color="#2f5fff" />
              <div>
                <div className="text-[12.5px] font-semibold">Fahrzeuge</div>
                <div className="text-[11px] text-muted-2">
                  {fleetEinsatz.length} von {fleetList.length} im Einsatz
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 py-1.5">
              <RingBadge percent={mitarbeiterAuslastung} color="#16a34a" />
              <div>
                <div className="text-[12.5px] font-semibold">Mitarbeiter</div>
                <div className="text-[11px] text-muted-2">
                  {employeesEinsatz.length} von {profilesList.length} aktiv
                </div>
              </div>
            </div>
          </div>

          {dueList.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-[13.5px] font-semibold">Fälligkeiten</h3>
              <p className="mb-2 mt-0.5 text-[11.5px] text-muted-2">Bald anstehende Termine &amp; Fristen</p>
              <div className="divide-y divide-border">
                {dueList.map((d, i) => {
                  const diff = daysBetweenISO(todayISO, d.dateISO);
                  const tag = dayTag(diff);
                  return (
                    <div key={i} className="flex items-start gap-2.5 py-2">
                      <span className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10.5px] font-bold whitespace-nowrap ${tag.className}`}>{tag.text}</span>
                      <div className="min-w-0">
                        <div className="text-xs leading-tight">{d.text}</div>
                        <div className="mt-0.5 text-[11px] text-muted-2">{d.sub}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {topCustomers.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-[13.5px] font-semibold">Top-Kunden diesen Monat</h3>
              <p className="mb-2 mt-0.5 text-[11.5px] text-muted-2">Nach bezahltem Umsatz</p>
              <div className="divide-y divide-border">
                {topCustomers.map(([name, value], i) => (
                  <div key={name} className="flex items-center gap-2.5 py-2">
                    <span className="w-4 text-[11px] font-bold text-muted-2">{i + 1}</span>
                    <span className="flex-1 truncate text-[12.5px] font-semibold">{name}</span>
                    <span className="text-xs font-bold">{formatEuro(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {openQuotes.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-[13.5px] font-semibold">Offene Angebote</h3>
              <p className="mb-2 mt-0.5 text-[11.5px] text-muted-2">Warten auf Rückmeldung des Kunden</p>
              <div className="divide-y divide-border">
                {openQuotes.map((q) => {
                  const days = daysBetweenISO((q.sent_at ?? q.issue_date ?? todayISO).slice(0, 10), todayISO);
                  return (
                    <Link key={q.id} href={`/rechnungen/${q.id}`} className="flex items-center gap-2.5 py-2">
                      <span className="flex-1 truncate text-[12.5px] font-semibold">Angebot #{q.invoice_number}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${days <= 1 ? "bg-brand-soft text-brand" : "bg-amber-50 text-amber-700"}`}>
                        {days <= 1 ? "Neu" : `${days} Tage offen`}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-[13.5px] font-semibold">Letzte Aktivitäten</h3>
            {recentActivities.length === 0 ? (
              <p className="mt-2 text-xs text-muted">Noch keine Aktivitäten vorhanden.</p>
            ) : (
              (() => {
                const groups: Array<{ label: string; entries: ActivityEntry[] }> = [];
                for (const entry of recentActivities) {
                  const label = activityDayLabel(entry.createdAt, todayISO, yesterdayISO);
                  const last = groups[groups.length - 1];
                  if (last && last.label === label) last.entries.push(entry);
                  else groups.push({ label, entries: [entry] });
                }
                return groups.map((g) => (
                  <div key={g.label} className="mt-3 first:mt-2">
                    <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-muted-2">{g.label}</p>
                    {g.entries.map((e, i) => (
                      <div key={i} className="flex gap-2 py-1.5">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-2" />
                        <div>
                          <div className="text-xs leading-relaxed">{e.text}</div>
                          <div className="text-[10.5px] text-muted-2">{formatDate(e.createdAt)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ));
              })()
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-[13.5px] font-semibold">Ihr Arbeitsablauf</h3>
            <p className="mb-1 mt-0.5 text-[11.5px] text-muted-2">Von Auftrag bis Rechnung</p>
            <ol className="mt-2 space-y-1.5">
              {WORKFLOW.map((step, i) => (
                <li key={step} className="flex items-baseline gap-2.5 text-[12.5px]">
                  <span className="w-3.5 shrink-0 text-[11.5px] tabular-nums text-muted-2">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

function RingBadge({ percent, color }: { percent: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <span
      className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-full"
      style={{ background: `conic-gradient(${color} 0% ${clamped}%, var(--border) ${clamped}% 100%)` }}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-[11.5px] font-bold">{clamped.toFixed(0)}%</span>
    </span>
  );
}
