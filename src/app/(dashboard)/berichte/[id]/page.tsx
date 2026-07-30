import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteReport, updateReport } from "@/app/(dashboard)/berichte/actions";
import { ReportForm } from "@/components/dashboard/ReportForm";

export default async function BerichtDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { id } = await params;
  const { error, message } = await searchParams;

  const supabase = await createClient();
  const [{ data: report }, { data: orders }] = await Promise.all([
    supabase.from("service_reports").select("*").eq("id", id).maybeSingle(),
    supabase.from("orders").select("id, title, customers(name)").order("created_at", { ascending: false }),
  ]);

  if (!report) {
    notFound();
  }

  const updateWithId = updateReport.bind(null, id);
  const deleteWithId = deleteReport.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Link href="/berichte" className="text-sm text-muted hover:text-foreground">
        ← Zurück zur Übersicht
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Einsatzbericht</h1>
        <form action={deleteWithId}>
          <button
            type="submit"
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Bericht löschen
          </button>
        </form>
      </div>

      {message && (
        <p className="mt-4 rounded-lg bg-brand-soft px-4 py-3 text-sm text-brand-dark">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <ReportForm
          action={updateWithId}
          defaultValues={report}
          submitLabel="Änderungen speichern"
          orders={(orders ?? []).map((o) => ({
            id: o.id,
            label: o.customers?.name ? `${o.title} (${o.customers.name})` : o.title,
          }))}
        />
      </div>
    </div>
  );
}
