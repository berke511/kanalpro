import { Plus } from "lucide-react";

const selectClass =
  "rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-brand sm:text-sm";

type Option = { id: string; label: string };

export function AssignEmployeeForm({
  action,
  options,
}: {
  action: (formData: FormData) => void;
  options: Option[];
}) {
  if (options.length === 0) {
    return <p className="text-sm text-muted">Keine weiteren Mitarbeiter verfügbar.</p>;
  }
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div className="min-w-[180px] flex-1">
        <label className="text-xs font-medium text-muted">Mitarbeiter zuweisen</label>
        <select name="employee_id" required defaultValue="" className={`mt-1 w-full ${selectClass}`}>
          <option value="" disabled>
            Mitarbeiter auswählen…
          </option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        <Plus className="h-4 w-4" />
        Zuweisen
      </button>
    </form>
  );
}

export function AssignVehicleForm({
  action,
  options,
}: {
  action: (formData: FormData) => void;
  options: Option[];
}) {
  if (options.length === 0) {
    return <p className="text-sm text-muted">Keine weiteren Fahrzeuge verfügbar.</p>;
  }
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div className="min-w-[180px] flex-1">
        <label className="text-xs font-medium text-muted">Fahrzeug zuweisen</label>
        <select name="fleet_item_id" required defaultValue="" className={`mt-1 w-full ${selectClass}`}>
          <option value="" disabled>
            Fahrzeug auswählen…
          </option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        <Plus className="h-4 w-4" />
        Zuweisen
      </button>
    </form>
  );
}
