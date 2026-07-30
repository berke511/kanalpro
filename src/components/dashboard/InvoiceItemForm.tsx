const inputClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand";

export function InvoiceItemForm({ action }: { action: (formData: FormData) => void }) {
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-3">
      <div className="min-w-[200px] flex-1">
        <label className="text-xs font-medium text-muted">Beschreibung</label>
        <input
          name="description"
          type="text"
          required
          placeholder="z. B. Kanalreinigung, Material, Anfahrt"
          className={`mt-1 w-full ${inputClass}`}
        />
      </div>
      <div className="w-24">
        <label className="text-xs font-medium text-muted">Menge</label>
        <input
          name="quantity"
          type="number"
          step="0.01"
          min="0"
          defaultValue="1"
          className={`mt-1 w-full ${inputClass}`}
        />
      </div>
      <div className="w-32">
        <label className="text-xs font-medium text-muted">Preis/Einheit (€)</label>
        <input
          name="unit_price"
          type="number"
          step="0.01"
          min="0"
          defaultValue="0"
          className={`mt-1 w-full ${inputClass}`}
        />
      </div>
      <button
        type="submit"
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        + Position
      </button>
    </form>
  );
}
