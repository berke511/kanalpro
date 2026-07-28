import Link from "next/link";

const MODULES = [
  { title: "Kundenverwaltung", desc: "Kompletter Kundenstamm mit Historie, Objekten und Ansprechpartnern." },
  { title: "Auftragsmanagement", desc: "Aufträge anlegen, Mitarbeitern zuweisen und den Status live verfolgen." },
  { title: "Einsatzplanung & Disposition", desc: "Fahrzeuge, Maschinen und Teams übersichtlich einplanen." },
  { title: "Einsatzberichte & Unterschrift", desc: "Vor-Ort-Dokumentation mit Fotos und digitaler Kundenunterschrift." },
  { title: "Angebote & Rechnungen", desc: "Aus abgeschlossenen Aufträgen direkt Angebote und Rechnungen erstellen." },
  { title: "Auswertungen & Kennzahlen", desc: "Immer den aktuellen Überblick über Ihr Unternehmen behalten." },
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

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">KanalPro</span>
          <nav className="flex items-center gap-3 text-sm font-medium">
            <Link href="/login" className="text-muted hover:text-foreground">
              Anmelden
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-brand px-4 py-2 text-white hover:bg-brand-dark"
            >
              Kostenlos starten
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <p className="mx-auto mb-4 w-fit rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
            Für die Rohr-, Kanal- und Industrieservicebranche
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Eine Plattform für Ihren gesamten Betrieb
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
            KanalPro ersetzt Papierformulare, Excel-Tabellen und WhatsApp durch eine
            zentrale, moderne Software – von der Kundenverwaltung bis zur Rechnung.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/register"
              className="rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Jetzt Unternehmen anlegen
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold hover:bg-brand-soft"
            >
              Ich habe bereits ein Konto
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => (
              <div key={m.title} className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-semibold">{m.title}</h3>
                <p className="mt-2 text-sm text-muted">{m.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-card">
          <div className="mx-auto max-w-4xl px-6 py-16">
            <h2 className="text-center text-2xl font-semibold tracking-tight">
              Vom Auftragseingang bis zur Rechnung
            </h2>
            <ol className="mt-8 space-y-4">
              {WORKFLOW.map((step, i) => (
                <li key={step} className="flex items-start gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-sm text-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        © {new Date().getFullYear()} KanalPro
      </footer>
    </div>
  );
}
