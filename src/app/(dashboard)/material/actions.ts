"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";

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

function toNumberOrNull(value: FormDataEntryValue | null) {
  const str = String(value ?? "").trim();
  if (!str) return null;
  const num = Number(str.replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

function readMaterialForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    unit: String(formData.get("unit") ?? "").trim() || "Stück",
    quantity: toNumberOrNull(formData.get("quantity")) ?? 0,
    min_quantity: toNumberOrNull(formData.get("min_quantity")),
    unit_price: toNumberOrNull(formData.get("unit_price")),
    notes: emptyToNull(formData.get("notes")),
  };
}

export async function createMaterial(formData: FormData) {
  const { supabase, companyId } = await requireCompanyContext();
  const fields = readMaterialForm(formData);

  if (!fields.name) {
    redirect("/material/neu?error=Name+ist+erforderlich");
  }

  const { error } = await supabase.from("materials").insert({ ...fields, company_id: companyId });

  if (error) {
    redirect(`/material/neu?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/material");
  redirect("/material");
}

export async function updateMaterial(id: string, formData: FormData) {
  const { supabase } = await requireCompanyContext();
  const fields = readMaterialForm(formData);

  if (!fields.name) {
    redirect(`/material/${id}?error=Name+ist+erforderlich`);
  }

  const { error } = await supabase.from("materials").update(fields).eq("id", id);

  if (error) {
    redirect(`/material/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/material");
  revalidatePath(`/material/${id}`);
  redirect(`/material/${id}?message=Gespeichert`);
}

export async function deleteMaterial(id: string) {
  const { supabase } = await requireCompanyContext();
  await supabase.from("materials").delete().eq("id", id);
  revalidatePath("/material");
  redirect("/material");
}
