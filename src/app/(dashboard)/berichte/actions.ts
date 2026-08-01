"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { todayBerlinISO } from "@/lib/date";

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

function readReportForm(formData: FormData) {
  const reportDateRaw = String(formData.get("report_date") ?? "").trim();
  return {
    order_id: String(formData.get("order_id") ?? "").trim(),
    report_date: reportDateRaw || todayBerlinISO(),
    work_performed: String(formData.get("work_performed") ?? "").trim(),
    hours_worked: toNumberOrNull(formData.get("hours_worked")),
    materials_notes: emptyToNull(formData.get("materials_notes")),
    customer_signature_name: emptyToNull(formData.get("customer_signature_name")),
  };
}

export async function createReport(formData: FormData) {
  const { supabase, companyId } = await requireCompanyContext();
  const fields = readReportForm(formData);

  if (!fields.order_id) {
    redirect("/berichte/neu?error=Auftrag+ist+erforderlich");
  }
  if (!fields.work_performed) {
    redirect("/berichte/neu?error=Beschreibung+der+Arbeiten+ist+erforderlich");
  }

  const signedAt = fields.customer_signature_name ? new Date().toISOString() : null;

  const { error } = await supabase.from("service_reports").insert({
    ...fields,
    report_date: fields.report_date ?? undefined,
    company_id: companyId,
    signed_at: signedAt,
  });

  if (error) {
    redirect(`/berichte/neu?error=${encodeURIComponent(error.message)}`);
  }

  if (signedAt) {
    await supabase.from("orders").update({ status: "abgeschlossen" }).eq("id", fields.order_id);
    revalidatePath("/auftraege");
    revalidatePath("/einsatzplanung");
  }

  revalidatePath("/berichte");
  redirect("/berichte");
}

export async function updateReport(id: string, formData: FormData) {
  const { supabase } = await requireCompanyContext();
  const fields = readReportForm(formData);

  if (!fields.order_id) {
    redirect(`/berichte/${id}?error=Auftrag+ist+erforderlich`);
  }
  if (!fields.work_performed) {
    redirect(`/berichte/${id}?error=Beschreibung+der+Arbeiten+ist+erforderlich`);
  }

  const { data: existing } = await supabase
    .from("service_reports")
    .select("signed_at")
    .eq("id", id)
    .maybeSingle();

  const signedAt = fields.customer_signature_name
    ? existing?.signed_at ?? new Date().toISOString()
    : null;

  const { error } = await supabase
    .from("service_reports")
    .update({ ...fields, signed_at: signedAt })
    .eq("id", id);

  if (error) {
    redirect(`/berichte/${id}?error=${encodeURIComponent(error.message)}`);
  }

  if (signedAt) {
    await supabase.from("orders").update({ status: "abgeschlossen" }).eq("id", fields.order_id);
    revalidatePath("/auftraege");
    revalidatePath("/einsatzplanung");
  }

  revalidatePath("/berichte");
  revalidatePath(`/berichte/${id}`);
  redirect(`/berichte/${id}?message=Gespeichert`);
}

export async function deleteReport(id: string) {
  const { supabase } = await requireCompanyContext();
  await supabase.from("service_reports").delete().eq("id", id);
  revalidatePath("/berichte");
  redirect("/berichte");
}
