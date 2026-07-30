import { FLEET_KIND_LABELS, FLEET_STATUS_LABELS } from "@/lib/fleet";

type FleetFormValues = {
  kind?: string;
  name?: string;
  license_plate?: string | null;
  status?: string;
  notes?: string | null;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand";
const labelClass = "text-sm font-medium";

export function FleetForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  defaultValues?: FleetFormValues;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-6">
      <div>
        <span className={labelClass}>Typ</span>
        <div className="mt-2 flex gap-4">
          {Object.entries(FLEET_KIND_LABELS).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="kind"
                value={value}
                defaultChecked={(defaultValues?.kind ?? "fahrzeug") === value}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="name" className={labelClass}>
          Bezeichnung *
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={defaultValues?.name ?? ""}
          placeholder="z. B. Kanal-TV Fahrzeug 1 oder Hochdruckspüler HD-200"
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="license_plate" className={labelClass}>
            Kennzeichen / Inventarnummer
          </label>
          <input
            id="license_plate"
            name="license_plate"
            type="text"
            defaultValue={defaultValues?.license_plate ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="status" className={labelClass}>
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={defaultValues?.status ?? "verfuegbar"}
            className={inputClass}
          >
            {Object.entries(FLEET_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="notes" className={labelClass}>
          Notizen
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={defaultValues?.notes ?? ""}
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        {submitLabel}
      </button>
    </form>
  );
}
