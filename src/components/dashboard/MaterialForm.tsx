type MaterialFormValues = {
  name?: string;
  unit?: string;
  quantity?: number | string | null;
  min_quantity?: number | string | null;
  unit_price?: number | string | null;
  notes?: string | null;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand";
const labelClass = "text-sm font-medium";

export function MaterialForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  defaultValues?: MaterialFormValues;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-6">
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
          placeholder="z. B. Kanalrohr DN 200, Dichtungsring, Reinigungsmittel"
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="unit" className={labelClass}>
            Einheit
          </label>
          <input
            id="unit"
            name="unit"
            type="text"
            list="unit-suggestions"
            defaultValue={defaultValues?.unit ?? "Stück"}
            className={inputClass}
          />
          <datalist id="unit-suggestions">
            <option value="Stück" />
            <option value="Meter" />
            <option value="Liter" />
            <option value="kg" />
            <option value="Rolle" />
            <option value="Karton" />
            <option value="Palette" />
          </datalist>
        </div>
        <div>
          <label htmlFor="quantity" className={labelClass}>
            Bestand
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultValues?.quantity ?? 0}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="min_quantity" className={labelClass}>
            Mindestbestand
          </label>
          <input
            id="min_quantity"
            name="min_quantity"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultValues?.min_quantity ?? ""}
            placeholder="optional"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="unit_price" className={labelClass}>
            Preis pro Einheit (€)
          </label>
          <input
            id="unit_price"
            name="unit_price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultValues?.unit_price ?? ""}
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
