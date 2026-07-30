type ReportFormValues = {
  order_id?: string;
  report_date?: string | null;
  work_performed?: string;
  hours_worked?: number | string | null;
  materials_notes?: string | null;
  customer_signature_name?: string | null;
  signed_at?: string | null;
};

type Option = { id: string; label: string };

const inputClass =
  "mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand";
const labelClass = "text-sm font-medium";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function ReportForm({
  action,
  defaultValues,
  submitLabel,
  orders,
}: {
  action: (formData: FormData) => void;
  defaultValues?: ReportFormValues;
  submitLabel: string;
  orders: Option[];
}) {
  return (
    <form action={action} className="space-y-6">
      <div>
        <label htmlFor="order_id" className={labelClass}>
          Auftrag *
        </label>
        <select
          id="order_id"
          name="order_id"
          required
          defaultValue={defaultValues?.order_id ?? ""}
          className={inputClass}
        >
          <option value="" disabled>
            Auftrag wählen
          </option>
          {orders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="report_date" className={labelClass}>
            Datum
          </label>
          <input
            id="report_date"
            name="report_date"
            type="date"
            defaultValue={defaultValues?.report_date ?? todayISO()}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="hours_worked" className={labelClass}>
            Arbeitsstunden
          </label>
          <input
            id="hours_worked"
            name="hours_worked"
            type="number"
            step="0.25"
            min="0"
            defaultValue={defaultValues?.hours_worked ?? ""}
            placeholder="optional"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="work_performed" className={labelClass}>
          Durchgeführte Arbeiten *
        </label>
        <textarea
          id="work_performed"
          name="work_performed"
          rows={5}
          required
          defaultValue={defaultValues?.work_performed ?? ""}
          placeholder="z. B. Kanalreinigung durchgeführt, Verstopfung im Hauptrohr beseitigt, Dichtheitsprüfung erfolgreich"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="materials_notes" className={labelClass}>
          Verwendetes Material
        </label>
        <textarea
          id="materials_notes"
          name="materials_notes"
          rows={3}
          defaultValue={defaultValues?.materials_notes ?? ""}
          placeholder="z. B. 2x Dichtungsring, 5m Kanalrohr DN 200"
          className={inputClass}
        />
      </div>

      <div className="rounded-xl border border-dashed border-border p-4">
        <label htmlFor="customer_signature_name" className={labelClass}>
          Digitale Kundenunterschrift
        </label>
        <p className="mt-1 text-xs text-muted">
          Kunde bestätigt die durchgeführten Arbeiten durch Eingabe des vollständigen Namens.
          Sobald ein Name eingetragen ist, wird der Auftrag automatisch als abgeschlossen markiert.
        </p>
        <input
          id="customer_signature_name"
          name="customer_signature_name"
          type="text"
          defaultValue={defaultValues?.customer_signature_name ?? ""}
          placeholder="Vor- und Nachname des Kunden"
          className={inputClass}
        />
        {defaultValues?.signed_at && (
          <p className="mt-2 text-xs font-medium text-green-700">
            Unterschrieben am {new Date(defaultValues.signed_at).toLocaleString("de-DE")}
          </p>
        )}
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
