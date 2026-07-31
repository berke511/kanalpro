import { Upload } from "lucide-react";

export function CustomerDocumentForm({ action }: { action: (formData: FormData) => void }) {
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
      <div className="min-w-[220px] flex-1">
        <label className="text-xs font-medium text-muted">Dokument hochladen</label>
        <input
          name="file"
          type="file"
          required
          className="mt-1 w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-dark"
        />
      </div>
      <button
        type="submit"
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark sm:w-auto"
      >
        <Upload className="h-4 w-4" />
        Hochladen
      </button>
    </form>
  );
}
