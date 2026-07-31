import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { requestPasswordReset } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/auth/SubmitButton";

export default async function PasswortVergessenPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Passwort zurücksetzen
      </h1>
      <p className="mt-2 text-sm text-muted">
        Geben Sie Ihre E-Mail-Adresse ein. Wir senden Ihnen einen Link zum
        Zurücksetzen Ihres Passworts.
      </p>

      {message && (
        <p className="mt-5 rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand-dark">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!message && (
        <form action={requestPasswordReset} className="mt-7 space-y-5">
          <div>
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              E-Mail
            </label>
            <div className="relative mt-1.5">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                placeholder="name@unternehmen.de"
                className="w-full rounded-xl border border-border bg-background/60 py-2.5 pl-10 pr-3 text-base outline-none transition focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10 sm:text-sm"
              />
            </div>
          </div>

          <SubmitButton label="Link senden" pendingLabel="Wird gesendet…" />
        </form>
      )}

      <Link
        href="/login"
        className="mt-8 flex items-center justify-center gap-1.5 text-sm font-medium text-muted transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Anmeldung
      </Link>
    </>
  );
}
