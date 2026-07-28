import Link from "next/link";
import { signUp } from "@/app/(auth)/actions";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      <h1 className="text-lg font-semibold">Unternehmen registrieren</h1>
      <p className="mt-1 text-sm text-muted">
        Erstellen Sie Ihren eigenen KanalPro-Arbeitsbereich.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form action={signUp} className="mt-6 space-y-4">
        <div>
          <label htmlFor="companyName" className="text-sm font-medium">
            Firmenname
          </label>
          <input
            id="companyName"
            name="companyName"
            type="text"
            required
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>
        <div>
          <label htmlFor="fullName" className="text-sm font-medium">
            Ihr Name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>
        <div>
          <label htmlFor="email" className="text-sm font-medium">
            E-Mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-medium">
            Passwort
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Konto erstellen
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Bereits registriert?{" "}
        <Link href="/login" className="font-medium text-brand">
          Anmelden
        </Link>
      </p>
    </>
  );
}
