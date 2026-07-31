import Link from "next/link";
import { Mail } from "lucide-react";
import { signIn } from "@/app/(auth)/actions";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { SubmitButton } from "@/components/auth/SubmitButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Willkommen zurück
      </h1>
      <p className="mt-2 text-sm text-muted">
        Melden Sie sich mit Ihren Unternehmensdaten an.
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

      <form action={signIn} className="mt-7 space-y-5">
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

        <PasswordInput
          id="password"
          name="password"
          label="Passwort"
          placeholder="••••••••"
          autoComplete="current-password"
        />

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <label className="flex items-center gap-2 text-muted">
            <input
              type="checkbox"
              name="remember"
              defaultChecked
              className="h-4 w-4 rounded border-border text-brand focus:ring-2 focus:ring-brand/30"
            />
            Angemeldet bleiben
          </label>
          <Link
            href="/passwort-vergessen"
            className="font-medium text-brand transition hover:text-brand-dark"
          >
            Passwort vergessen?
          </Link>
        </div>

        <SubmitButton label="Anmelden" pendingLabel="Anmelden…" />
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        Noch kein Konto?{" "}
        <Link href="/register" className="font-semibold text-brand transition hover:text-brand-dark">
          Unternehmen registrieren
        </Link>
      </p>
    </>
  );
}
