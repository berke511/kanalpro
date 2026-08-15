import Link from "next/link";
import { AlertTriangle, Gauge, MapPin, User, Wrench } from "lucide-react";
import {
  FLEET_KIND_LABELS,
  FLEET_STATUS_BADGE_CLASS,
  FLEET_STATUS_DOT_CLASS,
  FLEET_STATUS_LABELS,
  initialsFor,
  isDueSoon,
  isOverdue,
} from "@/lib/fleet";

export type FleetCardData = {
  id: string;
  kind: string;
  name: string;
  licensePlate: string | null;
  status: string;
  photoUrl: string | null;
  manufacturer: string | null;
  model: string | null;
  location: string | null;
  assignedEmployeeNames: string[];
  currentOrderTitle: string | null;
  nextMaintenanceAt: string | null;
  tuvDueDate: string | null;
  maintenanceProgress: number | null;
  isArchived: boolean;
};

export function FleetCard({ item, href }: { item: FleetCardData; href: string }) {
  const dueSoon = isDueSoon(item.nextMaintenanceAt) || isDueSoon(item.tuvDueDate);
  const overdue = isOverdue(item.nextMaintenanceAt) || isOverdue(item.tuvDueDate);
  const subtitle = [item.manufacturer, item.model].filter(Boolean).join(" ") || FLEET_KIND_LABELS[item.kind] || item.kind;

  return (
    <Link
      href={href}
      className={`group flex flex-col rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_20px_rgba(16,24,40,.06)] transition-all duration-150 hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md ${
        item.isArchived ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="relative h-12 w-12 shrink-0">
          {item.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.photoUrl} alt={item.name} className="h-12 w-12 rounded-xl object-cover shadow-sm" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark text-sm font-semibold text-white shadow-sm">
              {initialsFor(item.name)}
            </span>
          )}
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card ${FLEET_STATUS_DOT_CLASS[item.status] ?? "bg-gray-400"}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground group-hover:text-brand">{item.name}</p>
          <p className="truncate text-xs text-muted">{subtitle}</p>
        </div>
        {(overdue || dueSoon) && (
          <span title={overdue ? "Termin überfällig" : "Termin läuft bald ab"} className={overdue ? "text-red-500" : "text-amber-500"}>
            <AlertTriangle className="h-4 w-4" />
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${FLEET_STATUS_BADGE_CLASS[item.status] ?? "bg-gray-100 text-gray-600"}`}>
          {FLEET_STATUS_LABELS[item.status] ?? item.status}
        </span>
        {item.licensePlate && <span className="rounded-full bg-background px-2 py-0.5 text-[11px] text-muted">{item.licensePlate}</span>}
      </div>

      <div className="mt-3 space-y-1 text-xs text-muted">
        {item.location && (
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3" /> {item.location}
          </p>
        )}
        {item.assignedEmployeeNames.length > 0 && (
          <p className="flex items-center gap-1.5">
            <User className="h-3 w-3" /> {item.assignedEmployeeNames.join(", ")}
          </p>
        )}
        {item.currentOrderTitle && (
          <p className="flex items-center gap-1.5">
            <Wrench className="h-3 w-3" /> {item.currentOrderTitle}
          </p>
        )}
      </div>

      {item.maintenanceProgress !== null && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-muted">
            <span className="flex items-center gap-1">
              <Gauge className="h-3 w-3" /> Nächste Wartung
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-background">
            <div
              className={`h-full rounded-full ${item.maintenanceProgress >= 100 ? "bg-red-500" : item.maintenanceProgress >= 75 ? "bg-amber-500" : "bg-brand"}`}
              style={{ width: `${Math.min(100, Math.max(4, item.maintenanceProgress))}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  );
}
