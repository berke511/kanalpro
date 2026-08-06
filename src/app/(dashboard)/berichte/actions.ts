"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { canCreateOrdersAndLinkCommercialDocuments, canDeleteOrArchiveOrders, hasFullAccess } from "@/lib/roles";
import { REPORT_PHOTO_CATEGORIES, REPORT_STATUSES, WORK_TYPES, calculateWorkedMinutes } from "@/lib/reports";
import { todayBerlinISO } from "@/lib/date";
import type { Database } from "@/lib/supabase/types";

type DbClient = Awaited<ReturnType<typeof createClient>>;

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

function withError(returnTo: string, message: string) {
  const sep = returnTo.includes("?") ? "&" : "?";
  return `${returnTo}${sep}error=${encodeURIComponent(message)}`;
}

function toNullableString(value: FormDataEntryValue | null) {
  const s = String(value ?? "").trim();
  return s.length > 0 ? s : null;
}

function toNullableNumber(value: FormDataEntryValue | null) {
  const s = String(value ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toIntOrNull(value: FormDataEntryValue | null) {
  const s = String(value ?? "").trim();
  if (!s) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

async function logReportHistory(
  supabase: DbClient,
  entry: {
    companyId: string;
    reportId: string | null;
    reportLabel: string;
    actorId: string;
    action:
      | "created"
      | "updated"
      | "status_changed"
      | "photo_added"
      | "material_added"
      | "material_consumed"
      | "signed"
      | "pdf_generated"
      | "email_sent"
      | "invoice_prepared"
      | "archived"
      | "unarchived"
      | "deleted";
    summary: string;
  },
) {
  await supabase.from("report_history").insert({
    company_id: entry.companyId,
    report_id: entry.reportId,
    report_label: entry.reportLabel,
    actor_id: entry.actorId,
    action: entry.action,
    summary: entry.summary,
  });
}

async function uploadFileTo(
  supabase: DbClient,
  bucket: "report-photos" | "report-signatures",
  companyId: string,
  subPath: string,
  file: File,
) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${companyId}/${subPath}/${Date.now()}_${safeName}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  return error ? null : path;
}

function computeAutoStatus(quantity: number, minQuantity: number | null, currentStatus: string): string {
  if (currentStatus === "auslaufartikel") return currentStatus;
  if (quantity <= 0) return "nicht_verfuegbar";
  if (minQuantity !== null && quantity > 0 && quantity <= minQuantity) return "niedriger_bestand";
  return "verfuegbar";
}

/**
 * Bucht eine einzelne Materialzeile eines Berichts atomar ab: Das Update
 * auf report_materials (consumed_at wird gesetzt) läuft mit der Bedingung
 * "consumed_at is null" – nur wenn diese Zeile tatsächlich getroffen wird,
 * wird der Lagerbestand reduziert. Gleiche Absicherung gegen doppeltes
 * Abbuchen wie consumeMaterialReservation/consumeOrderMaterial in der
 * Materialverwaltung (src/app/(dashboard)/material/actions.ts).
 */
async function consumeReportMaterialLine(
  supabase: DbClient,
  companyId: string,
  userId: string,
  reportMaterialId: string,
  orderId: string,
  reasonLabel: string,
) {
  const { data: claimed } = await supabase
    .from("report_materials")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", reportMaterialId)
    .is("consumed_at", null)
    .select("material_id, quantity")
    .maybeSingle();

  if (!claimed) return false;

  const { data: material } = await supabase
    .from("materials")
    .select("quantity, min_quantity, status")
    .eq("id", claimed.material_id)
    .maybeSingle();

  if (material) {
    const newQuantity = Math.max(0, Number(material.quantity) - Number(claimed.quantity));
    const minQ = material.min_quantity !== null ? Number(material.min_quantity) : null;
    await supabase
      .from("materials")
      .update({ quantity: newQuantity, status: computeAutoStatus(newQuantity, minQ, material.status) })
      .eq("id", claimed.material_id);
  }

  await supabase.from("material_movements").insert({
    company_id: companyId,
    material_id: claimed.material_id,
    movement_type: "entnahme",
    quantity: Number(claimed.quantity),
    order_id: orderId,
    reason: reasonLabel,
    performed_by: userId,
  });

  return true;
}

/** Erstellt einen Rechnungsentwurf aus den Materialpositionen + Arbeitszeit
 * eines Berichts (Angebots-/Rechnungsverwaltung, invoices/invoice_items –
 * siehe 0010_invoices.sql). Bewusst nur ein Entwurf: das Büro prüft und
 * vervollständigt Preise/Stundensatz später in der Rechnungsverwaltung. */
async function prepareInvoiceFromReportInternal(
  supabase: DbClient,
  companyId: string,
  reportId: string,
) {
  const { data: report } = await supabase
    .from("service_reports")
    .select("id, order_id, customer_id, report_number, hours_worked, invoice_prepared_at")
    .eq("id", reportId)
    .maybeSingle();

  if (!report || report.invoice_prepared_at) return null;

  const { data: items } = await supabase
    .from("report_materials")
    .select("quantity, unit_price, materials(name, unit_price)")
    .eq("report_id", reportId);

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      company_id: companyId,
      customer_id: report.customer_id,
      order_id: report.order_id,
      kind: "rechnung",
      status: "entwurf",
      issue_date: todayBerlinISO(),
      notes: report.report_number ? `Automatisch vorbereitet aus Einsatzbericht ${report.report_number}` : "Automatisch vorbereitet aus Einsatzbericht",
    })
    .select("id")
    .single();

  if (error || !invoice) return null;

  let position = 0;
  for (const item of items ?? []) {
    const materialInfo = (item as unknown as { materials: { name: string; unit_price: number | null } | null }).materials;
    await supabase.from("invoice_items").insert({
      invoice_id: invoice.id,
      company_id: companyId,
      description: materialInfo?.name ?? "Material",
      quantity: Number(item.quantity),
      unit_price: item.unit_price !== null ? Number(item.unit_price) : Number(materialInfo?.unit_price ?? 0),
      position: position++,
    });
  }

  if (report.hours_worked && Number(report.hours_worked) > 0) {
    await supabase.from("invoice_items").insert({
      invoice_id: invoice.id,
      company_id: companyId,
      description: "Zeitaufwand (Stundensatz durch Büro zu ergänzen)",
      quantity: Number(report.hours_worked),
      unit_price: 0,
      position: position++,
    });
  }

  await supabase.from("service_reports").update({ invoice_prepared_at: new Date().toISOString() }).eq("id", reportId);

  return invoice.id as string;
}

// =====================================================================
// Assistent – kompletter Bericht in einem Schritt (Schritt 1–8 werden als
// einzelnes Formular übermittelt, gleiches Muster wie createMaterial im
// Materialassistenten).
// =====================================================================

export async function createReportFull(formData: FormData) {
  const { supabase, companyId, userId, role } = await requireCompanyContext();

  const orderId = toNullableString(formData.get("order_id"));
  if (!orderId) {
    redirect("/berichte/neu?error=Auftrag+ist+erforderlich");
  }

  // Schutz vor Doppel-Anlage (Doppelklick, Netzwerk-Retry, Zurück-Button +
  // erneutes Absenden): der Assistent erzeugt pro Formular-Öffnung einen
  // zufälligen Token (siehe ReportWizard.tsx). Existiert bereits ein Bericht
  // mit demselben Token, wurde dieser Submit offensichtlich schon
  // verarbeitet – statt eines Duplikats wird direkt zum bestehenden Bericht
  // weitergeleitet, ohne Automatisierungen (Materialabbuchung,
  // Rechnungserstellung, Auftragsabschluss) ein zweites Mal auszuführen.
  const submitToken = toNullableString(formData.get("client_submit_token"));
  if (submitToken) {
    const { data: existing } = await supabase
      .from("service_reports")
      .select("id")
      .eq("company_id", companyId)
      .eq("client_submit_token", submitToken)
      .maybeSingle();
    if (existing) {
      redirect(`/berichte?panel=${existing.id}`);
    }
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, title, order_number, customer_id")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    redirect("/berichte/neu?error=Auftrag+nicht+gefunden");
  }

  const reportDate = toNullableString(formData.get("report_date")) ?? todayBerlinISO();
  const startTime = toNullableString(formData.get("start_time"));
  const endTime = toNullableString(formData.get("end_time"));
  const breakMinutes = toIntOrNull(formData.get("break_minutes")) ?? 0;
  const weather = toNullableString(formData.get("weather"));
  const workTypes = formData.getAll("work_types").map(String).filter((w) => (WORK_TYPES as readonly string[]).includes(w));
  const workPerformed = toNullableString(formData.get("work_performed")) ?? "";
  const internalNotes = toNullableString(formData.get("internal_notes"));
  const gpsLat = toNullableNumber(formData.get("gps_lat"));
  const gpsLng = toNullableNumber(formData.get("gps_lng"));

  const signatureName = toNullableString(formData.get("customer_signature_name"));
  const signatureRole = toNullableString(formData.get("customer_signature_role"));
  const signatureDataUrl = toNullableString(formData.get("signature_data_url"));
  // Als "unterschrieben" gilt ein Bericht erst, wenn tatsächlich sowohl ein
  // Name als auch eine gezeichnete Unterschrift vorliegen – ein bloß
  // eingetippter Name ohne Zeichnung im Signature-Pad reicht nicht, da davon
  // sonst automatisierte Schritte wie "Auftrag abschließen" abhängen.
  const hasSignatureDrawing = Boolean(signatureDataUrl && signatureDataUrl.startsWith("data:image/png;base64,"));

  // Automatisierungen, die Aufträge abschließen oder kaufmännische
  // Dokumente (Rechnungsentwürfe) erzeugen, sind Büro/Disponent/Vollzugriff
  // vorbehalten (siehe canCreateOrdersAndLinkCommercialDocuments) – genau
  // wie bei den gleichnamigen Einzelaktionen im Detailpanel
  // (finalizeOrderFromReport/prepareInvoiceFromReport). Ohne diese Prüfung
  // könnte ein Techniker über die Assistenten-Checkboxen (die per Default
  // aktiviert sind) Rechte ausüben, die ihm laut Rollenmodell nicht
  // zustehen.
  const canAutomateCommercial = canCreateOrdersAndLinkCommercialDocuments(role);
  const finalizeOrder = formData.get("automation_finalize_order") === "1" && canAutomateCommercial;
  const consumeMaterial = formData.get("automation_consume_material") === "1";
  const prepareInvoice = formData.get("automation_prepare_invoice") === "1" && canAutomateCommercial;
  const archiveReportFlag = formData.get("automation_archive_report") === "1";

  const workedMinutes = calculateWorkedMinutes(startTime, endTime, breakMinutes);
  const hoursWorked = workedMinutes !== null ? Math.round((workedMinutes / 60) * 100) / 100 : null;

  const { data: numberResult } = await supabase.rpc("next_report_number", { p_company_id: companyId });
  const reportNumber = (numberResult as string | null) ?? null;

  const signedAt = signatureName && hasSignatureDrawing ? new Date().toISOString() : null;
  let status: string = signedAt ? "unterschrieben" : "in_bearbeitung";
  if (finalizeOrder && signedAt) status = "abgeschlossen";

  const { data: created, error } = await supabase
    .from("service_reports")
    .insert({
      company_id: companyId,
      order_id: orderId,
      customer_id: order.customer_id,
      report_number: reportNumber,
      report_date: reportDate,
      start_time: startTime,
      end_time: endTime,
      break_minutes: breakMinutes,
      hours_worked: hoursWorked,
      weather,
      work_types: workTypes.length ? workTypes : null,
      work_performed: workPerformed,
      internal_notes: internalNotes,
      gps_lat: gpsLat,
      gps_lng: gpsLng,
      customer_signature_name: signatureName,
      customer_signature_role: signatureRole,
      signed_at: signedAt,
      status,
      created_by: userId,
      client_submit_token: submitToken,
    })
    .select("id")
    .single();

  if (error?.code === "23505" && submitToken) {
    // Wettlauf zweier gleichzeitiger Submits mit demselben Token – der
    // andere Request war minimal schneller. Statt eines Fehlers wird auch
    // hier zum inzwischen existierenden Bericht weitergeleitet.
    const { data: existing } = await supabase
      .from("service_reports")
      .select("id")
      .eq("company_id", companyId)
      .eq("client_submit_token", submitToken)
      .maybeSingle();
    if (existing) redirect(`/berichte?panel=${existing.id}`);
  }

  if (error || !created) {
    redirect(`/berichte/neu?error=${encodeURIComponent(error?.message ?? "Unbekannter Fehler")}`);
  }

  const reportId = created.id as string;
  const reportLabel = reportNumber ?? "Einsatzbericht";
  const warnings: string[] = [];

  // Mitarbeiter
  const employeeIds = Array.from(new Set(formData.getAll("employees").map(String).filter(Boolean)));
  if (employeeIds.length) {
    const { error: empError } = await supabase
      .from("report_employees")
      .insert(employeeIds.map((employee_id) => ({ company_id: companyId, report_id: reportId, employee_id })));
    if (empError) warnings.push(`Mitarbeiter konnten nicht gespeichert werden (${empError.message})`);
  }

  // Maschinen/Fahrzeuge
  const machineIds = Array.from(new Set(formData.getAll("machines").map(String).filter(Boolean)));
  if (machineIds.length) {
    const { error: machineError } = await supabase
      .from("report_machines")
      .insert(machineIds.map((fleet_item_id) => ({ company_id: companyId, report_id: reportId, fleet_item_id })));
    if (machineError) warnings.push(`Maschinen/Fahrzeuge konnten nicht gespeichert werden (${machineError.message})`);
  }

  // Material
  const materialsRaw = toNullableString(formData.get("materials_json"));
  let materialLines: Array<{ material_id: string; quantity: number }> = [];
  if (materialsRaw) {
    try {
      const parsed = JSON.parse(materialsRaw) as Array<{ material_id: string; quantity: number }>;
      materialLines = parsed.filter((m) => m.material_id && Number(m.quantity) > 0);
    } catch {
      materialLines = [];
    }
  }
  if (materialLines.length) {
    const { error: materialError } = await supabase.from("report_materials").insert(
      materialLines.map((m) => ({ company_id: companyId, report_id: reportId, material_id: m.material_id, quantity: m.quantity })),
    );
    if (materialError) {
      // Kann z. B. passieren, wenn ein Material zwischen dem Laden des
      // Formulars und dem Absenden gelöscht wurde (FK-Verletzung). Ohne
      // diese Prüfung würde die nachfolgende Abbuchungs-Automatisierung
      // stillschweigend nichts finden und der Nutzer erführe nie vom
      // Datenverlust.
      warnings.push(`Material konnte nicht gespeichert werden (${materialError.message})`);
      materialLines = [];
    }
  }

  // Fotos (vier Kategorien, jeweils Mehrfachauswahl möglich)
  for (const category of REPORT_PHOTO_CATEGORIES) {
    const files = formData.getAll(`photo_${category}`).filter((f): f is File => f instanceof File && f.size > 0);
    for (const file of files) {
      const path = await uploadFileTo(supabase, "report-photos", companyId, reportId, file);
      if (path) {
        await supabase.from("report_photos").insert({
          company_id: companyId,
          report_id: reportId,
          category,
          file_name: file.name,
          storage_path: path,
          size_bytes: file.size,
          uploaded_by: userId,
        });
      }
    }
  }

  // Unterschrift (Base-64-PNG aus dem Signature-Pad)
  if (signatureDataUrl && signatureDataUrl.startsWith("data:image/png;base64,")) {
    const base64 = signatureDataUrl.slice("data:image/png;base64,".length);
    const bytes = Buffer.from(base64, "base64");
    const path = `${companyId}/${reportId}/signature_${Date.now()}.png`;
    const { error: sigError } = await supabase.storage.from("report-signatures").upload(path, bytes, {
      contentType: "image/png",
      upsert: false,
    });
    if (!sigError) {
      await supabase.from("service_reports").update({ customer_signature_path: path }).eq("id", reportId);
    }
  }

  await logReportHistory(supabase, {
    companyId,
    reportId,
    reportLabel,
    actorId: userId,
    action: "created",
    summary:
      warnings.length > 0
        ? `Einsatzbericht angelegt (${order.order_number ?? order.title}) – Warnung: ${warnings.join("; ")}`
        : `Einsatzbericht angelegt (${order.order_number ?? order.title})`,
  });
  if (signedAt) {
    await logReportHistory(supabase, { companyId, reportId, reportLabel, actorId: userId, action: "signed", summary: `Von ${signatureName} unterschrieben` });
  }

  // Automatisierungen
  if (consumeMaterial && materialLines.length) {
    const { data: lines } = await supabase.from("report_materials").select("id").eq("report_id", reportId);
    let consumedAny = false;
    for (const line of lines ?? []) {
      const ok = await consumeReportMaterialLine(supabase, companyId, userId, line.id, orderId, `Einsatzbericht ${reportLabel}`);
      if (ok) consumedAny = true;
    }
    if (consumedAny) {
      await logReportHistory(supabase, { companyId, reportId, reportLabel, actorId: userId, action: "material_consumed", summary: "Material automatisch abgebucht" });
    }
  }

  if (finalizeOrder && signedAt) {
    await supabase.from("orders").update({ status: "abgeschlossen", completed_at: new Date().toISOString() }).eq("id", orderId);
    await logReportHistory(supabase, { companyId, reportId, reportLabel, actorId: userId, action: "status_changed", summary: "Auftrag automatisch auf „Abgeschlossen“ gesetzt" });
    revalidatePath("/auftraege");
    revalidatePath("/einsatzplanung");
  }

  if (prepareInvoice) {
    const invoiceId = await prepareInvoiceFromReportInternal(supabase, companyId, reportId);
    if (invoiceId) {
      await logReportHistory(supabase, { companyId, reportId, reportLabel, actorId: userId, action: "invoice_prepared", summary: "Rechnungsentwurf automatisch erstellt" });
      revalidatePath("/rechnungen");
    }
  }

  await supabase.from("service_reports").update({ pdf_generated_at: new Date().toISOString() }).eq("id", reportId);
  await logReportHistory(supabase, { companyId, reportId, reportLabel, actorId: userId, action: "pdf_generated", summary: "PDF-Vorschau erzeugt" });

  if (archiveReportFlag) {
    await supabase.from("service_reports").update({ status: "archiviert", is_archived: true, archived_at: new Date().toISOString() }).eq("id", reportId);
    await logReportHistory(supabase, { companyId, reportId, reportLabel, actorId: userId, action: "archived", summary: "Bericht automatisch archiviert" });
  }

  revalidatePath("/berichte");
  redirect(`/berichte?panel=${reportId}`);
}

// =====================================================================
// Detailpanel – Direktaufrufe
// =====================================================================

export async function updateReportStatus(id: string, returnTo: string, formData: FormData) {
  const { supabase, companyId, userId } = await requireCompanyContext();
  const status = String(formData.get("status") ?? "");
  if (!(REPORT_STATUSES as readonly string[]).includes(status)) {
    redirect(withError(returnTo, "Ungültiger Status"));
  }

  const { data: report } = await supabase.from("service_reports").select("report_number").eq("id", id).maybeSingle();

  // is_archived/archived_at bleiben konsistent mit dem Status: wechselt der
  // Status zu/von "archiviert", müssen beide Felder mitgezogen werden –
  // sonst entstehen Berichte mit is_archived=true und archived_at=null (oder
  // umgekehrt is_archived=false, obwohl status noch "archiviert" ist).
  const { error } = await supabase
    .from("service_reports")
    .update({
      status,
      is_archived: status === "archiviert",
      archived_at: status === "archiviert" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) redirect(withError(returnTo, error.message));

  await logReportHistory(supabase, {
    companyId,
    reportId: id,
    reportLabel: report?.report_number ?? "Einsatzbericht",
    actorId: userId,
    action: "status_changed",
    summary: `Status geändert zu „${status}“`,
  });

  revalidatePath("/berichte");
}

export async function updateReportDetails(id: string, returnTo: string, formData: FormData) {
  const { supabase, companyId, userId } = await requireCompanyContext();

  const reportDate = toNullableString(formData.get("report_date")) ?? todayBerlinISO();
  const startTime = toNullableString(formData.get("start_time"));
  const endTime = toNullableString(formData.get("end_time"));
  const breakMinutes = toIntOrNull(formData.get("break_minutes")) ?? 0;
  const weather = toNullableString(formData.get("weather"));
  const workTypes = formData.getAll("work_types").map(String).filter((w) => (WORK_TYPES as readonly string[]).includes(w));
  const workPerformed = toNullableString(formData.get("work_performed")) ?? "";
  const internalNotes = toNullableString(formData.get("internal_notes"));

  const workedMinutes = calculateWorkedMinutes(startTime, endTime, breakMinutes);
  const hoursWorked = workedMinutes !== null ? Math.round((workedMinutes / 60) * 100) / 100 : null;

  const { error } = await supabase
    .from("service_reports")
    .update({
      report_date: reportDate,
      start_time: startTime,
      end_time: endTime,
      break_minutes: breakMinutes,
      hours_worked: hoursWorked,
      weather,
      work_types: workTypes.length ? workTypes : null,
      work_performed: workPerformed,
      internal_notes: internalNotes,
    })
    .eq("id", id);
  if (error) redirect(withError(returnTo, error.message));

  await logReportHistory(supabase, { companyId, reportId: id, reportLabel: "Einsatzbericht", actorId: userId, action: "updated", summary: "Einsatzdaten aktualisiert" });

  revalidatePath("/berichte");
}

export async function addReportEmployee(id: string, returnTo: string, formData: FormData) {
  const { supabase, companyId } = await requireCompanyContext();
  const employeeId = toNullableString(formData.get("employee_id"));
  if (!employeeId) redirect(withError(returnTo, "Bitte einen Mitarbeiter auswählen"));

  const { error } = await supabase.from("report_employees").insert({ company_id: companyId, report_id: id, employee_id: employeeId });
  if (error && !error.message.includes("duplicate")) redirect(withError(returnTo, error.message));
  revalidatePath("/berichte");
}

export async function removeReportEmployee(reportEmployeeId: string, returnTo: string) {
  const { supabase } = await requireCompanyContext();
  await supabase.from("report_employees").delete().eq("id", reportEmployeeId);
  revalidatePath("/berichte");
  redirect(returnTo);
}

export async function addReportMachine(id: string, returnTo: string, formData: FormData) {
  const { supabase, companyId } = await requireCompanyContext();
  const fleetItemId = toNullableString(formData.get("fleet_item_id"));
  if (!fleetItemId) redirect(withError(returnTo, "Bitte eine Maschine/ein Fahrzeug auswählen"));

  const { error } = await supabase.from("report_machines").insert({ company_id: companyId, report_id: id, fleet_item_id: fleetItemId });
  if (error && !error.message.includes("duplicate")) redirect(withError(returnTo, error.message));
  revalidatePath("/berichte");
}

export async function removeReportMachine(reportMachineId: string, returnTo: string) {
  const { supabase } = await requireCompanyContext();
  await supabase.from("report_machines").delete().eq("id", reportMachineId);
  revalidatePath("/berichte");
  redirect(returnTo);
}

export async function addReportMaterial(id: string, returnTo: string, formData: FormData) {
  const { supabase, companyId, userId } = await requireCompanyContext();
  const materialId = toNullableString(formData.get("material_id"));
  const quantity = toNullableNumber(formData.get("quantity"));
  if (!materialId || quantity === null || quantity <= 0) {
    redirect(withError(returnTo, "Bitte Material und eine gültige Menge angeben"));
  }

  const { data: material } = await supabase.from("materials").select("unit_price").eq("id", materialId).maybeSingle();

  const { error } = await supabase.from("report_materials").insert({
    company_id: companyId,
    report_id: id,
    material_id: materialId,
    quantity,
    unit_price: material?.unit_price ?? null,
  });
  if (error) redirect(withError(returnTo, error.message));

  const { data: report } = await supabase.from("service_reports").select("report_number").eq("id", id).maybeSingle();
  await logReportHistory(supabase, {
    companyId,
    reportId: id,
    reportLabel: report?.report_number ?? "Einsatzbericht",
    actorId: userId,
    action: "material_added",
    summary: `${quantity} Einheit(en) Material hinzugefügt`,
  });

  revalidatePath("/berichte");
}

export async function removeReportMaterial(reportMaterialId: string, returnTo: string) {
  const { supabase } = await requireCompanyContext();
  const { data: deleted } = await supabase
    .from("report_materials")
    .delete()
    .eq("id", reportMaterialId)
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();
  if (!deleted) {
    redirect(withError(returnTo, "Bereits abgebuchtes Material kann nicht entfernt werden"));
  }
  revalidatePath("/berichte");
  redirect(returnTo);
}

export async function consumeReportMaterial(reportMaterialId: string, orderId: string, returnTo: string) {
  const { supabase, companyId, userId } = await requireCompanyContext();
  const ok = await consumeReportMaterialLine(supabase, companyId, userId, reportMaterialId, orderId, "Einsatzbericht – manuell abgebucht");
  if (ok) {
    revalidatePath("/berichte");
    revalidatePath("/material");
  }
  redirect(returnTo);
}

export async function uploadReportPhoto(id: string, returnTo: string, formData: FormData) {
  const { supabase, companyId, userId } = await requireCompanyContext();
  const categoryRaw = String(formData.get("category") ?? "baustelle");
  const category = (REPORT_PHOTO_CATEGORIES as readonly string[]).includes(categoryRaw) ? categoryRaw : "baustelle";
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

  if (!files.length) redirect(withError(returnTo, "Bitte mindestens ein Foto auswählen"));

  for (const file of files) {
    const path = await uploadFileTo(supabase, "report-photos", companyId, id, file);
    if (path) {
      await supabase.from("report_photos").insert({
        company_id: companyId,
        report_id: id,
        category,
        file_name: file.name,
        storage_path: path,
        size_bytes: file.size,
        uploaded_by: userId,
      });
    }
  }

  const { data: report } = await supabase.from("service_reports").select("report_number").eq("id", id).maybeSingle();
  await logReportHistory(supabase, {
    companyId,
    reportId: id,
    reportLabel: report?.report_number ?? "Einsatzbericht",
    actorId: userId,
    action: "photo_added",
    summary: `${files.length} Foto(s) hochgeladen`,
  });

  revalidatePath("/berichte");
}

export async function deleteReportPhoto(photoId: string, storagePath: string, returnTo: string) {
  const { supabase } = await requireCompanyContext();
  await supabase.storage.from("report-photos").remove([storagePath]);
  await supabase.from("report_photos").delete().eq("id", photoId);
  revalidatePath("/berichte");
  redirect(returnTo);
}

export async function saveReportSignature(id: string, returnTo: string, formData: FormData) {
  const { supabase, companyId, userId } = await requireCompanyContext();

  const name = toNullableString(formData.get("customer_signature_name"));
  const role = toNullableString(formData.get("customer_signature_role"));
  const dataUrl = toNullableString(formData.get("signature_data_url"));
  const hasDrawing = Boolean(dataUrl && dataUrl.startsWith("data:image/png;base64,"));

  if (!name) redirect(withError(returnTo, "Bitte den Namen des Unterzeichners angeben"));
  if (!hasDrawing) redirect(withError(returnTo, "Bitte im Feld unterschreiben, bevor gespeichert wird"));

  const patch: Database["public"]["Tables"]["service_reports"]["Update"] = {
    customer_signature_name: name,
    customer_signature_role: role,
    signed_at: new Date().toISOString(),
    status: "unterschrieben",
  };

  if (dataUrl && dataUrl.startsWith("data:image/png;base64,")) {
    const base64 = dataUrl.slice("data:image/png;base64,".length);
    const bytes = Buffer.from(base64, "base64");
    const path = `${companyId}/${id}/signature_${Date.now()}.png`;
    const { error: sigError } = await supabase.storage.from("report-signatures").upload(path, bytes, {
      contentType: "image/png",
      upsert: false,
    });
    if (!sigError) patch.customer_signature_path = path;
  }

  const { error } = await supabase.from("service_reports").update(patch).eq("id", id);
  if (error) redirect(withError(returnTo, error.message));

  const { data: report } = await supabase.from("service_reports").select("report_number").eq("id", id).maybeSingle();
  await logReportHistory(supabase, {
    companyId,
    reportId: id,
    reportLabel: report?.report_number ?? "Einsatzbericht",
    actorId: userId,
    action: "signed",
    summary: `Von ${name} unterschrieben`,
  });

  revalidatePath("/berichte");
}

export async function markReportPdfGenerated(id: string, returnTo: string) {
  const { supabase, companyId, userId } = await requireCompanyContext();
  await supabase.from("service_reports").update({ pdf_generated_at: new Date().toISOString() }).eq("id", id);
  const { data: report } = await supabase.from("service_reports").select("report_number").eq("id", id).maybeSingle();
  await logReportHistory(supabase, {
    companyId,
    reportId: id,
    reportLabel: report?.report_number ?? "Einsatzbericht",
    actorId: userId,
    action: "pdf_generated",
    summary: "PDF erzeugt",
  });
  revalidatePath("/berichte");
  redirect(returnTo);
}

export async function finalizeOrderFromReport(id: string, orderId: string, returnTo: string) {
  const { supabase, companyId, role, userId } = await requireCompanyContext();
  if (!canCreateOrdersAndLinkCommercialDocuments(role)) {
    redirect(withError(returnTo, "Keine Berechtigung"));
  }
  await supabase.from("orders").update({ status: "abgeschlossen", completed_at: new Date().toISOString() }).eq("id", orderId);
  const { data: report } = await supabase.from("service_reports").select("report_number").eq("id", id).maybeSingle();
  await logReportHistory(supabase, {
    companyId,
    reportId: id,
    reportLabel: report?.report_number ?? "Einsatzbericht",
    actorId: userId,
    action: "status_changed",
    summary: "Auftrag auf „Abgeschlossen“ gesetzt",
  });
  revalidatePath("/berichte");
  revalidatePath("/auftraege");
  revalidatePath("/einsatzplanung");
  redirect(returnTo);
}

export async function prepareInvoiceFromReport(id: string, returnTo: string) {
  const { supabase, companyId, role, userId } = await requireCompanyContext();
  if (!canCreateOrdersAndLinkCommercialDocuments(role)) {
    redirect(withError(returnTo, "Keine Berechtigung"));
  }
  const invoiceId = await prepareInvoiceFromReportInternal(supabase, companyId, id);
  if (!invoiceId) {
    redirect(withError(returnTo, "Rechnungsentwurf konnte nicht erstellt werden (evtl. bereits vorhanden)"));
  }
  const { data: report } = await supabase.from("service_reports").select("report_number").eq("id", id).maybeSingle();
  await logReportHistory(supabase, {
    companyId,
    reportId: id,
    reportLabel: report?.report_number ?? "Einsatzbericht",
    actorId: userId,
    action: "invoice_prepared",
    summary: "Rechnungsentwurf erstellt",
  });
  revalidatePath("/berichte");
  revalidatePath("/rechnungen");
  redirect(returnTo);
}

export async function archiveReport(id: string, archived: boolean, returnTo: string) {
  const { supabase, companyId, role, userId } = await requireCompanyContext();
  if (!canDeleteOrArchiveOrders(role)) {
    redirect(withError(returnTo, "Keine Berechtigung"));
  }

  // Beim Dearchivieren NICHT hart auf "abgeschlossen" zurücksetzen – ein
  // Bericht, der z. B. im Status "Zur Prüfung" archiviert wurde, soll nach
  // dem Dearchivieren nicht fälschlich als abgeschlossen erscheinen. Da der
  // ursprüngliche Status nicht separat gespeichert wird, orientiert sich die
  // Rückkehr am nächstplausiblen Zustand: unterschrieben, wenn eine
  // Unterschrift vorliegt, sonst "in Bearbeitung".
  let nextStatus = "archiviert";
  if (!archived) {
    const { data: current } = await supabase.from("service_reports").select("signed_at").eq("id", id).maybeSingle();
    nextStatus = current?.signed_at ? "unterschrieben" : "in_bearbeitung";
  }

  await supabase
    .from("service_reports")
    .update({
      is_archived: archived,
      archived_at: archived ? new Date().toISOString() : null,
      status: nextStatus,
    })
    .eq("id", id);
  const { data: report } = await supabase.from("service_reports").select("report_number").eq("id", id).maybeSingle();
  await logReportHistory(supabase, {
    companyId,
    reportId: id,
    reportLabel: report?.report_number ?? "Einsatzbericht",
    actorId: userId,
    action: archived ? "archived" : "unarchived",
    summary: archived ? "Bericht archiviert" : "Bericht aus dem Archiv geholt",
  });
  revalidatePath("/berichte");
  redirect(returnTo);
}

export async function deleteReport(id: string, returnTo?: string) {
  const { supabase, companyId, role, userId } = await requireCompanyContext();
  if (!hasFullAccess(role) && role !== "disponent" && role !== "buero") {
    redirect(withError(returnTo ?? "/berichte", "Keine Berechtigung zum Löschen"));
  }

  // Wurde bereits Material über diesen Bericht abgebucht, würde ein Löschen
  // (report_materials hängt per ON DELETE CASCADE an service_reports) die
  // Verbindung zwischen Lagerbewegung und Bericht unwiederbringlich kappen,
  // ohne den bereits reduzierten Bestand zurückzubuchen. Stattdessen wird
  // auf Archivieren verwiesen (gleiches Muster wie bei Materialien mit
  // verknüpften Aufträgen, siehe material/actions.ts deleteMaterial).
  const { count: consumedCount } = await supabase
    .from("report_materials")
    .select("id", { count: "exact", head: true })
    .eq("report_id", id)
    .not("consumed_at", "is", null);
  if (consumedCount && consumedCount > 0) {
    redirect(withError(returnTo ?? "/berichte", "Für diesen Bericht wurde bereits Material abgebucht – bitte stattdessen archivieren"));
  }

  const { data: report } = await supabase.from("service_reports").select("report_number").eq("id", id).maybeSingle();
  await supabase.from("service_reports").delete().eq("id", id);
  await logReportHistory(supabase, {
    companyId,
    reportId: null,
    reportLabel: report?.report_number ?? "Einsatzbericht",
    actorId: userId,
    action: "deleted",
    summary: "Bericht gelöscht",
  });
  revalidatePath("/berichte");
  redirect("/berichte");
}
