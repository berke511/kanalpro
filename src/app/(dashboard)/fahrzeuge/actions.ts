"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { FLEET_KINDS, FLEET_STATUSES } from "@/lib/fleet";

async function requireCompanyContext() {
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

  return { supabase, companyId: profile.company_id };
}

function emptyToNull(value: FormDataEntryValue | null) {
  const str = String(value ?? "").trim();
  return str.length ? str : null;
}

function readFleetForm(formData: FormData) {
  const kindRaw = String(formData.get("kind") ?? "fahrzeug");
  const statusRaw = String(formData.get("status") ?? "verfuegbar");
  return {
    kind: (FLEET_KINDS as readonly string[]).includes(kindRaw) ? kindRaw : "fahrzeug",
    name: String(formData.get("name") ?? "").trim(),
    license_plate: emptyToNull(formData.get("license_plate")),
    status: (FLEET_STATUSES as readonly string[]).includes(statusRaw) ? statusRaw : "verfuegbar",
    notes: emptyToNull(formData.get("notes")),
  };
}

export async function createFleetItem(formData: FormData) {
  const { supabase, companyId } = await requireCompanyContext();
  const fields = readFleetForm(formData);

  if (!fields.name) {
    redirect("/fahrzeuge/neu?error=Name+ist+erforderlich");
  }

  const { error } = await supabase.from("fleet_items").insert({ ...fields, company_id: companyId });

  if (error) {
    redirect(`/fahrzeuge/neu?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/fahrzeuge");
  redirect("/fahrzeuge");
}

export async function updateFleetItem(id: string, formData: FormData) {
  const { supabase } = await requireCompanyContext();
  const fields = readFleetForm(formData);

  if (!fields.name) {
    redirect(`/fahrzeuge/${id}?error=Name+ist+erforderlich`);
  }

  const { error } = await supabase.from("fleet_items").update(fields).eq("id", id);

  if (error) {
    redirect(`/fahrzeuge/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/fahrzeuge");
  revalidatePath(`/fahrzeuge/${id}`);
  redirect(`/fahrzeuge/${id}?message=Gespeichert`);
}

export async function deleteFleetItem(id: string) {
  const { supabase } = await requireCompanyContext();
  await supabase.from("fleet_items").delete().eq("id", id);
  revalidatePath("/fahrzeuge");
  redirect("/fahrzeuge");
}
