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

  return { supabase };
}

export async function scheduleOrder(formData: FormData) {
  const { supabase } = await requireCompanyContext();

  const id = String(formData.get("order_id") ?? "");
  const week = String(formData.get("week") ?? "0");
  const scheduledDateRaw = String(formData.get("scheduled_date") ?? "").trim();
  const assignedToRaw = String(formData.get("assigned_to") ?? "").trim();

  if (!id || !scheduledDateRaw) {
    redirect(`/einsatzplanung?week=${week}&error=Datum+ist+erforderlich`);
  }

  const { error } = await supabase
    .from("orders")
    .update({
      scheduled_date: scheduledDateRaw,
      assigned_to: assignedToRaw.length ? assignedToRaw : null,
      status: "eingeplant",
    })
    .eq("id", id);

  if (error) {
    redirect(`/einsatzplanung?week=${week}&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/einsatzplanung");
  revalidatePath("/auftraege");
  redirect(`/einsatzplanung?week=${week}&message=Auftrag+eingeplant`);
}

export async function unscheduleOrder(formData: FormData) {
  const { supabase } = await requireCompanyContext();

  const id = String(formData.get("order_id") ?? "");
  const week = String(formData.get("week") ?? "0");

  const { error } = await supabase.from("orders").update({ scheduled_date: null }).eq("id", id);

  if (error) {
    redirect(`/einsatzplanung?week=${week}&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/einsatzplanung");
  revalidatePath("/auftraege");
  redirect(`/einsatzplanung?week=${week}&message=Termin+entfernt`);
}
