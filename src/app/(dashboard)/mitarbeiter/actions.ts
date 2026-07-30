"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";

async function requireAdminContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getOrCreateProfile(supabase, user);

  if (!profile) {
    redirect("/login?error=Profil+konnte+nicht+geladen+werden");
  }

  if (profile.role !== "owner" && profile.role !== "admin") {
    redirect("/mitarbeiter?error=Nur+Owner+oder+Admin+d%C3%BCrfen+das");
  }

  return { supabase, profile };
}

export async function createInvite(formData: FormData) {
  const { supabase, profile } = await requireAdminContext();
  const roleRaw = String(formData.get("role") ?? "mitarbeiter");
  const role = roleRaw === "admin" ? "admin" : "mitarbeiter";

  const { error } = await supabase.from("company_invites").insert({
    company_id: profile.company_id,
    role,
    created_by: profile.id,
  });

  if (error) {
    redirect(`/mitarbeiter?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/mitarbeiter");
  redirect("/mitarbeiter?message=Einladung+erstellt");
}

export async function revokeInvite(id: string) {
  const { supabase } = await requireAdminContext();
  await supabase.from("company_invites").delete().eq("id", id);
  revalidatePath("/mitarbeiter");
  redirect("/mitarbeiter");
}

export async function updateEmployeeRole(id: string, formData: FormData) {
  const { supabase } = await requireAdminContext();
  const roleRaw = String(formData.get("role") ?? "mitarbeiter");
  const role = roleRaw === "owner" || roleRaw === "admin" ? roleRaw : "mitarbeiter";

  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);

  if (error) {
    redirect(`/mitarbeiter?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/mitarbeiter");
  redirect("/mitarbeiter?message=Rolle+aktualisiert");
}

export async function removeEmployee(id: string) {
  const { supabase } = await requireAdminContext();
  await supabase.from("profiles").delete().eq("id", id);
  revalidatePath("/mitarbeiter");
  redirect("/mitarbeiter");
}

export async function getInviteUrl(token: string) {
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}/register?invite=${token}`;
}
