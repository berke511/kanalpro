export function CustomerNoteForm({ action }: { action: (formData: FormData) => void }) {
  return (
    <form action={action} className="flex items-start gap-3">
      <textarea
        name="note"
        rows={2}
        required
        placeholder="Interne Notiz hinzufügen…"
        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
      />
      <button
        type="submit"
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        Speichern
      </button>
    </form>
  );
}
