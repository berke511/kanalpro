"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { canManageResourcesAndSchedule } from "@/lib/roles";
import type { Database } from "@/lib/supabase/types";
import {
  FLEET_COST_CATEGORIES,
  FLEET_DOCUMENT_CATEGORIES,
  FLEET_KINDS,
  FLEET_STATUSES,
  FUEL_TYPES,
  MAINTENANCE_RECORD_TYPES,
  OWNERSHIP_TYPES,
} from "@/lib/fleet";

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

async function requireFleetAdminContext() {
  const { supabase, role, ...rest } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect("/fahrzeuge?error=Daf%C3%BCr+fehlt+dir+die+Berechtigung");
  }
  return { supabase, role, ...rest };
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
  const s = String(value ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toNullableInt(value: FormDataEntryValue | null) {
  const n = toNullableNumber(value);
  return n === null ? null : Math.round(n);
}

// Stammdaten + technische Daten + Wartungs-/Prüftermine – wird sowohl beim
// Anlegen (Assistent) als auch beim Bearbeiten (Detailpanel) verwendet.
function readFleetForm(formData: FormData) {
  const kindRaw = String(formData.get("kind") ?? "fahrzeug");
  const statusRaw = String(formData.get("status") ?? "verfuegbar");
  const ownershipRaw = String(formData.get("ownership") ?? "");
  const fuelTypeRaw = String(formData.get("fuel_type") ?? "");

  return {
    kind: (FLEET_KINDS as readonly string[]).includes(kindRaw) ? kindRaw : "fahrzeug",
    name: String(formData.get("name") ?? "").trim(),
    license_plate: toNullableString(formData.get("license_plate")),
    status: (FLEET_STATUSES as readonly string[]).includes(statusRaw) ? statusRaw : "verfuegbar",
    notes: toNullableString(formData.get("notes")),
    inventory_number: toNullableString(formData.get("inventory_number")),
    manufacturer: toNullableString(formData.get("manufacturer")),
    model: toNullableString(formData.get("model")),
    year_built: toNullableInt(formData.get("year_built")),
    location: toNullableString(formData.get("location")),
    service_area: toNullableString(formData.get("service_area")),
    ownership: (OWNERSHIP_TYPES as readonly string[]).includes(ownershipRaw) ? ownershipRaw : null,
    fuel_type: (FUEL_TYPES as readonly string[]).includes(fuelTypeRaw) ? fuelTypeRaw : null,
    odometer_km: toNullableNumber(formData.get("odometer_km")),
    operating_hours: toNullableNumber(formData.get("operating_hours")),
    odometer_interval_km: toNullableNumber(formData.get("odometer_interval_km")),
    operating_hours_interval: toNullableNumber(formData.get("operating_hours_interval")),
    last_maintenance_at: toNullableString(formData.get("last_maintenance_at")),
    next_maintenance_at: toNullableString(formData.get("next_maintenance_at")),
    next_maintenance_note: toNullableString(formData.get("next_maintenance_note")),
    tuv_due_date: toNullableString(formData.get("tuv_due_date")),
    uvv_due_date: toNullableString(formData.get("uvv_due_date")),
    insurance_due_date: toNullableString(formData.get("insurance_due_date")),
    leasing_end_date: toNullableString(formData.get("leasing_end_date")),
    default_crew_size: toNullableInt(formData.get("default_crew_size")),
    max_crew_size: toNullableInt(formData.get("max_crew_size")),
    default_equipment: toNullableString(formData.get("default_equipment")),
    linked_vehicle_id: toNullableString(formData.get("linked_vehicle_id")),
  };
}

// --- Anlegen (mehrstufiger Assistent, ein Submit am Ende) ---

export async function createFleetItem(formData: FormData) {
  const { supabase, companyId } = await requireFleetAdminContext();
  const fields = readFleetForm(formData);

  if (!fields.name) {
    redirect("/fahrzeuge/neu?error=Bezeichnung+ist+erforderlich");
  }

  const { data: created, error } = await supabase
    .from("fleet_items")
    .insert({ ...fields, company_id: companyId })
    .select("id")
    .single();

  if (error || !created) {
    redirect(`/fahrzeuge/neu?error=${encodeURIComponent(error?.message ?? "Unbekannter Fehler")}`);
  }

  const newId = created.id as string;

  // Optionales Foto (letzter Schritt des Assistenten).
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${companyId}/${newId}/${Date.now()}_${safeName}`;
    const { error: uploadError } = await supabase.storage.from("fleet-photos").upload(path, photo, {
      contentType: photo.type || undefined,
      upsert: false,
    });
    if (!uploadError) {
      await supabase.from("fleet_items").update({ photo_path: path }).eq("id", newId);
    }
  }

  // Optionales erstes Dokument (letzter Schritt des Assistenten).
  const document = formData.get("document");
  if (document instanceof File && document.size > 0) {
    const categoryRaw = String(formData.get("document_category") ?? "sonstiges");
    const category = (FLEET_DOCUMENT_CATEGORIES as readonly string[]).includes(categoryRaw) ? categoryRaw : "sonstiges";
    const safeName = document.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${companyId}/${newId}/${Date.now()}_${safeName}`;
    const { error: uploadError } = await supabase.storage.from("fleet-documents").upload(path, document, {
      contentType: document.type || undefined,
      upsert: false,
    });
    if (!uploadError) {
      await supabase.from("fleet_documents").insert({
        company_id: companyId,
        fleet_item_id: newId,
        category,
        file_name: document.name,
        storage_path: path,
        size_bytes: document.size,
      });
    }
  }

  revalidatePath("/fahrzeuge");
  redirect(`/fahrzeuge?panel=${newId}&message=Eintrag+angelegt`);
}

// --- Direktaufrufe fürs Detailpanel (kein <form action>-Redirect, Aufrufer
//     macht nach dem Await router.refresh() – gleiches Muster wie
//     /mitarbeiter/actions.ts) ---

export async function updateFleetProfile(id: string, returnTo: string, formData: FormData) {
  const { supabase, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Bearbeiten"));
  }

  const fields = readFleetForm(formData);
  if (!fields.name) {
    redirect(withError(returnTo, "Bezeichnung ist erforderlich"));
  }
  if (fields.linked_vehicle_id === id) {
    fields.linked_vehicle_id = null;
  }

  const { error } = await supabase.from("fleet_items").update(fields).eq("id", id);
  if (error) redirect(withError(returnTo, error.message));

  revalidatePath("/fahrzeuge");
}

export async function updateFleetStatus(id: string, returnTo: string, formData: FormData) {
  const { supabase, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Ändern des Status"));
  }
  const status = String(formData.get("status") ?? "");
  if (!(FLEET_STATUSES as readonly string[]).includes(status)) {
    redirect(withError(returnTo, "Ungültiger Status"));
  }

  const { error } = await supabase.from("fleet_items").update({ status }).eq("id", id);
  if (error) redirect(withError(returnTo, error.message));

  revalidatePath("/fahrzeuge");
}

export async function assignFleetEmployee(id: string, returnTo: string, formData: FormData) {
  const { supabase, companyId, userId, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Zuweisen"));
  }

  const employeeId = toNullableString(formData.get("employee_id"));
  if (!employeeId) {
    redirect(withError(returnTo, "Bitte einen Mitarbeiter auswählen"));
  }

  await supabase
    .from("employee_vehicle_history")
    .update({ unassigned_at: new Date().toISOString() })
    .eq("employee_id", employeeId)
    .is("unassigned_at", null);

  await supabase.from("employee_vehicle_history").insert({
    company_id: companyId,
    employee_id: employeeId,
    fleet_item_id: id,
    assigned_by: userId,
  });

  const { error } = await supabase.from("profiles").update({ main_vehicle_id: id }).eq("id", employeeId);
  if (error) redirect(withError(returnTo, error.message));

  revalidatePath("/fahrzeuge");
  revalidatePath("/mitarbeiter");
}

export async function unassignFleetEmployee(id: string, employeeId: string, returnTo: string) {
  const { supabase, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Entfernen"));
  }

  await supabase
    .from("employee_vehicle_history")
    .update({ unassigned_at: new Date().toISOString() })
    .eq("employee_id", employeeId)
    .eq("fleet_item_id", id)
    .is("unassigned_at", null);

  await supabase.from("profiles").update({ main_vehicle_id: null }).eq("id", employeeId).eq("main_vehicle_id", id);

  revalidatePath("/fahrzeuge");
  revalidatePath("/mitarbeiter");
}

export async function uploadFleetPhoto(id: string, returnTo: string, formData: FormData) {
  const { supabase, companyId, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Hochladen"));
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(withError(returnTo, "Bitte ein Bild auswählen"));
  }

  const { data: existing } = await supabase.from("fleet_items").select("photo_path").eq("id", id).maybeSingle();

  const safeName = (file as File).name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${companyId}/${id}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage.from("fleet-photos").upload(path, file as File, {
    contentType: (file as File).type || undefined,
    upsert: false,
  });
  if (uploadError) redirect(withError(returnTo, uploadError.message));

  const { error } = await supabase.from("fleet_items").update({ photo_path: path }).eq("id", id);
  if (error) redirect(withError(returnTo, error.message));

  if (existing?.photo_path) {
    await supabase.storage.from("fleet-photos").remove([existing.photo_path]);
  }

  revalidatePath("/fahrzeuge");
}

export async function removeFleetPhoto(id: string, returnTo: string) {
  const { supabase, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Entfernen"));
  }

  const { data: existing } = await supabase.from("fleet_items").select("photo_path").eq("id", id).maybeSingle();
  if (existing?.photo_path) {
    await supabase.storage.from("fleet-photos").remove([existing.photo_path]);
  }

  const { error } = await supabase.from("fleet_items").update({ photo_path: null }).eq("id", id);
  if (error) redirect(withError(returnTo, error.message));

  revalidatePath("/fahrzeuge");
}

export async function addMaintenanceRecord(id: string, returnTo: string, formData: FormData) {
  const { supabase, companyId, userId, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Erfassen"));
  }

  const recordTypeRaw = String(formData.get("record_type") ?? "wartung");
  const recordType = (MAINTENANCE_RECORD_TYPES as readonly string[]).includes(recordTypeRaw) ? recordTypeRaw : "wartung";
  const performedAt = toNullableString(formData.get("performed_at"));
  if (!performedAt) {
    redirect(withError(returnTo, "Datum ist erforderlich"));
  }

  const { error } = await supabase.from("fleet_maintenance_records").insert({
    company_id: companyId,
    fleet_item_id: id,
    record_type: recordType,
    performed_at: performedAt,
    description: toNullableString(formData.get("description")),
    cost: toNullableNumber(formData.get("cost")),
    performed_by: toNullableString(formData.get("performed_by")),
    odometer_km: toNullableNumber(formData.get("odometer_km")),
    operating_hours: toNullableNumber(formData.get("operating_hours")),
    created_by: userId,
  });
  if (error) redirect(withError(returnTo, error.message));

  // Wartungsdatum/Kilometerstand am Fahrzeug direkt mitpflegen, damit
  // Fortschrittsbalken & KPI-Kacheln ohne Zusatzabfrage aktuell bleiben.
  const patch: Database["public"]["Tables"]["fleet_items"]["Update"] = {};
  if (recordType === "wartung") {
    patch.last_maintenance_at = performedAt;
    const nextMaintenanceAt = toNullableString(formData.get("next_maintenance_at"));
    if (nextMaintenanceAt) patch.next_maintenance_at = nextMaintenanceAt;
  }
  if (recordType === "tuev") {
    const nextTuv = toNullableString(formData.get("next_maintenance_at"));
    if (nextTuv) patch.tuv_due_date = nextTuv;
  }
  if (recordType === "uvv") {
    const nextUvv = toNullableString(formData.get("next_maintenance_at"));
    if (nextUvv) patch.uvv_due_date = nextUvv;
  }
  const odometerKm = toNullableNumber(formData.get("odometer_km"));
  if (odometerKm !== null) patch.odometer_km = odometerKm;
  const operatingHours = toNullableNumber(formData.get("operating_hours"));
  if (operatingHours !== null) patch.operating_hours = operatingHours;

  if (Object.keys(patch).length > 0) {
    await supabase.from("fleet_items").update(patch).eq("id", id);
  }

  revalidatePath("/fahrzeuge");
}

export async function removeMaintenanceRecord(recordId: string, returnTo: string) {
  const { supabase, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Löschen"));
  }

  await supabase.from("fleet_maintenance_records").delete().eq("id", recordId);
  revalidatePath("/fahrzeuge");
}

export async function addCostEntry(id: string, returnTo: string, formData: FormData) {
  const { supabase, companyId, userId, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Erfassen"));
  }

  const categoryRaw = String(formData.get("category") ?? "sonstige");
  const category = (FLEET_COST_CATEGORIES as readonly string[]).includes(categoryRaw) ? categoryRaw : "sonstige";
  const amount = toNullableNumber(formData.get("amount"));
  const occurredAt = toNullableString(formData.get("occurred_at"));
  if (amount === null || !occurredAt) {
    redirect(withError(returnTo, "Betrag und Datum sind erforderlich"));
  }

  const { error } = await supabase.from("fleet_cost_entries").insert({
    company_id: companyId,
    fleet_item_id: id,
    category,
    amount,
    occurred_at: occurredAt,
    note: toNullableString(formData.get("note")),
    created_by: userId,
  });
  if (error) redirect(withError(returnTo, error.message));

  revalidatePath("/fahrzeuge");
}

export async function removeCostEntry(costId: string, returnTo: string) {
  const { supabase, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Löschen"));
  }

  await supabase.from("fleet_cost_entries").delete().eq("id", costId);
  revalidatePath("/fahrzeuge");
}

export async function uploadFleetDocument(id: string, returnTo: string, formData: FormData) {
  const { supabase, companyId, userId, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Hochladen"));
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(withError(returnTo, "Bitte eine Datei auswählen"));
  }

  const categoryRaw = String(formData.get("category") ?? "sonstiges");
  const category = (FLEET_DOCUMENT_CATEGORIES as readonly string[]).includes(categoryRaw) ? categoryRaw : "sonstiges";

  const safeName = (file as File).name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${companyId}/${id}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage.from("fleet-documents").upload(path, file as File, {
    contentType: (file as File).type || undefined,
    upsert: false,
  });
  if (uploadError) redirect(withError(returnTo, uploadError.message));

  const { error } = await supabase.from("fleet_documents").insert({
    company_id: companyId,
    fleet_item_id: id,
    category,
    file_name: (file as File).name,
    storage_path: path,
    size_bytes: (file as File).size,
    expires_at: toNullableString(formData.get("expires_at")),
    uploaded_by: userId,
  });
  if (error) redirect(withError(returnTo, error.message));

  revalidatePath("/fahrzeuge");
}

export async function deleteFleetDocument(documentId: string, storagePath: string, returnTo: string) {
  const { supabase, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Löschen"));
  }

  await supabase.storage.from("fleet-documents").remove([storagePath]);
  await supabase.from("fleet_documents").delete().eq("id", documentId);
  revalidatePath("/fahrzeuge");
}

export async function archiveFleetItem(id: string, archived: boolean) {
  const { supabase } = await requireFleetAdminContext();
  await supabase.from("fleet_items").update({ is_archived: archived }).eq("id", id);
  revalidatePath("/fahrzeuge");
  redirect(`/fahrzeuge?message=${archived ? "Eintrag+archiviert" : "Archivierung+aufgehoben"}`);
}

export async function deleteFleetItem(id: string) {
  const { supabase } = await requireFleetAdminContext();
  await supabase.from("fleet_items").delete().eq("id", id);
  revalidatePath("/fahrzeuge");
  redirect("/fahrzeuge?message=Eintrag+gel%C3%B6scht");
}

// --- Massenaktionen (aus der Tabelle heraus, kein Redirect – Aufrufer
//     ruft selbst router.refresh(), analog zu /kunden/actions.ts) ---

export async function bulkSetFleetStatus(ids: string[], status: string) {
  const { supabase } = await requireFleetAdminContext();
  if (ids.length === 0 || !(FLEET_STATUSES as readonly string[]).includes(status)) return;
  await supabase.from("fleet_items").update({ status }).in("id", ids);
  revalidatePath("/fahrzeuge");
}

export async function bulkSetFleetArchived(ids: string[], archived: boolean) {
  const { supabase } = await requireFleetAdminContext();
  if (ids.length === 0) return;
  await supabase.from("fleet_items").update({ is_archived: archived }).in("id", ids);
  revalidatePath("/fahrzeuge");
}

export async function bulkDeleteFleetItems(ids: string[]) {
  const { supabase } = await requireFleetAdminContext();
  if (ids.length === 0) return;
  await supabase.from("fleet_items").delete().in("id", ids);
  revalidatePath("/fahrzeuge");
}
