"use client";

import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { ROLE_LABELS, ROLES } from "@/lib/roles";
import { EMPLOYEE_STATUSES, EMPLOYEE_STATUS_LABELS } from "@/lib/employees";

export function EmployeeFilterBar({
  q,
  role,
  status,
  department,
  location,
  departmentOptions,
  locationOptions,
}: {
  q: string;
  role: string;
  status: string;
  department: string;
  location: string;
  departmentOptions: string[];
  locationOptions: string[];
}) {
  const router = useRouter();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/mitarbeiter?${params.toString()}`);
  }

  const hasFilters = Boolean(q || role || status || department || location);
  const selectClass =
    "rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground outline-none transition-colors hover:border-brand/40 focus:border-brand focus:ring-2 focus:ring-brand/10";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm">
      <div className="relative min-w-[200px] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="text"
          defaultValue={q}
          placeholder="Mitarbeiter suchen…"
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParam("q", e.currentTarget.value);
          }}
          onBlur={(e) => updateParam("q", e.currentTarget.value)}
          className="w-full rounded-full border border-border bg-background py-1.5 pl-8 pr-3 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10"
        />
      </div>

      <select value={role} onChange={(e) => updateParam("role", e.target.value)} className={selectClass}>
        <option value="">Rolle: Alle</option>
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>

      <select value={status} onChange={(e) => updateParam("status", e.target.value)} className={selectClass}>
        <option value="">Status: Alle</option>
        {EMPLOYEE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {EMPLOYEE_STATUS_LABELS[s]}
          </option>
        ))}
      </select>

      {departmentOptions.length > 0 && (
        <select value={department} onChange={(e) => updateParam("department", e.target.value)} className={selectClass}>
          <option value="">Abteilung: Alle</option>
          {departmentOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      )}

      {locationOptions.length > 0 && (
        <select value={location} onChange={(e) => updateParam("location", e.target.value)} className={selectClass}>
          <option value="">Standort: Alle</option>
          {locationOptions.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      )}

      {hasFilters && (
        <button
          type="button"
          onClick={() => router.push("/mitarbeiter")}
          className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          <X className="h-3.5 w-3.5" />
          Zurücksetzen
        </button>
      )}
    </div>
  );
}
