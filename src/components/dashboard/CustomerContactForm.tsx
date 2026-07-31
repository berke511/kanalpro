const inputClass =
  "rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-brand sm:text-sm";

export function CustomerContactForm({ action }: { action: (formData: FormData) => void }) {
  return (
    <form action={action} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
      <div>
        <label className="text-xs font-medium text-muted">Name *</label>
        <input name="name" type="text" required className={`mt-1 w-full ${inputClass}`} />
      </div>
      <div>
        <label className="text-xs font-medium text-muted">Funktion</label>
        <input name="role" type="text" placeholder="z. B. Einkauf, Geschäftsführung" className={`mt-1 w-full ${inputClass}`} />
      </div>
      <div>
        <label className="text-xs font-medium text-muted">Telefon</label>
        <input name="phone" type="text" className={`mt-1 w-full ${inputClass}`} />
      </div>
      <div>
        <label className="text-xs font-medium text-muted">E-Mail</label>
        <input name="email" type="email" className={`mt-1 w-full ${inputClass}`} />
      </div>
      <div className="sm:col-span-2">
        <label className="text-xs font-medium text-muted">Notizen</label>
        <input name="notes" type="text" className={`mt-1 w-full ${inputClass}`} />
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="is_primary" />
        Hauptansprechpartner
      </label>
      <div className="sm:col-span-2">
        <button
          type="submit"
          className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark sm:w-auto"
        >
          + Ansprechpartner hinzufügen
        </button>
      </div>
    </form>
  );
}
