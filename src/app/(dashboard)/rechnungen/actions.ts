"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { INVOICE_KINDS, INVOICE_STATUSES } from "@/lib/invoices";
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

function readInvoiceForm(formData: FormData) {
  const kindRaw = String(formData.get("kind") ?? "rechnung");
  const statusRaw = String(formData.get("status") ?? "entwurf");
  const issueDateRaw = String(formData.get("issue_date") ?? "").trim();
  return {
    kind: (INVOICE_KINDS as readonly string[]).includes(kindRaw) ? kindRaw : "rechnung",
    status: (INVOICE_STATUSES as readonly string[]).includes(statusRaw) ? statusRaw : "entwurf",
    order_id: emptyToNull(formData.get("order_id")),
    customer_id: emptyToNull(formData.get("customer_id")),
    invoice_number: emptyToNull(formData.get("invoice_number")),
    issue_date: issueDateRaw || todayBerlinISO(),
    due_date: emptyToNull(formData.get("due_date")),
    notes: emptyToNull(formData.get("notes")),
  };
}

export async function createInvoice(formData: FormData) {
  const { supabase, companyId } = await requireCompanyContext();
  const fields = readInvoiceForm(formData);

  let customerId = fields.customer_id;
  if (!customerId && fields.order_id) {
    const { data: order } = await supabase
      .from("orders")
      .select("customer_id")
      .eq("id", fields.order_id)
      .maybeSingle();
    customerId = order?.customer_id ?? null;
  }

  const { data, error } = await supabase
    .from("invoices")
    .insert({ ...fields, customer_id: customerId, company_id: companyId })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/rechnungen/neu?error=${encodeURIComponent(error?.message ?? "Unbekannter Fehler")}`);
  }

  revalidatePath("/rechnungen");
  redirect(`/rechnungen/${data.id}`);
}

export async function updateInvoice(id: string, formData: FormData) {
  const { supabase } = await requireCompanyContext();
  const fields = readInvoiceForm(formData);

  const { error } = await supabase.from("invoices").update(fields).eq("id", id);

  if (error) {
    redirect(`/rechnungen/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/rechnungen");
  revalidatePath(`/rechnungen/${id}`);
  redirect(`/rechnungen/${id}?message=Gespeichert`);
}

export async function deleteInvoice(id: string) {
  const { supabase } = await requireCompanyContext();
  await supabase.from("invoices").delete().eq("id", id);
  revalidatePath("/rechnungen");
  redirect("/rechnungen");
}

export async function addInvoiceItem(invoiceId: string, formData: FormData) {
  const { supabase, companyId } = await requireCompanyContext();

  const description = String(formData.get("description") ?? "").trim();
  const quantity = toNumberOrNull(formData.get("quantity")) ?? 1;
  const unitPrice = toNumberOrNull(formData.get("unit_price")) ?? 0;

  if (!description) {
    redirect(`/rechnungen/${invoiceId}?error=Beschreibung+ist+erforderlich`);
  }

  const { data: existing } = await supabase
    .from("invoice_items")
    .select("position")
    .eq("invoice_id", invoiceId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = (existing?.[0]?.position ?? -1) + 1;

  const { error } = await supabase.from("invoice_items").insert({
    invoice_id: invoiceId,
    company_id: companyId,
    description,
    quantity,
    unit_price: unitPrice,
    position: nextPosition,
  });

  if (error) {
    redirect(`/rechnungen/${invoiceId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/rechnungen/${invoiceId}`);
  redirect(`/rechnungen/${invoiceId}?message=Position+hinzugef%C3%BCgt`);
}

export async function deleteInvoiceItem(invoiceId: string, itemId: string) {
  const { supabase } = await requireCompanyContext();
  await supabase.from("invoice_items").delete().eq("id", itemId);
  revalidatePath(`/rechnungen/${invoiceId}`);
  redirect(`/rechnungen/${invoiceId}`);
}
