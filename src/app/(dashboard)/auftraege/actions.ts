"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { ORDER_STATUSES } from "@/lib/orders";

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

function readOrderForm(formData: FormData) {
  const statusRaw = String(formData.get("status") ?? "offen");
  return {
    title: String(formData.get("title") ?? "").trim(),
    description: emptyToNull(formData.get("description")),
    customer_id: emptyToNull(formData.get("customer_id")),
    assigned_to: emptyToNull(formData.get("assigned_to")),
    status: (ORDER_STATUSES as readonly string[]).includes(statusRaw) ? statusRaw : "offen",
    scheduled_date: emptyToNull(formData.get("scheduled_date")),
  };
}

export async function createOrder(formData: FormData) {
  const { supabase, companyId } = await requireCompanyContext();
  const fields = readOrderForm(formData);

  if (!fields.title) {
    redirect("/auftraege/neu?error=Titel+ist+erforderlich");
  }

  const { error } = await supabase.from("orders").insert({ ...fields, company_id: companyId });

  if (error) {
    redirect(`/auftraege/neu?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/auftraege");
  redirect("/auftraege");
}

export async function updateOrder(id: string, formData: FormData) {
  const { supabase } = await requireCompanyContext();
  const fields = readOrderForm(formData);

  if (!fields.title) {
    redirect(`/auftraege/${id}?error=Titel+ist+erforderlich`);
  }

  const { error } = await supabase.from("orders").update(fields).eq("id", id);

  if (error) {
    redirect(`/auftraege/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/auftraege");
  revalidatePath(`/auftraege/${id}`);
  redirect(`/auftraege/${id}?message=Gespeichert`);
}

export async function deleteOrder(id: string) {
  const { supabase } = await requireCompanyContext();
  await supabase.from("orders").delete().eq("id", id);
  revalidatePath("/auftraege");
  redirect("/auftraege");
}
