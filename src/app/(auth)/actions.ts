"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function signUp(formData: FormData) {
  const inviteToken = String(formData.get("invite") ?? "").trim();
  const companyName = String(formData.get("companyName") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const inviteParam = inviteToken ? `invite=${encodeURIComponent(inviteToken)}&` : "";

  if ((!inviteToken && !companyName) || !fullName || !email || !password) {
    redirect(`/register?${inviteParam}error=Bitte+alle+Felder+ausf%C3%BCllen`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: inviteToken
        ? { invite_token: inviteToken, full_name: fullName }
        : { company_name: companyName, full_name: fullName },
    },
  });

  if (error) {
    redirect(`/register?${inviteParam}error=${encodeURIComponent(error.message)}`);
  }

  if (!data.session) {
    redirect(
      "/login?message=Konto+erstellt.+Bitte+best%C3%A4tige+deine+E-Mail-Adresse+und+melde+dich+anschlie%C3%9Fend+an.",
    );
  }

  redirect("/dashboard");
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect("/passwort-vergessen?error=Bitte+geben+Sie+Ihre+E-Mail-Adresse+ein");
  }

  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${protocol}://${host}/passwort-zuruecksetzen`,
  });

  // Aus Sicherheitsgründen immer dieselbe Meldung anzeigen, unabhängig
  // davon, ob zu der E-Mail-Adresse ein Konto existiert.
  redirect(
    "/passwort-vergessen?message=" +
      encodeURIComponent(
        "Falls ein Konto mit dieser E-Mail-Adresse existiert, haben wir einen Link zum Zurücksetzen gesendet.",
      ),
  );
}
