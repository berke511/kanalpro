import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Impressum – KanalPro",
};

export default function ImpressumPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Link
        href="/login"
        className="flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </Link>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">Impressum</h1>
      <p className="mt-2 text-sm text-muted">
        Angaben gemäß § 5 TMG. Diese Seite wird in Kürze mit den vollständigen
        Unternehmensangaben ergänzt.
      </p>

      <div className="mt-8 space-y-1 text-sm text-foreground">
        <p className="font-medium">KanalPro</p>
        <p>Wird ergänzt</p>
        <p>Wird ergänzt</p>
      </div>

      <div className="mt-6 space-y-1 text-sm text-foreground">
        <p className="font-medium">Kontakt</p>
        <p>E-Mail: wird ergänzt</p>
      </div>
    </div>
  );
}
