import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS } from "@/lib/orders";
import { dateFromISO, todayBerlinISO } from "@/lib/date";
import { scheduleOrder, unscheduleOrder } from "./actions";

const STATUS_BADGE_CLASS: Record<string, string> = {
  offen: "bg-brand-soft text-brand",
  eingeplant: "bg-amber-50 text-amber-700",
  in_arbeit: "bg-blue-50 text-blue-700",
  abgeschlossen: "bg-green-50 text-green-700",
};

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatShort(iso: string) {
  const [, month, day] = iso.split("-");
  return `${day}.${month}.`;
}

// Wochenanfang relativ zum heutigen Kalendertag in der Zeitzone
// Europe/Berlin – nicht relativ zur Prozess-Zeitzone des Servers (Vercel
// läuft standardmäßig auf UTC). `today` wird bewusst auf UTC-Mitternacht
// verankert (siehe `dateFromISO`) und danach ausschließlich mit den
// UTC-Methoden weiterverarbeitet, damit "heute"/"diese Woche" unabhängig
// von der Server-Zeitzone stets dem Berliner Kalendertag entsprechen.
function getMonday(offsetWeeks: number) {
  const today = dateFromISO(todayBerlinISO());
  const day = today.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setUTCDate(monday.getUTCDate() + diffToMonday + offsetWeeks * 7);
  return monday;
}

export default async function EinsatzplanungPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; error?: string; message?: string }>;
}) {
  const { week, error: errorMsg, message } = await searchParams;
  const weekOffset = week && Number.isFinite(Number(week)) ? Number(week) : 0;

  const monday = getMonday(weekOffset);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return d;
  });
  const rangeStart = toISODate(days[0]);
  const rangeEnd = toISODate(days[6]);
  const todayISO = todayBerlinISO();

  const supabase = await createClient();

  const { data: scheduledOrders, error: scheduledError } = await supabase
    .from("orders")
    .select("id, title, status, scheduled_date, assigned_to, customers(name), profiles(full_name)")
    .gte("scheduled_date", rangeStart)
    .lte("scheduled_date", rangeEnd)
    .order("scheduled_date", { ascending: true });

  const { data: unscheduledOrders } = await supabase
    .from("orders")
    .select("id, title, status, customers(name)")
    .is("scheduled_date", null)
    .neq("status", "abgeschlossen")
    .order("created_at", { ascending: false });

  const { data: employees } = await supabase
    .from("profiles")
    .select("id, full_name")
    .order("full_name", { ascending: true });

  const ordersByDay: Record<string, NonNullable<typeof scheduledOrders>> = {};
  for (const d of days) ordersByDay[toISODate(d)] = [];
  for (const order of scheduledOrders ?? []) {
    if (order.scheduled_date && ordersByDay[order.scheduled_date]) {
      ordersByDay[order.scheduled_date].push(order);
    }
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Einsatzplanung & Disposition</h1>
          <p className="mt-1 text-sm text-muted">
            {formatShort(rangeStart)} – {formatShort(rangeEnd)}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Link
            href={`/einsatzplanung?week=${weekOffset - 1}`}
            className="rounded-lg border border-border bg-card px-3 py-2 hover:bg-brand-soft"
          >
            ← Vorherige Woche
          </Link>
          <Link
            href="/einsatzplanung?week=0"
            className="rounded-lg border border-border bg-card px-3 py-2 hover:bg-brand-soft"
          >
            Heute
          </Link>
          <Link
            href={`/einsatzplanung?week=${weekOffset + 1}`}
            className="rounded-lg border border-border bg-card px-3 py-2 hover:bg-brand-soft"
          >
            Nächste Woche →
          </Link>
        </div>
      </div>

      {errorMsg && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{errorMsg}</p>
      )}
      {message && (
        <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{message}</p>
      )}
      {scheduledError && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Einsätze konnten nicht geladen werden: {scheduledError.message}
        </p>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((d, i) => {
          const iso = toISODate(d);
          const isToday = iso === todayISO;
          const dayOrders = ordersByDay[iso] ?? [];
          return (
            <div
              key={iso}
              className={`min-w-[220px] rounded-2xl border bg-card p-3 ${
                isToday ? "border-brand" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-muted">{WEEKDAY_LABELS[i]}</p>
                <p className={`text-xs font-medium ${isToday ? "text-brand" : "text-muted"}`}>
                  {formatShort(iso)}
                </p>
              </div>
              <div className="mt-3 space-y-2">
                {dayOrders.length === 0 && <p className="text-xs text-muted">Keine Einsätze</p>}
                {dayOrders.map((order) => (
                  <div key={order.id} className="rounded-lg border border-border bg-background p-2.5">
                    <Link
                      href={`/auftraege/${order.id}`}
                      className="text-sm font-medium text-foreground hover:text-brand"
                    >
                      {order.title}
                    </Link>
                    <p className="mt-1 text-xs text-muted">{order.customers?.name ?? "—"}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          STATUS_BADGE_CLASS[order.status] ?? "bg-brand-soft text-brand"
                        }`}
                      >
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                      <span className="text-[11px] text-muted">
                        {order.profiles?.full_name ?? "Nicht zugewiesen"}
                      </span>
                    </div>
                    <form action={unscheduleOrder} className="mt-2">
                      <input type="hidden" name="order_id" value={order.id} />
                      <input type="hidden" name="week" value={weekOffset} />
                      <button
                        type="submit"
                        className="text-[11px] font-medium text-muted hover:text-red-600"
                      >
                        Termin entfernen
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">
          Nicht eingeplante Aufträge ({unscheduledOrders?.length ?? 0})
        </h2>
        {(!unscheduledOrders || unscheduledOrders.length === 0) && (
          <p className="mt-3 text-sm text-muted">Alle offenen Aufträge sind eingeplant.</p>
        )}
        {unscheduledOrders && unscheduledOrders.length > 0 && (
          <div className="mt-4 space-y-3">
            {unscheduledOrders.map((order) => (
              <form
                key={order.id}
                action={scheduleOrder}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
              >
                <input type="hidden" name="order_id" value={order.id} />
                <input type="hidden" name="week" value={weekOffset} />
                <div className="min-w-[160px] flex-1">
                  <Link href={`/auftraege/${order.id}`} className="text-sm font-medium hover:text-brand">
                    {order.title}
                  </Link>
                  <p className="text-xs text-muted">{order.customers?.name ?? "—"}</p>
                </div>
                <input
                  type="date"
                  name="scheduled_date"
                  required
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                />
                <select
                  name="assigned_to"
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                  defaultValue=""
                >
                  <option value="">Mitarbeiter wählen</option>
                  {(employees ?? []).map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name ?? "Unbenannt"}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark"
                >
                  Einplanen
                </button>
              </form>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
