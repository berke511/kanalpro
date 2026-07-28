import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { redirect } from "next/navigation";

const KPI_CARDS = [
  { label: "Offene Aufträge", value: "0" },
  { label: "Aufträge diese Woche", value: "0" },
  { label: "Aktive Mitarbeiter", value: "0" },
  { label: "Offene Rechnungen", value: "0" },
];

const WORKFLOW = [
  "Kunde anlegen oder auswählen",
  "Auftrag erstellen",
  "Mitarbeiter, Fahrzeuge & Maschinen zuweisen",
  "Auftrag erscheint automatisch im Außendienst",
  "Arbeiten, Material & Zeiten vor Ort dokumentieren",
  "Kunde unterschreibt digital",
  "Büro erstellt Angebot, Rechnung oder Abschlussbericht",
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getOrCreateProfile(supabase, user);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Willkommen{profile?.full_name ? `, ${profile.full_name}` : ""}
      </h1>
      <p className="mt-2 text-sm text-muted">
        Hier entsteht die Übersicht für {profile?.companies?.name ?? "Ihr Unternehmen"}.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_CARDS.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted">{kpi.label}</p>
            <p className="mt-2 text-2xl font-semibold">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Ihr Arbeitsablauf in KanalPro</h2>
        <ol className="mt-4 space-y-3">
          {WORKFLOW.map((step, i) => (
            <li key={step} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                {i + 1}
              </span>
              <span className="pt-0.5 text-sm">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
