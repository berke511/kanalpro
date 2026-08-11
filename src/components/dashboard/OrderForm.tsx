"use client";

// Bearbeiten-Formular für einen bestehenden Auftrag (Vorlage 1: "Übersicht +
// Formular", vom Nutzer aus vier Mockup-Varianten ausgewählt). Deckt jetzt
// das vollständige Auftragsmodell ab (Auftragsart, Priorität, Termin mit
// Uhrzeit/Dauer, mehrere Mitarbeiter/Fahrzeuge/Maschinen) statt nur der
// ursprünglichen fünf Basisfelder.

import { useState } from "react";
import {
  ORDER_KINDS,
  ORDER_KIND_LABELS,
  ORDER_PRIORITIES,
  ORDER_PRIORITY_LABELS,
  ORDER_STATUSES,
  STATUS_LABELS,
} from "@/lib/orders";

type Option = { id: string; label: string };

type OrderFormValues = {
  title?: string;
  description?: string | null;
  order_kind?: string;
  priority?: string;
  status?: string;
  customer_id?: string | null;
  scheduled_date?: string | null;
  start_time?: string | null;
  planned_duration_minutes?: number | null;
};

const fieldClass =
  "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand";
const labelClass = "text-sm font-medium text-foreground";

function toggleId(list: string[], setList: (v: string[]) => void, id: string) {
  setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
}

export function OrderForm({
  action,
  defaultValues,
  submitLabel,
  customers,
  employees,
  vehicles,
  machines,
  selectedEmployeeIds = [],
  selectedVehicleIds = [],
  selectedMachineIds = [],
}: {
  action: (formData: FormData) => void;
  defaultValues?: OrderFormValues;
  submitLabel: string;
  customers: Option[];
  employees: Option[];
  vehicles: Option[];
  machines: Option[];
  selectedEmployeeIds?: string[];
  selectedVehicleIds?: string[];
  selectedMachineIds?: string[];
}) {
  const [employeeIds, setEmployeeIds] = useState<string[]>(selectedEmployeeIds);
  const [vehicleIds, setVehicleIds] = useState<string[]>(selectedVehicleIds);
  const [machineIds, setMachineIds] = useState<string[]>(selectedMachineIds);

  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="title" className={labelClass}>
          Titel *
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={defaultValues?.title ?? ""}
          placeholder="z. B. Kanalreinigung Musterstraße 12"
          className={fieldClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="order_kind" className={labelClass}>
            Auftragsart
          </label>
          <select id="order_kind" name="order_kind" defaultValue={defaultValues?.order_kind ?? "sonstige"} className={fieldClass}>
            {ORDER_KINDS.map((k) => (
              <option key={k} value={k}>
                {ORDER_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="priority" className={labelClass}>
            Priorität
          </label>
          <select id="priority" name="priority" defaultValue={defaultValues?.priority ?? "standard"} className={fieldClass}>
            {ORDER_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {ORDER_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="status" className={labelClass}>
            Status
          </label>
          <select id="status" name="status" defaultValue={defaultValues?.status ?? "offen"} className={fieldClass}>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s] ?? s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="customer_id" className={labelClass}>
            Kunde
          </label>
          <select id="customer_id" name="customer_id" defaultValue={defaultValues?.customer_id ?? ""} className={fieldClass}>
            <option value="">Kein Kunde ausgewählt</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="scheduled_date" className={labelClass}>
            Datum
          </label>
          <input
            id="scheduled_date"
            name="scheduled_date"
            type="date"
            defaultValue={defaultValues?.scheduled_date ?? ""}
            className={fieldClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="start_time" className={labelClass}>
              Uhrzeit
            </label>
            <input
              id="start_time"
              name="start_time"
              type="time"
              defaultValue={defaultValues?.start_time ? defaultValues.start_time.slice(0, 5) : ""}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="planned_duration_minutes" className={labelClass}>
              Dauer (Min.)
            </label>
            <input
              id="planned_duration_minutes"
              name="planned_duration_minutes"
              type="number"
              min="0"
              step="15"
              defaultValue={defaultValues?.planned_duration_minutes ?? ""}
              className={fieldClass}
            />
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass}>Mitarbeiter</label>
        <div className="mt-2 max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-background p-2.5">
          {employees.length === 0 && <p className="text-sm text-muted">Keine Mitarbeiter verfügbar.</p>}
          {employees.map((e) => (
            <label key={e.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={employeeIds.includes(e.id)}
                onChange={() => toggleId(employeeIds, setEmployeeIds, e.id)}
                className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
              />
              {e.label}
            </label>
          ))}
        </div>
        {employeeIds.map((id) => (
          <input key={id} type="hidden" name="employee_ids" value={id} />
        ))}
      </div>

      <div>
        <label className={labelClass}>Fahrzeuge &amp; Maschinen</label>
        <div className="mt-2 max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-background p-2.5">
          {vehicles.length === 0 && machines.length === 0 && <p className="text-sm text-muted">Keine Ressourcen verfügbar.</p>}
          {vehicles.map((v) => (
            <label key={v.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={vehicleIds.includes(v.id)}
                onChange={() => toggleId(vehicleIds, setVehicleIds, v.id)}
                className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
              />
              {v.label}
            </label>
          ))}
          {machines.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={machineIds.includes(m.id)}
                onChange={() => toggleId(machineIds, setMachineIds, m.id)}
                className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
              />
              {m.label}
            </label>
          ))}
        </div>
        {vehicleIds.map((id) => (
          <input key={id} type="hidden" name="vehicle_ids" value={id} />
        ))}
        {machineIds.map((id) => (
          <input key={id} type="hidden" name="machine_ids" value={id} />
        ))}
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          Beschreibung / Notizen
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={defaultValues?.description ?? ""}
          className={fieldClass}
        />
      </div>

      <button
        type="submit"
        className="rounded-lg bg-gradient-to-br from-brand to-brand-dark px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
      >
        {submitLabel}
      </button>
    </form>
  );
}
