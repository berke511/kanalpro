import { Plus } from "lucide-react";

const inputClass =
  "rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-brand sm:text-sm";

export function CustomerPropertyForm({ action }: { action: (formData: FormData) => void }) {
  return (
    <form action={action} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="text-xs font-medium text-muted">Bezeichnung *</label>
        <input
          name="name"
          type="text"
          required
          placeholder="z. B. Hauptstandort, Filiale Nord"
          className={`mt-1 w-full ${inputClass}`}
        />
      </div>
      <div className="sm:col-span-2">
        <label className="text-xs font-medium text-muted">Straße und Hausnummer</label>
        <input name="street" type="text" className={`mt-1 w-full ${inputClass}`} />
      </div>
      <div>
        <label className="text-xs font-medium text-muted">PLZ</label>
        <input name="postal_code" type="text" className={`mt-1 w-full ${inputClass}`} />
      </div>
      <div>
        <label className="text-xs font-medium text-muted">Ort</label>
        <input name="city" type="text" className={`mt-1 w-full ${inputClass}`} />
      </div>
      <div className="sm:col-span-2">
        <label className="text-xs font-medium text-muted">Notizen</label>
        <input name="notes" type="text" className={`mt-1 w-full ${inputClass}`} />
      </div>
      <div className="sm:col-span-2">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Objekt hinzufügen
        </button>
      </div>
    </form>
  );
}
