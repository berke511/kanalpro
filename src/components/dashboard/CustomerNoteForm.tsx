import { Save } from "lucide-react";

export function CustomerNoteForm({ action }: { action: (formData: FormData) => void }) {
  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <textarea
        name="note"
        rows={2}
        required
        placeholder="Interne Notiz hinzufügen…"
        className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-brand sm:text-sm"
      />
      <button
        type="submit"
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark sm:w-auto"
      >
        <Save className="h-4 w-4" />
        Speichern
      </button>
    </form>
  );
}
