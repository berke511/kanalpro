"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/auth/PasswordInput";

export default function PasswortZuruecksetzenPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");

    if (password.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }
    if (password !== confirm) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);
    setTimeout(() => {
      router.push("/login?message=" + encodeURIComponent("Passwort erfolgreich aktualisiert. Bitte melden Sie sich an."));
    }, 1500);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <CheckCircle2 className="h-10 w-10 text-brand" />
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
          Passwort aktualisiert
        </h1>
        <p className="mt-2 text-sm text-muted">Sie werden zur Anmeldung weitergeleitet…</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Neues Passwort festlegen
      </h1>
      <p className="mt-2 text-sm text-muted">
        Öffnen Sie diese Seite über den Link aus Ihrer E-Mail und vergeben Sie
        anschließend ein neues Passwort.
      </p>

      {error && (
        <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        <PasswordInput
          id="password"
          name="password"
          label="Neues Passwort"
          placeholder="Mindestens 6 Zeichen"
          autoComplete="new-password"
          minLength={6}
        />
        <PasswordInput
          id="confirm"
          name="confirm"
          label="Passwort bestätigen"
          placeholder="Mindestens 6 Zeichen"
          autoComplete="new-password"
          minLength={6}
        />

        <button
          type="submit"
          disabled={pending}
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-dark px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition hover:shadow-xl hover:shadow-brand/30 hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-80"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Wird gespeichert…
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Passwort speichern
            </>
          )}
        </button>
      </form>
    </>
  );
}
