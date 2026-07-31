import Link from "next/link";
import { ArrowLeft, Save, X } from "lucide-react";
import { createCustomer } from "@/app/(dashboard)/kunden/actions";
import { CustomerForm } from "@/components/dashboard/CustomerForm";

const FORM_ID = "customer-create-form";

export default async function NeuerKundePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; draft?: string; duplicate?: string; matches?: string; missing?: string }>;
}) {
  const { error, draft, duplicate, matches, missing } = await searchParams;

  let defaultValues;
  if (draft) {
    try {
      defaultValues = JSON.parse(draft);
    } catch {
      defaultValues = undefined;
    }
  }

  const duplicateWarning = duplicate === "1" && matches ? matches.split(";").map((m) => m.trim()) : undefined;
  const missingFields = missing ? missing.split(",") : undefined;

  return (
    <div className="mx-auto max-w-6xl p-4 pb-28 sm:p-6 lg:pb-6">
      <Link href="/kunden" className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Kundenliste
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Neuer Kunde</h1>
          <p className="mt-1 text-sm text-muted">Lege einen neuen Kunden mit allen Stammdaten an.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/kunden"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-background"
          >
            <X className="h-4 w-4" />
            Abbrechen
          </Link>
          <button
            type="submit"
            form={FORM_ID}
            className="hidden items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark lg:inline-flex"
          >
            <Save className="h-4 w-4" />
            Speichern
          </button>
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="mt-6">
        <CustomerForm
          formId={FORM_ID}
          action={createCustomer}
          defaultValues={defaultValues}
          submitLabel={duplicateWarning ? "Trotzdem anlegen" : "Kunde anlegen"}
          duplicateWarning={duplicateWarning}
          missingFields={missingFields}
          autoFocusFirstField
        />
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 p-3 backdrop-blur lg:hidden"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <button
          type="submit"
          form={FORM_ID}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"
        >
          <Save className="h-4 w-4" />
          Speichern
        </button>
      </div>
    </div>
  );
}
