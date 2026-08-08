import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { NewConversationForm } from "@/components/dashboard/NewConversationForm";
import { createConversation } from "../actions";

export default async function NeueNachrichtPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const profile = await getOrCreateProfile(supabase, user);
  if (!profile) {
    return null;
  }

  const { data: employees } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .neq("id", profile.id)
    .order("full_name", { ascending: true });

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/nachrichten"
          className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground sm:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zu den Nachrichten
        </Link>

        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:mt-0">Neue Nachricht</h1>
        <p className="mt-1 text-sm text-muted">
          Schreibe einem Kollegen direkt oder erstelle einen Gruppenchat, z. B. für eine Abteilung.
        </p>

        {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {(employees ?? []).length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted">
            Es sind noch keine weiteren Kollegen im Unternehmen.{" "}
            <Link href="/mitarbeiter" className="text-brand">
              Jetzt Kollegen einladen
            </Link>
            .
          </p>
        ) : (
          <NewConversationForm action={createConversation} employees={employees ?? []} />
        )}
      </div>
    </div>
  );
}
