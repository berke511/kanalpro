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

function readCustomerForm(formData: FormData) {
  const kindRaw = String(formData.get("kind") ?? "privat");
  return {
    kind: kindRaw === "firma" ? "firma" : "privat",
    name: String(formData.get("name") ?? "").trim(),
    contact_person: emptyToNull(formData.get("contact_person")),
    email: emptyToNull(formData.get("email")),
    phone: emptyToNull(formData.get("phone")),
    street: emptyToNull(formData.get("street")),
    postal_code: emptyToNull(formData.get("postal_code")),
    city: emptyToNull(formData.get("city")),
    notes: emptyToNull(formData.get("notes")),
  };
}

export async function createCustomer(formData: FormData) {
  const { supabase, companyId } = await requireCompanyContext();
  const fields = readCustomerForm(formData);

  if (!fields.name) {
    redirect("/kunden/neu?error=Name+ist+erforderlich");
  }

  const { error } = await supabase
    .from("customers")
    .insert({ ...fields, company_id: companyId });

  if (error) {
    redirect(`/kunden/neu?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/kunden");
  redirect("/kunden");
}

export async function updateCustomer(id: string, formData: FormData) {
  const { supabase } = await requireCompanyContext();
  const fields = readCustomerForm(formData);

  if (!fields.name) {
    redirect(`/kunden/${id}?error=Name+ist+erforderlich`);
  }

  const { error } = await supabase.from("customers").update(fields).eq("id", id);

  if (error) {
    redirect(`/kunden/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/kunden");
  revalidatePath(`/kunden/${id}`);
  redirect(`/kunden/${id}?message=Gespeichert`);
}

export async function deleteCustomer(id: string) {
  const { supabase } = await requireCompanyContext();
  await supabase.from("customers").delete().eq("id", id);
  revalidatePath("/kunden");
  redirect("/kunden");
}
