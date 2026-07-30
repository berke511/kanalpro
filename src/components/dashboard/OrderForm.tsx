import { STATUS_LABELS } from "@/lib/orders";

type OrderFormValues = {
  title?: string;
  description?: string | null;
  customer_id?: string | null;
  assigned_to?: string | null;
  status?: string;
  scheduled_date?: string | null;
};

type Option = { id: string; label: string };

const inputClass =
  "mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand";
const labelClass = "text-sm font-medium";

export function OrderForm({
  action,
  defaultValues,
  submitLabel,
  customers,
  employees,
}: {
  action: (formData: FormData) => void;
  defaultValues?: OrderFormValues;
  submitLabel: string;
  customers: Option[];
  employees: Option[];
}) {
  return (
    <form action={action} className="space-y-6">
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
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          Beschreibung
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={defaultValues?.description ?? ""}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="customer_id" className={labelClass}>
            Kunde
          </label>
          <select
            id="customer_id"
            name="customer_id"
            defaultValue={defaultValues?.customer_id ?? ""}
            className={inputClass}
          >
            <option value="">Kein Kunde ausgewählt</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="assigned_to" className={labelClass}>
            Zugewiesener Mitarbeiter
          </label>
          <select
            id="assigned_to"
            name="assigned_to"
            defaultValue={defaultValues?.assigned_to ?? ""}
            className={inputClass}
          >
            <option value="">Nicht zugewiesen</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
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
          <select
            id="status"
            name="status"
            defaultValue={defaultValues?.status ?? "offen"}
            className={inputClass}
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="scheduled_date" className={labelClass}>
            Geplantes Datum
          </label>
          <input
            id="scheduled_date"
            name="scheduled_date"
            type="date"
            defaultValue={defaultValues?.scheduled_date ?? ""}
            className={inputClass}
          />
        </div>
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
