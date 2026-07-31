import Link from "next/link";
import { Building2, Mail, User } from "lucide-react";
import { signUp } from "@/app/(auth)/actions";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { SubmitButton } from "@/components/auth/SubmitButton";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; invite?: string }>;
}) {
  const { error, invite } = await searchParams;

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {invite ? "Einladung annehmen" : "Unternehmen registrieren"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {invite
          ? "Erstellen Sie Ihr Konto, um dem Team beizutreten."
          : "Erstellen Sie Ihren eigenen KanalPro-Arbeitsbereich."}
      </p>

      {error && (
        <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form action={signUp} className="mt-7 space-y-5">
        {invite && <input type="hidden" name="invite" value={invite} />}
        {!invite && (
          <div>
            <label htmlFor="companyName" className="text-sm font-medium text-foreground">
              Firmenname
            </label>
            <div className="relative mt-1.5">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                id="companyName"
                name="companyName"
                type="text"
                required
                autoFocus
                placeholder="Musterfirma GmbH"
                className="w-full rounded-xl border border-border bg-background/60 py-2.5 pl-10 pr-3 text-base outline-none transition focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10 sm:text-sm"
              />
            </div>
          </div>
        )}
        <div>
          <label htmlFor="fullName" className="text-sm font-medium text-foreground">
            Ihr Name
          </label>
          <div className="relative mt-1.5">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              autoFocus={Boolean(invite)}
              placeholder="Max Mustermann"
              className="w-full rounded-xl border border-border bg-background/60 py-2.5 pl-10 pr-3 text-base outline-none transition focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10 sm:text-sm"
            />
          </div>
        </div>
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
              placeholder="name@unternehmen.de"
              className="w-full rounded-xl border border-border bg-background/60 py-2.5 pl-10 pr-3 text-base outline-none transition focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10 sm:text-sm"
            />
          </div>
        </div>

        <PasswordInput
          id="password"
          name="password"
          label="Passwort"
          placeholder="Mindestens 6 Zeichen"
          autoComplete="new-password"
          minLength={6}
        />

        <SubmitButton label="Konto erstellen" pendingLabel="Konto wird erstellt…" />
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        Bereits registriert?{" "}
        <Link href="/login" className="font-semibold text-brand transition hover:text-brand-dark">
          Anmelden
        </Link>
      </p>
    </>
  );
}
