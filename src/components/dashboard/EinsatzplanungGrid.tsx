import Link from "next/link";
import { ORDER_KIND_COLOR, ORDER_KIND_LABELS } from "@/lib/orders";

export type CalendarOrder = {
  id: string;
  title: string;
  order_kind: string;
  status: string;
  scheduled_date: string;
  start_time: string | null;
  planned_duration_minutes: number | null;
  all_day: boolean;
  customerName: string | null;
  employeeNames: string[];
};

const HOUR_START = 7;
const HOUR_END = 19;
const HOUR_PX = 56;
const GRID_HEIGHT = (HOUR_END - HOUR_START) * HOUR_PX;

function timeToMinutes(time: string | null): number {
  if (!time) return 8 * 60; // Aufträge ohne Uhrzeit: Standard 08:00
  const [h, m] = time.split(":").map(Number);
  return (h ?? 8) * 60 + (m ?? 0);
}

// Einfaches Spalten-Packing für sich überschneidende Termine an einem Tag
// (analog zu Tagesansichten in gängigen Kalender-Apps): Aufträge werden
// nach Startzeit sortiert, jeder Auftrag landet in der ersten Spalte, deren
// letzter Termin bereits vorbei ist – überschneiden sich mehr als 4
// Aufträge gleichzeitig, teilen sich die weiteren die letzte Spalte.
function packColumns(orders: CalendarOrder[]): Array<{ order: CalendarOrder; col: number; cols: number }> {
  const sorted = [...orders].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
  const columnEnds: number[] = [];
  const placed: Array<{ order: CalendarOrder; col: number }> = [];
  const MAX_COLS = 4;

  for (const order of sorted) {
    const start = timeToMinutes(order.start_time);
    const duration = order.planned_duration_minutes || 60;
    const end = start + duration;
    let col = columnEnds.findIndex((endTime) => endTime <= start);
    if (col === -1) {
      if (columnEnds.length < MAX_COLS) {
        col = columnEnds.length;
        columnEnds.push(end);
      } else {
        col = MAX_COLS - 1;
        columnEnds[col] = Math.max(columnEnds[col], end);
      }
    } else {
      columnEnds[col] = end;
    }
    placed.push({ order, col });
  }

  const maxCols = Math.min(MAX_COLS, Math.max(1, columnEnds.length));
  return placed.map((p) => ({ ...p, cols: maxCols }));
}

export function EinsatzplanungGrid({
  days,
  ordersByDay,
  todayISO,
  nowMinutes,
  weekdayLabels,
  panelHref,
}: {
  days: string[];
  ordersByDay: Record<string, CalendarOrder[]>;
  todayISO: string;
  nowMinutes: number;
  weekdayLabels: string[];
  panelHref: (orderId: string) => string;
}) {
  const hours = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
  const nowTop = ((nowMinutes - HOUR_START * 60) / ((HOUR_END - HOUR_START) * 60)) * GRID_HEIGHT;
  const showNowLine = nowMinutes >= HOUR_START * 60 && nowMinutes <= HOUR_END * 60;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex min-w-[720px]">
        {/* Stundenraster links */}
        <div className="w-14 shrink-0 border-r border-border pt-9">
          {hours.map((h) => (
            <div key={h} style={{ height: HOUR_PX }} className="relative">
              <span className="absolute -top-2 right-2 text-[11px] font-medium text-muted">{String(h).padStart(2, "0")}:00</span>
            </div>
          ))}
        </div>

        {days.map((iso, dayIdx) => {
          const dayOrders = ordersByDay[iso] ?? [];
          const allDayOrders = dayOrders.filter((o) => o.all_day);
          const timedOrders = dayOrders.filter((o) => !o.all_day);
          const packed = packColumns(timedOrders);
          const isToday = iso === todayISO;
          const [, , day] = iso.split("-");

          return (
            <div key={iso} className={`min-w-[140px] flex-1 border-r border-border last:border-r-0 ${isToday ? "bg-brand-soft/10" : ""}`}>
              <div className={`sticky top-0 z-[1] border-b px-2 py-2 text-center ${isToday ? "border-brand/20 bg-brand-soft/30" : "border-border bg-card"}`}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{weekdayLabels[dayIdx % weekdayLabels.length]}</p>
                <p
                  className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    isToday ? "bg-gradient-to-br from-brand to-brand-dark text-white shadow-sm" : "text-foreground"
                  }`}
                >
                  {day}
                </p>
              </div>

              {allDayOrders.length > 0 && (
                <div className="space-y-1 border-b border-border p-1.5">
                  {allDayOrders.map((o) => {
                    const colors = ORDER_KIND_COLOR[o.order_kind] ?? ORDER_KIND_COLOR.sonstige;
                    return (
                      <Link
                        key={o.id}
                        href={panelHref(o.id)}
                        className={`block truncate rounded-md border-l-2 ${colors.border} ${colors.bg} px-1.5 py-1 text-[11px] font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:shadow ${colors.text}`}
                      >
                        {o.title}
                      </Link>
                    );
                  })}
                </div>
              )}

              <div className="relative" style={{ height: GRID_HEIGHT }}>
                {hours.slice(0, -1).map((h) => (
                  <div key={h} className="absolute left-0 right-0 border-t border-border/60" style={{ top: (h - HOUR_START) * HOUR_PX }} />
                ))}

                {isToday && showNowLine && (
                  <div className="absolute left-0 right-0 z-[2] flex items-center" style={{ top: nowTop }}>
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
                    </span>
                    <span className="h-px flex-1 bg-gradient-to-r from-red-500 to-red-500/30" />
                  </div>
                )}

                {packed.map(({ order, col, cols }) => {
                  const start = timeToMinutes(order.start_time);
                  const duration = order.planned_duration_minutes || 60;
                  const clampedStart = Math.max(HOUR_START * 60, start);
                  const clampedEnd = Math.min(HOUR_END * 60, start + duration);
                  const top = ((clampedStart - HOUR_START * 60) / ((HOUR_END - HOUR_START) * 60)) * GRID_HEIGHT;
                  const height = Math.max(28, ((clampedEnd - clampedStart) / ((HOUR_END - HOUR_START) * 60)) * GRID_HEIGHT);
                  const colors = ORDER_KIND_COLOR[order.order_kind] ?? ORDER_KIND_COLOR.sonstige;
                  const widthPct = 100 / cols;

                  return (
                    <Link
                      key={order.id}
                      href={panelHref(order.id)}
                      title={`${order.title} · ${order.customerName ?? ""}`}
                      className={`absolute overflow-hidden rounded-lg border-l-4 ${colors.border} ${colors.bg} px-1.5 py-1 text-[11px] shadow-sm transition-all duration-150 hover:z-10 hover:-translate-y-0.5 hover:shadow-lg`}
                      style={{
                        top,
                        height,
                        left: `calc(${col * widthPct}% + 2px)`,
                        width: `calc(${widthPct}% - 4px)`,
                      }}
                    >
                      <p className={`truncate font-semibold ${colors.text}`}>{order.title}</p>
                      <p className="truncate text-muted">{order.customerName ?? "—"}</p>
                      {order.employeeNames.length > 0 && (
                        <p className="truncate text-muted">{order.employeeNames.join(", ")}</p>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1.5 border-t border-border bg-background/60 px-3 py-2.5">
        {Object.entries(ORDER_KIND_LABELS).map(([key, label]) => (
          <span key={key} className="flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-muted">
            <span className={`h-1.5 w-1.5 rounded-full ${ORDER_KIND_COLOR[key]?.dot ?? "bg-gray-400"}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
