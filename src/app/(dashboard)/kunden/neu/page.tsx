import Link from "next/link";
import { createCustomer } from "@/app/(dashboard)/kunden/actions";
import { CustomerForm } from "@/components/dashboard/CustomerForm";

export default async function NeuerKundePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Link href="/kunden" className="text-sm text-muted hover:text-foreground">
        ← Zurück zur Kundenliste
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Neuer Kunde</h1>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <CustomerForm action={createCustomer} submitLabel="Kunde anlegen" />
      </div>
    </div>
  );
}
