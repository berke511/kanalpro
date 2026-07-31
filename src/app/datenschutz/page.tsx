import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Datenschutz – KanalPro",
};

export default function DatenschutzPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Link
        href="/login"
        className="flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </Link>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
        Datenschutzerklärung
      </h1>
      <p className="mt-2 text-sm text-muted">
        Diese Seite wird in Kürze mit der vollständigen Datenschutzerklärung
        gemäß DSGVO ergänzt. KanalPro verarbeitet Ihre Daten ausschließlich
        auf Servern in Deutschland.
      </p>

      <div className="mt-8 space-y-4 text-sm text-foreground">
        <div>
          <p className="font-medium">Verantwortlicher</p>
          <p className="text-muted">Wird ergänzt</p>
        </div>
        <div>
          <p className="font-medium">Hosting</p>
          <p className="text-muted">Serverstandort Deutschland (Supabase, eu-central-1)</p>
        </div>
      </div>
    </div>
  );
}
