"use client";

import { useRouter } from "next/navigation";

type Option = { id: string; label: string };

export function EinsatzplanungFilterBar({
  baseQuery,
  employees,
  vehicles,
  statuses,
  employeeValue,
  vehicleValue,
  statusValue,
}: {
  baseQuery: string;
  employees: Option[];
  vehicles: Option[];
  statuses: Option[];
  employeeValue: string;
  vehicleValue: string;
  statusValue: string;
}) {
  const router = useRouter();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(baseQuery);
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/einsatzplanung?${params.toString()}`);
  }

  const selectClass =
    "rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground outline-none transition-colors hover:border-brand/40 focus:border-brand focus:ring-2 focus:ring-brand/10";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={employeeValue}
        onChange={(e) => updateParam("employee", e.target.value)}
        className={selectClass}
      >
        <option value="">Mitarbeiter: Alle</option>
        {employees.map((e) => (
          <option key={e.id} value={e.id}>
            {e.label}
          </option>
        ))}
      </select>
      <select
        value={vehicleValue}
        onChange={(e) => updateParam("vehicle", e.target.value)}
        className={selectClass}
      >
        <option value="">Fahrzeug: Alle</option>
        {vehicles.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
          </option>
        ))}
      </select>
      <select
        value={statusValue}
        onChange={(e) => updateParam("status", e.target.value)}
        className={selectClass}
      >
        <option value="">Status: Alle</option>
        {statuses.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
