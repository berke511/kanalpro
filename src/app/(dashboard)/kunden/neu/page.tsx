import Link from "next/link";
import { ArrowLeft, Save, X } from "lucide-react";
import { createCustomer } from "@/app/(dashboard)/kunden/actions";
import { CustomerForm } from "@/components/dashboard/CustomerForm";
import { createClient } from "@/lib/supabase/server";

const FORM_ID = "customer-create-form";

export default async function NeuerKundePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; draft?: string; duplicate?: string; matches?: string; missing?: string }>;
}) {
  const { error, draft, duplicate, matches, missing } = await searchParams;
  const supabase = await createClient();
  const { data: employees } = await supabase
    .from("profiles")
    .select("id, full_name")
    .order("full_name", { ascending: true });

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
    <div className="p-4 pb-28 sm:p-6 lg:pb-6">
      <Link href="/kunden" className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Kundenliste
      </Link>

      <div className="relative mt-2 overflow-hidden rounded-[20px] bg-gradient-to-br from-[#3a63ff] via-[#3151e6] to-[#5b3ec9] px-6 py-6 text-white shadow-lg shadow-brand/25 sm:px-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/20 blur-2xl" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Neuer Kunde</h1>
            <p className="mt-1 text-sm text-white/80">Lege einen neuen Kunden mit allen Stammdaten an.</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/kunden"
              className="flex items-center gap-1.5 rounded-[11px] border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
              Abbrechen
            </Link>
            <button
              type="submit"
              form={FORM_ID}
              className="hidden items-center gap-1.5 rounded-[11px] bg-white px-4 py-2.5 text-sm font-bold text-brand-dark shadow-md hover:bg-white/90 lg:inline-flex"
            >
              <Save className="h-4 w-4" />
              Speichern
            </button>
          </div>
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
          employees={employees ?? []}
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
