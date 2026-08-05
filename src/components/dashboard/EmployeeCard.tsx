import Link from "next/link";
import { AlertTriangle, Phone, Truck } from "lucide-react";
import { ROLE_LABELS } from "@/lib/roles";
import { EMPLOYEE_STATUS_BADGE_CLASS, EMPLOYEE_STATUS_DOT_CLASS, EMPLOYEE_STATUS_LABELS, initialsFor } from "@/lib/employees";

export type EmployeeCardData = {
  id: string;
  fullName: string | null;
  role: string;
  status: string;
  department: string | null;
  location: string | null;
  phone: string | null;
  photoUrl: string | null;
  mainVehicleName: string | null;
  qualificationsExpiringCount: number;
  isArchived: boolean;
};

export function EmployeeCard({ employee, href }: { employee: EmployeeCardData; href: string }) {
  return (
    <Link
      href={href}
      className={`group flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md ${
        employee.isArchived ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="relative h-12 w-12 shrink-0">
          {employee.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={employee.photoUrl} alt={employee.fullName ?? ""} className="h-12 w-12 rounded-xl object-cover shadow-sm" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark text-sm font-semibold text-white shadow-sm">
              {initialsFor(employee.fullName)}
            </span>
          )}
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card ${EMPLOYEE_STATUS_DOT_CLASS[employee.status] ?? "bg-gray-400"}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground group-hover:text-brand">{employee.fullName || "—"}</p>
          <p className="truncate text-xs text-muted">{ROLE_LABELS[employee.role] ?? employee.role}</p>
        </div>
        {employee.qualificationsExpiringCount > 0 && (
          <span title={`${employee.qualificationsExpiringCount} Qualifikation(en) laufen bald ab`} className="text-amber-500">
            <AlertTriangle className="h-4 w-4" />
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${EMPLOYEE_STATUS_BADGE_CLASS[employee.status] ?? "bg-gray-100 text-gray-600"}`}>
          {EMPLOYEE_STATUS_LABELS[employee.status] ?? employee.status}
        </span>
        {employee.department && <span className="rounded-full bg-background px-2 py-0.5 text-[11px] text-muted">{employee.department}</span>}
      </div>

      <div className="mt-3 space-y-1 text-xs text-muted">
        {employee.phone && (
          <p className="flex items-center gap-1.5">
            <Phone className="h-3 w-3" /> {employee.phone}
          </p>
        )}
        {employee.mainVehicleName && (
          <p className="flex items-center gap-1.5">
            <Truck className="h-3 w-3" /> {employee.mainVehicleName}
          </p>
        )}
      </div>
    </Link>
  );
}
