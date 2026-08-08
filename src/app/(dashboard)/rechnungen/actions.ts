"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { canCreateOrdersAndLinkCommercialDocuments } from "@/lib/roles";
import { INVOICE_KINDS, PAYMENT_METHODS, statusesForKind } from "@/lib/invoices";
import { todayBerlinISO } from "@/lib/date";
import type { Database } from "@/lib/supabase/types";

type DbClient = Awaited<ReturnType<typeof createClient>>;
type InvoiceUpdate = Database["public"]["Tables"]["invoices"]["Update"];

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

  return { supabase, companyId: profile.company_id, userId: user.id, role: profile.role };
}

// Nur Büro/Disponent* mit kaufmännischer Berechtigung sowie Admin/
// Geschäftsführer/Owner dürfen Angebote/Rechnungen anlegen oder ändern
// (*siehe canCreateOrdersAndLinkCommercialDocuments – aktuell buero +
// volle Rechte-Rollen, gleiche Regel wie beim Verknüpfen aus einem
// Auftrag heraus). Ansehen dürfen weiterhin alle Firmenmitglieder
// (RLS lässt das wie bisher zu).
async function requireInvoiceAdminContext() {
  const { supabase, role, ...rest } = await requireCompanyContext();
  if (!canCreateOrdersAndLinkCommercialDocuments(role)) {
    redirect("/rechnungen?error=Daf%C3%BCr+fehlt+dir+die+Berechtigung");
  }
  return { supabase, role, ...rest };
}

function withError(returnTo: string, message: string) {
  const sep = returnTo.includes("?") ? "&" : "?";
  return `${returnTo}${sep}error=${encodeURIComponent(message)}`;
}

function withMessage(returnTo: string, message: string) {
  const sep = returnTo.includes("?") ? "&" : "?";
  return `${returnTo}${sep}message=${encodeURIComponent(message)}`;
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

async function logInvoiceHistory(
  supabase: DbClient,
  params: { companyId: string; invoiceId: string; invoiceLabel: string | null; actorId: string; action: string; summary: string },
) {
  await supabase.from("invoice_history").insert({
    company_id: params.companyId,
    invoice_id: params.invoiceId,
    invoice_label: params.invoiceLabel,
    actor_id: params.actorId,
    action: params.action,
    summary: params.summary,
  });
}

function readInvoiceForm(formData: FormData, kind: string) {
  const statusRaw = String(formData.get("status") ?? "entwurf");
  const validStatuses = statusesForKind(kind);
  const issueDateRaw = String(formData.get("issue_date") ?? "").trim();
  const paymentMethodRaw = String(formData.get("payment_method") ?? "");
  return {
    order_id: emptyToNull(formData.get("order_id")),
    customer_id: emptyToNull(formData.get("customer_id")),
    assigned_to: emptyToNull(formData.get("assigned_to")),
    invoice_number: emptyToNull(formData.get("invoice_number")),
    status: validStatuses.includes(statusRaw) ? statusRaw : "entwurf",
    issue_date: issueDateRaw || todayBerlinISO(),
    due_date: emptyToNull(formData.get("due_date")),
    valid_until: emptyToNull(formData.get("valid_until")),
    tax_rate: toNumberOrNull(formData.get("tax_rate")) ?? 19,
    payment_method: (PAYMENT_METHODS as readonly string[]).includes(paymentMethodRaw) ? paymentMethodRaw : null,
    notes: emptyToNull(formData.get("notes")),
  };
}

// =====================================================================
// Anlegen / Bearbeiten
// =====================================================================

/**
 * Legt ein neues Angebot oder eine neue Rechnung an. Schützt (wie beim
 * Einsatzberichte-Assistenten, siehe berichte/actions.ts) per
 * client-seitig erzeugtem Token vor Doppel-Anlage bei Doppelklick/
 * Netzwerk-Retry: ein zweiter Submit mit demselben Token führt nicht zu
 * einem Duplikat, sondern leitet zum bereits angelegten Dokument um.
 */
export async function createInvoice(formData: FormData) {
  const { supabase, companyId, userId } = await requireInvoiceAdminContext();

  const kindRaw = String(formData.get("kind") ?? "rechnung");
  const kind = (INVOICE_KINDS as readonly string[]).includes(kindRaw) ? kindRaw : "rechnung";
  const submitToken = emptyToNull(formData.get("client_submit_token"));

  if (submitToken) {
    const { data: existing } = await supabase
      .from("invoices")
      .select("id")
      .eq("company_id", companyId)
      .eq("client_submit_token", submitToken)
      .maybeSingle();
    if (existing) {
      redirect(`/rechnungen?panel=${existing.id}`);
    }
  }

  const fields = readInvoiceForm(formData, kind);

  let customerId = fields.customer_id;
  if (!customerId && fields.order_id) {
    const { data: order } = await supabase.from("orders").select("customer_id").eq("id", fields.order_id).maybeSingle();
    customerId = order?.customer_id ?? null;
  }

  const { data: numberData } = await supabase.rpc("next_invoice_number", { p_company_id: companyId, p_kind: kind });

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      ...fields,
      kind,
      customer_id: customerId,
      company_id: companyId,
      assigned_to: fields.assigned_to ?? userId,
      invoice_number: fields.invoice_number ?? numberData ?? null,
      client_submit_token: submitToken,
    })
    .select("id, invoice_number")
    .single();

  if (error) {
    if (error.code === "23505" && submitToken) {
      const { data: existing } = await supabase
        .from("invoices")
        .select("id")
        .eq("company_id", companyId)
        .eq("client_submit_token", submitToken)
        .maybeSingle();
      if (existing) redirect(`/rechnungen?panel=${existing.id}`);
    }
    redirect(`/rechnungen/neu?error=${encodeURIComponent(error.message)}`);
  }
  if (!data) {
    redirect(`/rechnungen/neu?error=Unbekannter+Fehler`);
  }

  await logInvoiceHistory(supabase, {
    companyId,
    invoiceId: data.id,
    invoiceLabel: data.invoice_number,
    actorId: userId,
    action: "created",
    summary: `${kind === "angebot" ? "Angebot" : "Rechnung"} angelegt`,
  });

  revalidatePath("/rechnungen");
  redirect(`/rechnungen?panel=${data.id}&message=${encodeURIComponent("Angelegt")}`);
}

export async function updateInvoice(id: string, returnTo: string, formData: FormData) {
  const { supabase, companyId, userId } = await requireInvoiceAdminContext();

  const { data: current } = await supabase.from("invoices").select("kind, status, invoice_number").eq("id", id).maybeSingle();
  if (!current) redirect(withError(returnTo, "Nicht gefunden"));

  const fields = readInvoiceForm(formData, current.kind);
  const { error } = await supabase.from("invoices").update(fields).eq("id", id);

  if (error) {
    redirect(withError(returnTo, error.message));
  }

  if (fields.status !== current.status) {
    await logInvoiceHistory(supabase, {
      companyId,
      invoiceId: id,
      invoiceLabel: fields.invoice_number ?? current.invoice_number,
      actorId: userId,
      action: "status_changed",
      summary: `Status geändert zu „${fields.status}"`,
    });
  }

  revalidatePath("/rechnungen");
  redirect(withMessage(returnTo, "Gespeichert"));
}

export async function deleteInvoice(id: string, returnTo: string) {
  const { supabase } = await requireInvoiceAdminContext();

  const { data: current } = await supabase.from("invoices").select("paid_amount, status").eq("id", id).maybeSingle();
  if (current && (Number(current.paid_amount) > 0 || current.status === "bezahlt")) {
    redirect(withError(returnTo, "Bereits (teil-)bezahlte Dokumente können nicht gelöscht werden – bitte stattdessen archivieren"));
  }

  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) {
    redirect(withError("/rechnungen", error.code === "23503" ? "Dieses Dokument ist verknüpft und kann nicht gelöscht werden – bitte archivieren" : error.message));
  }
  revalidatePath("/rechnungen");
  redirect("/rechnungen?message=" + encodeURIComponent("Gelöscht"));
}

export async function archiveInvoice(id: string, archived: boolean, returnTo: string) {
  const { supabase, companyId, userId } = await requireInvoiceAdminContext();
  const { data: current } = await supabase.from("invoices").select("invoice_number").eq("id", id).maybeSingle();

  await supabase
    .from("invoices")
    .update({ is_archived: archived, archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id);

  await logInvoiceHistory(supabase, {
    companyId,
    invoiceId: id,
    invoiceLabel: current?.invoice_number ?? null,
    actorId: userId,
    action: archived ? "archived" : "unarchived",
    summary: archived ? "Archiviert" : "Aus dem Archiv geholt",
  });

  revalidatePath("/rechnungen");
  redirect(returnTo);
}

/** Dupliziert ein Angebot/eine Rechnung inkl. Positionen als neuen Entwurf. */
export async function duplicateInvoice(id: string, returnTo: string) {
  const { supabase, companyId, userId } = await requireInvoiceAdminContext();

  const { data: source } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
  if (!source) redirect(withError(returnTo, "Nicht gefunden"));

  const { data: sourceItems } = await supabase
    .from("invoice_items")
    .select("description, quantity, unit_price, position")
    .eq("invoice_id", id)
    .order("position", { ascending: true });

  const { data: numberData } = await supabase.rpc("next_invoice_number", { p_company_id: companyId, p_kind: source.kind });

  const { data: copy, error } = await supabase
    .from("invoices")
    .insert({
      company_id: companyId,
      customer_id: source.customer_id,
      order_id: source.order_id,
      kind: source.kind,
      status: "entwurf",
      issue_date: todayBerlinISO(),
      due_date: null,
      valid_until: null,
      tax_rate: source.tax_rate,
      notes: source.notes,
      assigned_to: userId,
      invoice_number: numberData ?? null,
    })
    .select("id")
    .single();

  if (error || !copy) {
    redirect(withError(returnTo, error?.message ?? "Kopieren fehlgeschlagen"));
  }

  if (sourceItems && sourceItems.length > 0) {
    await supabase.from("invoice_items").insert(
      sourceItems.map((item) => ({
        invoice_id: copy!.id,
        company_id: companyId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        position: item.position,
      })),
    );
  }

  await logInvoiceHistory(supabase, {
    companyId,
    invoiceId: copy!.id,
    invoiceLabel: numberData ?? null,
    actorId: userId,
    action: "created",
    summary: `Kopiert von ${source.invoice_number ?? "einem anderen Dokument"}`,
  });

  revalidatePath("/rechnungen");
  redirect(`/rechnungen?panel=${copy!.id}&message=${encodeURIComponent("Kopiert")}`);
}

// =====================================================================
// Positionen
// =====================================================================

export async function addInvoiceItem(invoiceId: string, returnTo: string, formData: FormData) {
  const { supabase, companyId } = await requireInvoiceAdminContext();

  const description = String(formData.get("description") ?? "").trim();
  const quantity = toNumberOrNull(formData.get("quantity")) ?? 1;
  const unitPrice = toNumberOrNull(formData.get("unit_price")) ?? 0;

  if (!description) {
    redirect(withError(returnTo, "Beschreibung ist erforderlich"));
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

  if (error) redirect(withError(returnTo, error.message));

  revalidatePath("/rechnungen");
  redirect(withMessage(returnTo, "Position hinzugefügt"));
}

export async function updateInvoiceItem(itemId: string, returnTo: string, formData: FormData) {
  const { supabase } = await requireInvoiceAdminContext();

  const description = String(formData.get("description") ?? "").trim();
  const quantity = toNumberOrNull(formData.get("quantity")) ?? 1;
  const unitPrice = toNumberOrNull(formData.get("unit_price")) ?? 0;

  if (!description) redirect(withError(returnTo, "Beschreibung ist erforderlich"));

  const { error } = await supabase.from("invoice_items").update({ description, quantity, unit_price: unitPrice }).eq("id", itemId);
  if (error) redirect(withError(returnTo, error.message));

  revalidatePath("/rechnungen");
  redirect(withMessage(returnTo, "Position aktualisiert"));
}

export async function deleteInvoiceItem(invoiceId: string, itemId: string, returnTo: string) {
  const { supabase } = await requireInvoiceAdminContext();
  await supabase.from("invoice_items").delete().eq("id", itemId);
  revalidatePath("/rechnungen");
  redirect(returnTo);
}

// =====================================================================
// Workflow / Schnellaktionen
// =====================================================================

/** Versenden: Angebot entwurf→versendet, Rechnung entwurf→offen. */
export async function sendInvoice(id: string, returnTo: string) {
  const { supabase, companyId, userId } = await requireInvoiceAdminContext();
  const { data: current } = await supabase.from("invoices").select("kind, invoice_number, status").eq("id", id).maybeSingle();
  if (!current) redirect(withError(returnTo, "Nicht gefunden"));

  const nextStatus = current.kind === "angebot" ? "versendet" : "offen";
  await supabase.from("invoices").update({ status: nextStatus, sent_at: new Date().toISOString() }).eq("id", id);

  await logInvoiceHistory(supabase, {
    companyId,
    invoiceId: id,
    invoiceLabel: current.invoice_number,
    actorId: userId,
    action: "sent",
    summary: current.kind === "angebot" ? "Angebot als versendet markiert" : "Rechnung als versendet markiert",
  });

  revalidatePath("/rechnungen");
  redirect(withMessage(returnTo, "Als versendet markiert"));
}

/** Generischer Statuswechsel für einfache Übergänge ohne Nebeneffekte
 * (Angenommen/Abgelehnt/Storniert/manuelle Korrekturen). Liest den
 * gewählten Status aus formData, damit sich das Panel-Dropdown wie bei
 * MaterialDetailPanel per onChange-Auto-Submit bedienen lässt. */
export async function setInvoiceStatus(id: string, returnTo: string, formData: FormData) {
  const { supabase, companyId, userId } = await requireInvoiceAdminContext();
  const status = String(formData.get("status") ?? "");
  const { data: current } = await supabase.from("invoices").select("kind, invoice_number").eq("id", id).maybeSingle();
  if (!current) redirect(withError(returnTo, "Nicht gefunden"));
  if (!statusesForKind(current.kind).includes(status)) redirect(withError(returnTo, "Ungültiger Status"));

  await supabase.from("invoices").update({ status }).eq("id", id);

  await logInvoiceHistory(supabase, {
    companyId,
    invoiceId: id,
    invoiceLabel: current.invoice_number,
    actorId: userId,
    action: "status_changed",
    summary: `Status geändert zu „${status}"`,
  });

  revalidatePath("/rechnungen");
  redirect(withMessage(returnTo, "Status aktualisiert"));
}

/** Zahlung erfassen: addiert den erfassten Betrag auf paid_amount und
 * berechnet daraus automatisch offen/teilbezahlt/bezahlt (Rechnungen). */
export async function recordPayment(id: string, returnTo: string, formData: FormData) {
  const { supabase, companyId, userId } = await requireInvoiceAdminContext();

  const { data: current } = await supabase
    .from("invoices")
    .select("kind, invoice_number, paid_amount, tax_rate")
    .eq("id", id)
    .maybeSingle();
  if (!current) redirect(withError(returnTo, "Nicht gefunden"));
  if (current.kind !== "rechnung") redirect(withError(returnTo, "Zahlungen können nur für Rechnungen erfasst werden"));

  const amount = toNumberOrNull(formData.get("amount"));
  if (!amount || amount <= 0) redirect(withError(returnTo, "Bitte einen gültigen Betrag eingeben"));

  const methodRaw = String(formData.get("payment_method") ?? "");
  const method = (PAYMENT_METHODS as readonly string[]).includes(methodRaw) ? methodRaw : null;
  const paymentDate = emptyToNull(formData.get("payment_date")) ?? todayBerlinISO();

  const { data: items } = await supabase.from("invoice_items").select("quantity, unit_price").eq("invoice_id", id);
  const net = (items ?? []).reduce((sum, i) => sum + Number(i.quantity) * Number(i.unit_price), 0);
  const gross = net * (1 + Number(current.tax_rate ?? 19) / 100);

  const newPaid = Number(current.paid_amount) + amount!;
  const nextStatus = newPaid >= gross - 0.01 ? "bezahlt" : "teilbezahlt";

  const patch: InvoiceUpdate = {
    paid_amount: newPaid,
    status: nextStatus,
    payment_method: method,
    payment_date: paymentDate,
  };
  await supabase.from("invoices").update(patch).eq("id", id);

  await logInvoiceHistory(supabase, {
    companyId,
    invoiceId: id,
    invoiceLabel: current.invoice_number,
    actorId: userId,
    action: "payment_recorded",
    summary: `Zahlung über ${amount!.toLocaleString("de-DE", { style: "currency", currency: "EUR" })} erfasst${nextStatus === "bezahlt" ? " – vollständig bezahlt" : ""}`,
  });

  revalidatePath("/rechnungen");
  redirect(withMessage(returnTo, "Zahlung erfasst"));
}

/** Angebot → Rechnung: übernimmt Kunde/Auftrag/Positionen, ohne dass
 * irgendetwas erneut eingetippt werden muss. */
export async function convertQuoteToInvoice(id: string, returnTo: string) {
  const { supabase, companyId, userId } = await requireInvoiceAdminContext();

  const { data: quote } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
  if (!quote || quote.kind !== "angebot") redirect(withError(returnTo, "Nur Angebote können in Rechnungen umgewandelt werden"));

  const { data: quoteItems } = await supabase
    .from("invoice_items")
    .select("description, quantity, unit_price, position")
    .eq("invoice_id", id)
    .order("position", { ascending: true });

  const { data: numberData } = await supabase.rpc("next_invoice_number", { p_company_id: companyId, p_kind: "rechnung" });

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      company_id: companyId,
      customer_id: quote!.customer_id,
      order_id: quote!.order_id,
      kind: "rechnung",
      status: "entwurf",
      issue_date: todayBerlinISO(),
      tax_rate: quote!.tax_rate,
      notes: quote!.notes,
      assigned_to: quote!.assigned_to ?? userId,
      invoice_number: numberData ?? null,
      source_quote_id: id,
    })
    .select("id, invoice_number")
    .single();

  if (error || !invoice) redirect(withError(returnTo, error?.message ?? "Umwandlung fehlgeschlagen"));

  if (quoteItems && quoteItems.length > 0) {
    await supabase.from("invoice_items").insert(
      quoteItems.map((item) => ({
        invoice_id: invoice!.id,
        company_id: companyId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        position: item.position,
      })),
    );
  }

  await supabase.from("invoices").update({ converted_to_invoice_id: invoice!.id }).eq("id", id);

  await logInvoiceHistory(supabase, {
    companyId,
    invoiceId: id,
    invoiceLabel: quote!.invoice_number,
    actorId: userId,
    action: "converted",
    summary: `Rechnung ${invoice!.invoice_number ?? ""} aus diesem Angebot erstellt`,
  });
  await logInvoiceHistory(supabase, {
    companyId,
    invoiceId: invoice!.id,
    invoiceLabel: invoice!.invoice_number,
    actorId: userId,
    action: "created",
    summary: `Automatisch aus Angebot ${quote!.invoice_number ?? ""} erstellt`,
  });

  revalidatePath("/rechnungen");
  redirect(`/rechnungen?panel=${invoice!.id}&message=${encodeURIComponent("Rechnung aus Angebot erstellt")}`);
}

/** Es gibt keine echte Öffnungs-Nachverfolgung (kein Tracking-Pixel/E-Mail-
 * Versand-Dienst angebunden) – das Feld wird bewusst nur manuell gesetzt,
 * z. B. nachdem der Kunde telefonisch Rückmeldung gegeben hat. */
export async function markInvoiceViewed(id: string, returnTo: string) {
  const { supabase, companyId, userId } = await requireInvoiceAdminContext();
  const { data: current } = await supabase.from("invoices").select("invoice_number").eq("id", id).maybeSingle();

  await supabase.from("invoices").update({ viewed_at: new Date().toISOString() }).eq("id", id);

  await logInvoiceHistory(supabase, {
    companyId,
    invoiceId: id,
    invoiceLabel: current?.invoice_number ?? null,
    actorId: userId,
    action: "viewed_marked_manually",
    summary: "Manuell als vom Kunden geöffnet markiert",
  });

  revalidatePath("/rechnungen");
  redirect(withMessage(returnTo, "Als geöffnet markiert"));
}

export async function increaseDunningLevel(id: string, returnTo: string) {
  const { supabase, companyId, userId } = await requireInvoiceAdminContext();
  const { data: current } = await supabase.from("invoices").select("invoice_number, dunning_level").eq("id", id).maybeSingle();
  if (!current) redirect(withError(returnTo, "Nicht gefunden"));

  const next = Math.min(3, Number(current.dunning_level) + 1);
  await supabase.from("invoices").update({ dunning_level: next }).eq("id", id);

  await logInvoiceHistory(supabase, {
    companyId,
    invoiceId: id,
    invoiceLabel: current.invoice_number,
    actorId: userId,
    action: "dunning",
    summary: `Mahnstufe auf ${next} erhöht`,
  });

  revalidatePath("/rechnungen");
  redirect(withMessage(returnTo, "Mahnstufe erhöht"));
}

export async function assignInvoice(id: string, returnTo: string, formData: FormData) {
  const { supabase, companyId, userId } = await requireInvoiceAdminContext();
  const employeeId = emptyToNull(formData.get("assigned_to"));
  await supabase.from("invoices").update({ assigned_to: employeeId }).eq("id", id);
  const { data: current } = await supabase.from("invoices").select("invoice_number").eq("id", id).maybeSingle();
  await logInvoiceHistory(supabase, {
    companyId,
    invoiceId: id,
    invoiceLabel: current?.invoice_number ?? null,
    actorId: userId,
    action: "assigned",
    summary: "Bearbeiter geändert",
  });
  revalidatePath("/rechnungen");
  redirect(withMessage(returnTo, "Bearbeiter aktualisiert"));
}

// =====================================================================
// Sammelaktionen (nicht redirect-basiert – werden per startTransition aus
// der Tabelle heraus direkt aufgerufen, siehe MaterialTable.tsx für das
// etablierte Muster: Bulk-Aktionen dürfen NICHT redirect() aufrufen).
// =====================================================================

export async function bulkSetInvoiceStatus(ids: string[], status: string) {
  const { supabase } = await requireInvoiceAdminContext();
  if (ids.length === 0) return;
  await supabase.from("invoices").update({ status }).in("id", ids);
  revalidatePath("/rechnungen");
}

export async function bulkArchiveInvoices(ids: string[], archived: boolean) {
  const { supabase } = await requireInvoiceAdminContext();
  if (ids.length === 0) return;
  await supabase
    .from("invoices")
    .update({ is_archived: archived, archived_at: archived ? new Date().toISOString() : null })
    .in("id", ids);
  revalidatePath("/rechnungen");
}

export async function bulkDeleteInvoices(ids: string[]): Promise<{ error: string | null }> {
  const { supabase } = await requireInvoiceAdminContext();
  if (ids.length === 0) return { error: null };

  const { data: blocked } = await supabase.from("invoices").select("id").in("id", ids).or("paid_amount.gt.0,status.eq.bezahlt");
  const blockedIds = new Set((blocked ?? []).map((b) => b.id));
  const deletable = ids.filter((id) => !blockedIds.has(id));

  if (deletable.length > 0) {
    await supabase.from("invoices").delete().in("id", deletable);
  }
  revalidatePath("/rechnungen");

  if (blockedIds.size > 0) {
    return { error: `${blockedIds.size} (teil-)bezahlte(s) Dokument(e) wurde(n) nicht gelöscht – bitte stattdessen archivieren` };
  }
  return { error: null };
}
