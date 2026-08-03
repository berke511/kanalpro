import { Upload } from "lucide-react";

export function OrderDocumentForm({ action }: { action: (formData: FormData) => void }) {
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
      <div className="min-w-[200px] flex-1">
        <label className="text-xs font-medium text-muted">Dokument, Bild oder Plan hochladen</label>
        <input
          name="file"
          type="file"
          required
          className="mt-1 w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-dark"
        />
      </div>
      <div className="w-36">
        <label className="text-xs font-medium text-muted">Kategorie</label>
        <select
          name="category"
          defaultValue="dokument"
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-brand sm:text-sm"
        >
          <option value="dokument">Dokument</option>
          <option value="bild">Bild</option>
          <option value="plan">Plan</option>
        </select>
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
