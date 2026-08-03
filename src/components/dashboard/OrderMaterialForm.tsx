import { Plus } from "lucide-react";

const inputClass =
  "rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-brand sm:text-sm";

type MaterialOption = { id: string; label: string; unit: string | null };

export function OrderMaterialForm({
  action,
  options,
}: {
  action: (formData: FormData) => void;
  options: MaterialOption[];
}) {
  if (options.length === 0) {
    return <p className="text-sm text-muted">Keine Materialien im Lager hinterlegt.</p>;
  }
  return (
    <form action={action} className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-3">
      <div className="min-w-[160px] flex-1">
        <label className="text-xs font-medium text-muted">Material</label>
        <select name="material_id" required defaultValue="" className={`mt-1 w-full ${inputClass}`}>
          <option value="" disabled>
            Material auswählen…
          </option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
              {o.unit ? ` (${o.unit})` : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="w-24">
        <label className="text-xs font-medium text-muted">Menge</label>
        <input
          name="quantity"
          type="number"
          min="0.01"
          step="0.01"
          defaultValue="1"
          className={`mt-1 w-full ${inputClass}`}
        />
      </div>
      <button
        type="submit"
        className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        <Plus className="h-4 w-4" />
        Hinzufügen
      </button>
    </form>
  );
}
