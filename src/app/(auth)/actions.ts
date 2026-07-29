"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signUp(formData: FormData) {
  const companyName = String(formData.get("companyName") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!companyName || !fullName || !email || !password) {
    redirect("/register?error=Bitte+alle+Felder+ausf%C3%BCllen");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { company_name: companyName, full_name: fullName },
    },
  });

  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`);
  }

  if (!data.session) {
    redirect(
      "/login?message=Konto+erstellt.+Bitte+best%C3%A4tige+deine+E-Mail-Adresse+und+melde+dich+anschlie%C3%9Fend+an.",
    );
  }

  redirect("/dashboard");
}

function describeError(err: unknown): string {
  const parts: string[] = [];
  let current: unknown = err;
  let depth = 0;
  while (current && depth < 5) {
    if (current instanceof Error) {
      parts.push(`${current.name}: ${current.message}`);
      current = (current as Error & { cause?: unknown }).cause;
    } else {
      parts.push(String(current));
      current = undefined;
    }
    depth++;
  }
  return parts.join(" <- caused by: ");
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  // DEBUG: raw connectivity probe to the Supabase REST endpoint, bypassing
  // supabase-js entirely, to isolate whether the failure is in undici/fetch
  // itself or something supabase-js specific.
  try {
    const probeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://dgnmizmpeqiynlmzoyzl.supabase.co"}/auth/v1/health`;
    const probeRes = await fetch(probeUrl, { method: "GET" });
    console.error("[signIn debug] raw fetch probe status:", probeRes.status);
  } catch (probeErr) {
    console.error("[signIn debug] raw fetch probe FAILED:", describeError(probeErr));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("[signIn debug] supabase-js error:", describeError(error), JSON.stringify(error));
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
