import { INVOICE_KIND_LABELS, INVOICE_STATUS_LABELS } from "@/lib/invoices";
import { todayBerlinISO } from "@/lib/date";

type InvoiceFormValues = {
  kind?: string;
  order_id?: string | null;
  customer_id?: string | null;
  invoice_number?: string | null;
  status?: string;
  issue_date?: string | null;
  due_date?: string | null;
  notes?: string | null;
};

type Option = { id: string; label: string };

const inputClass =
  "mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand";
const labelClass = "text-sm font-medium";

export function InvoiceForm({
  action,
  defaultValues,
  submitLabel,
  orders,
  customers,
  lockOrder,
}: {
  action: (formData: FormData) => void;
  defaultValues?: InvoiceFormValues;
  submitLabel: string;
  orders: Option[];
  customers: Option[];
  lockOrder?: boolean;
}) {
  return (
    <form action={action} className="space-y-6">
      <div>
        <span className={labelClass}>Typ</span>
        <div className="mt-2 flex gap-4">
          {Object.entries(INVOICE_KIND_LABELS).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="kind"
                value={value}
                defaultChecked={(defaultValues?.kind ?? "rechnung") === value}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {!lockOrder && (
        <div>
          <label htmlFor="order_id" className={labelClass}>
            Zugehöriger Auftrag
          </label>
          <select
            id="order_id"
            name="order_id"
            defaultValue={defaultValues?.order_id ?? ""}
            className={inputClass}
          >
            <option value="">Kein Auftrag verknüpft</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

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
          <option value="">Kein Kunde ausgewählt (wird ggf. vom Auftrag übernommen)</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="invoice_number" className={labelClass}>
            Nummer
          </label>
          <input
            id="invoice_number"
            name="invoice_number"
            type="text"
            defaultValue={defaultValues?.invoice_number ?? ""}
            placeholder="z. B. RE-2026-001"
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
            defaultValue={defaultValues?.status ?? "entwurf"}
            className={inputClass}
          >
            {Object.entries(INVOICE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="issue_date" className={labelClass}>
            Datum
          </label>
          <input
            id="issue_date"
            name="issue_date"
            type="date"
            defaultValue={defaultValues?.issue_date ?? todayBerlinISO()}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="due_date" className={labelClass}>
            Fällig am
          </label>
          <input
            id="due_date"
            name="due_date"
            type="date"
            defaultValue={defaultValues?.due_date ?? ""}
            placeholder="optional"
            className={inputClass}
          />
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
