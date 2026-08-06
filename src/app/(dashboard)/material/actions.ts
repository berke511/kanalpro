"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { canManageResourcesAndSchedule } from "@/lib/roles";
import {
  MATERIAL_CATEGORIES,
  MATERIAL_DOCUMENT_CATEGORIES,
  MATERIAL_STATUSES,
  MOVEMENT_TYPES,
  RESERVATION_TARGET_TYPES,
  isLowStock,
  isOutOfStock,
} from "@/lib/materials";
import type { Database } from "@/lib/supabase/types";

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

async function requireMaterialAdminContext() {
  const { supabase, role, ...rest } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect("/material?error=Daf%C3%BCr+fehlt+dir+die+Berechtigung");
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
  const s = String(value ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Bestandsstatus nach einer Mengenänderung neu berechnen. "auslaufartikel"
 * ist eine bewusste, manuelle Entscheidung (Artikel wird nicht mehr
 * nachbestellt) und wird durch automatische Neuberechnung nie überschrieben
 * – alle anderen Status ordnen sich der aktuellen Bestandslage unter.
 */
function computeAutoStatus(quantity: number, minQuantity: number | null, currentStatus: string): string {
  if (currentStatus === "auslaufartikel") return currentStatus;
  if (isOutOfStock(quantity)) return "nicht_verfuegbar";
  if (isLowStock(quantity, minQuantity)) return "niedriger_bestand";
  return "verfuegbar";
}

// Stammdaten (ohne Bestand – der wird ausschließlich über
// Materialbewegungen verändert, siehe addMaterialMovement).
function readMaterialForm(formData: FormData) {
  const categoryRaw = String(formData.get("category") ?? "");
  return {
    name: String(formData.get("name") ?? "").trim(),
    unit: String(formData.get("unit") ?? "").trim() || "Stück",
    category: (MATERIAL_CATEGORIES as readonly string[]).includes(categoryRaw) ? categoryRaw : null,
    location_id: toNullableString(formData.get("location_id")),
    min_quantity: toNullableNumber(formData.get("min_quantity")),
    supplier_name: toNullableString(formData.get("supplier_name")),
    supplier_contact_name: toNullableString(formData.get("supplier_contact_name")),
    supplier_phone: toNullableString(formData.get("supplier_phone")),
    supplier_email: toNullableString(formData.get("supplier_email")),
    purchase_price: toNullableNumber(formData.get("purchase_price")),
    unit_price: toNullableNumber(formData.get("unit_price")),
    notes: toNullableString(formData.get("notes")),
  };
}

// --- Anlegen (mehrstufiger Assistent, ein Submit am Ende) ---

export async function createMaterial(formData: FormData) {
  const { supabase, companyId } = await requireMaterialAdminContext();
  const fields = readMaterialForm(formData);

  if (!fields.name) {
    redirect("/material/neu?error=Bezeichnung+ist+erforderlich");
  }

  const initialQuantity = toNullableNumber(formData.get("quantity")) ?? 0;

  const { data: materialNumber } = await supabase.rpc("next_material_number", { p_company_id: companyId });

  const status = computeAutoStatus(initialQuantity, fields.min_quantity, "verfuegbar");

  const { data: created, error } = await supabase
    .from("materials")
    .insert({
      ...fields,
      quantity: initialQuantity,
      company_id: companyId,
      material_number: materialNumber ?? null,
      qr_code: materialNumber ?? null,
      status,
    })
    .select("id")
    .single();

  if (error || !created) {
    redirect(`/material/neu?error=${encodeURIComponent(error?.message ?? "Unbekannter Fehler")}`);
  }

  const newId = created.id as string;

  if (initialQuantity > 0) {
    await supabase.from("material_movements").insert({
      company_id: companyId,
      material_id: newId,
      movement_type: "wareneingang",
      quantity: initialQuantity,
      to_location_id: fields.location_id,
      reason: "Anfangsbestand bei Anlage",
    });
  }

  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${companyId}/${newId}/${Date.now()}_${safeName}`;
    const { error: uploadError } = await supabase.storage.from("material-photos").upload(path, photo, {
      contentType: photo.type || undefined,
      upsert: false,
    });
    if (!uploadError) {
      await supabase.from("materials").update({ photo_path: path }).eq("id", newId);
    }
  }

  const document = formData.get("document");
  if (document instanceof File && document.size > 0) {
    const categoryRaw = String(formData.get("document_category") ?? "sonstiges");
    const category = (MATERIAL_DOCUMENT_CATEGORIES as readonly string[]).includes(categoryRaw) ? categoryRaw : "sonstiges";
    const safeName = document.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${companyId}/${newId}/${Date.now()}_${safeName}`;
    const { error: uploadError } = await supabase.storage.from("material-documents").upload(path, document, {
      contentType: document.type || undefined,
      upsert: false,
    });
    if (!uploadError) {
      await supabase.from("material_documents").insert({
        company_id: companyId,
        material_id: newId,
        category,
        file_name: document.name,
        storage_path: path,
        size_bytes: document.size,
      });
    }
  }

  revalidatePath("/material");
  redirect(`/material?panel=${newId}&message=Material+angelegt`);
}

// --- Direktaufrufe fürs Detailpanel ---

export async function updateMaterialProfile(id: string, returnTo: string, formData: FormData) {
  const { supabase, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Bearbeiten"));
  }

  const fields = readMaterialForm(formData);
  if (!fields.name) {
    redirect(withError(returnTo, "Bezeichnung ist erforderlich"));
  }

  // Der Status hängt (außer bei "auslaufartikel") vom Bestand ab. Ändert
  // ein Admin hier den Mindestbestand direkt in den Stammdaten, muss der
  // Status neu berechnet werden – sonst bliebe z. B. ein Badge
  // "Niedriger Bestand" fälschlich stehen/verschwunden, bis die nächste
  // Materialbewegung gebucht wird.
  const { data: current } = await supabase.from("materials").select("quantity, status").eq("id", id).maybeSingle();
  const patch = current
    ? { ...fields, status: computeAutoStatus(Number(current.quantity), fields.min_quantity, current.status) }
    : fields;

  const { error } = await supabase.from("materials").update(patch).eq("id", id);
  if (error) redirect(withError(returnTo, error.message));

  revalidatePath("/material");
}

export async function updateMaterialStatus(id: string, returnTo: string, formData: FormData) {
  const { supabase, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Ändern des Status"));
  }
  const status = String(formData.get("status") ?? "");
  if (!(MATERIAL_STATUSES as readonly string[]).includes(status)) {
    redirect(withError(returnTo, "Ungültiger Status"));
  }

  const { error } = await supabase.from("materials").update({ status }).eq("id", id);
  if (error) redirect(withError(returnTo, error.message));

  revalidatePath("/material");
}

export async function addMaterialMovement(id: string, returnTo: string, formData: FormData) {
  const { supabase, companyId, userId, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Erfassen"));
  }

  const movementTypeRaw = String(formData.get("movement_type") ?? "wareneingang");
  const movementType = (MOVEMENT_TYPES as readonly string[]).includes(movementTypeRaw) ? movementTypeRaw : "wareneingang";
  const amount = toNullableNumber(formData.get("quantity"));
  if (amount === null || amount < 0) {
    redirect(withError(returnTo, "Bitte eine gültige Menge angeben"));
  }

  const { data: material } = await supabase
    .from("materials")
    .select("quantity, min_quantity, status, location_id")
    .eq("id", id)
    .maybeSingle();
  if (!material) redirect(withError(returnTo, "Material nicht gefunden"));

  const fromLocationId = toNullableString(formData.get("from_location_id"));
  const toLocationId = toNullableString(formData.get("to_location_id"));
  const orderId = toNullableString(formData.get("order_id"));
  const reason = toNullableString(formData.get("reason"));

  let newQuantity = Number(material!.quantity);
  let movementQuantity = amount as number;
  const patch: Database["public"]["Tables"]["materials"]["Update"] = {};

  switch (movementType) {
    case "wareneingang":
      newQuantity += amount as number;
      patch.last_ordered_at = new Date().toISOString().slice(0, 10);
      break;
    case "entnahme":
      newQuantity = Math.max(0, newQuantity - (amount as number));
      break;
    case "rueckgabe":
      newQuantity += amount as number;
      break;
    case "umlagerung":
      movementQuantity = amount as number;
      if (toLocationId) patch.location_id = toLocationId;
      break;
    case "inventur":
      // Bei der Inventur ist "quantity" die gezählte Gesamtmenge, nicht die
      // Differenz – die Bewegung protokolliert trotzdem die Differenz.
      movementQuantity = (amount as number) - newQuantity;
      newQuantity = amount as number;
      break;
  }

  if (movementType !== "umlagerung") {
    patch.quantity = newQuantity;
    patch.status = computeAutoStatus(newQuantity, material!.min_quantity !== null ? Number(material!.min_quantity) : null, material!.status);
  }

  const { error: updateError } = await supabase.from("materials").update(patch).eq("id", id);
  if (updateError) redirect(withError(returnTo, updateError.message));

  const { error } = await supabase.from("material_movements").insert({
    company_id: companyId,
    material_id: id,
    movement_type: movementType,
    quantity: movementQuantity,
    from_location_id: fromLocationId ?? (movementType === "umlagerung" ? material!.location_id : null),
    to_location_id: toLocationId,
    order_id: orderId,
    reason,
    performed_by: userId,
  });
  if (error) redirect(withError(returnTo, error.message));

  revalidatePath("/material");
}

export async function uploadMaterialPhoto(id: string, returnTo: string, formData: FormData) {
  const { supabase, companyId, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Hochladen"));
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(withError(returnTo, "Bitte ein Bild auswählen"));
  }

  const { data: existing } = await supabase.from("materials").select("photo_path").eq("id", id).maybeSingle();

  const safeName = (file as File).name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${companyId}/${id}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage.from("material-photos").upload(path, file as File, {
    contentType: (file as File).type || undefined,
    upsert: false,
  });
  if (uploadError) redirect(withError(returnTo, uploadError.message));

  const { error } = await supabase.from("materials").update({ photo_path: path }).eq("id", id);
  if (error) redirect(withError(returnTo, error.message));

  if (existing?.photo_path) {
    await supabase.storage.from("material-photos").remove([existing.photo_path]);
  }

  revalidatePath("/material");
}

export async function removeMaterialPhoto(id: string, returnTo: string) {
  const { supabase, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Entfernen"));
  }

  const { data: existing } = await supabase.from("materials").select("photo_path").eq("id", id).maybeSingle();
  if (existing?.photo_path) {
    await supabase.storage.from("material-photos").remove([existing.photo_path]);
  }

  const { error } = await supabase.from("materials").update({ photo_path: null }).eq("id", id);
  if (error) redirect(withError(returnTo, error.message));

  revalidatePath("/material");
}

export async function uploadMaterialDocument(id: string, returnTo: string, formData: FormData) {
  const { supabase, companyId, userId, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Hochladen"));
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(withError(returnTo, "Bitte eine Datei auswählen"));
  }

  const categoryRaw = String(formData.get("category") ?? "sonstiges");
  const category = (MATERIAL_DOCUMENT_CATEGORIES as readonly string[]).includes(categoryRaw) ? categoryRaw : "sonstiges";

  const safeName = (file as File).name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${companyId}/${id}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage.from("material-documents").upload(path, file as File, {
    contentType: (file as File).type || undefined,
    upsert: false,
  });
  if (uploadError) redirect(withError(returnTo, uploadError.message));

  const { error } = await supabase.from("material_documents").insert({
    company_id: companyId,
    material_id: id,
    category,
    file_name: (file as File).name,
    storage_path: path,
    size_bytes: (file as File).size,
    uploaded_by: userId,
  });
  if (error) redirect(withError(returnTo, error.message));

  revalidatePath("/material");
}

export async function deleteMaterialDocument(documentId: string, storagePath: string, returnTo: string) {
  const { supabase, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Löschen"));
  }

  await supabase.storage.from("material-documents").remove([storagePath]);
  await supabase.from("material_documents").delete().eq("id", documentId);
  revalidatePath("/material");
}

// --- Reservierungen für Fahrzeuge/Mitarbeiter ---

export async function reserveMaterialForTarget(id: string, returnTo: string, formData: FormData) {
  const { supabase, companyId, userId, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Reservieren"));
  }

  const targetTypeRaw = String(formData.get("target_type") ?? "");
  if (!(RESERVATION_TARGET_TYPES as readonly string[]).includes(targetTypeRaw)) {
    redirect(withError(returnTo, "Ungültiges Ziel"));
  }
  const quantity = toNullableNumber(formData.get("quantity"));
  if (quantity === null || quantity <= 0) {
    redirect(withError(returnTo, "Bitte eine gültige Menge angeben"));
  }
  const fleetItemId = targetTypeRaw === "fahrzeug" ? toNullableString(formData.get("fleet_item_id")) : null;
  const employeeId = targetTypeRaw === "mitarbeiter" ? toNullableString(formData.get("employee_id")) : null;
  if (targetTypeRaw === "fahrzeug" && !fleetItemId) redirect(withError(returnTo, "Bitte ein Fahrzeug auswählen"));
  if (targetTypeRaw === "mitarbeiter" && !employeeId) redirect(withError(returnTo, "Bitte einen Mitarbeiter auswählen"));

  // Verfügbarkeit prüfen: Bestand abzüglich bereits offener Reservierungen
  // (sowohl für Fahrzeuge/Mitarbeiter als auch für Aufträge über
  // order_materials) muss die neu angeforderte Menge decken – sonst könnten
  // mehrere Reservierungen zusammen mehr als der Lagerbestand beanspruchen.
  const [{ data: materialRow }, { data: existingReservations }, { data: existingOrderMaterials }] = await Promise.all([
    supabase.from("materials").select("quantity").eq("id", id).maybeSingle(),
    supabase.from("material_reservations").select("quantity").eq("material_id", id).eq("status", "reserviert"),
    supabase.from("order_materials").select("quantity").eq("material_id", id).eq("status", "reserviert"),
  ]);
  const alreadyReserved =
    (existingReservations ?? []).reduce((sum, r) => sum + Number(r.quantity), 0) +
    (existingOrderMaterials ?? []).reduce((sum, r) => sum + Number(r.quantity), 0);
  const available = Math.max(0, Number(materialRow?.quantity ?? 0) - alreadyReserved);
  if ((quantity as number) > available) {
    redirect(withError(returnTo, `Nur ${available} Einheit(en) verfügbar – bitte eine geringere Menge reservieren`));
  }

  const { error } = await supabase.from("material_reservations").insert({
    company_id: companyId,
    material_id: id,
    quantity,
    target_type: targetTypeRaw,
    fleet_item_id: fleetItemId,
    employee_id: employeeId,
    note: toNullableString(formData.get("note")),
    reserved_by: userId,
  });
  if (error) redirect(withError(returnTo, error.message));

  await supabase.from("materials").update({ status: "reserviert" }).eq("id", id).eq("status", "verfuegbar");

  revalidatePath("/material");
}

export async function releaseMaterialReservation(reservationId: string, returnTo: string) {
  const { supabase, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Aufheben"));
  }

  await supabase
    .from("material_reservations")
    .update({ status: "storniert", released_at: new Date().toISOString() })
    .eq("id", reservationId);

  revalidatePath("/material");
}

export async function consumeMaterialReservation(reservationId: string, returnTo: string) {
  const { supabase, companyId, userId, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung"));
  }

  // Die Reservierung wird zuerst atomar von "reserviert" auf "verbraucht"
  // gesetzt (bedingtes Update mit .eq("status", "reserviert")) – nur wenn
  // dieses Update tatsächlich eine Zeile trifft, wird der Bestand reduziert.
  // Ohne diese Bedingung würde ein Doppelklick, ein erneuter Formular-Submit
  // oder ein Klick auf eine bereits stornierte Reservierung den Bestand
  // mehrfach abbuchen.
  const { data: claimed } = await supabase
    .from("material_reservations")
    .update({ status: "verbraucht", released_at: new Date().toISOString() })
    .eq("id", reservationId)
    .eq("status", "reserviert")
    .select("material_id, quantity")
    .maybeSingle();

  if (!claimed) {
    revalidatePath("/material");
    return;
  }

  const { data: material } = await supabase
    .from("materials")
    .select("quantity, min_quantity, status")
    .eq("id", claimed.material_id)
    .maybeSingle();

  if (material) {
    const newQuantity = Math.max(0, Number(material.quantity) - Number(claimed.quantity));
    await supabase
      .from("materials")
      .update({
        quantity: newQuantity,
        status: computeAutoStatus(newQuantity, material.min_quantity !== null ? Number(material.min_quantity) : null, material.status),
      })
      .eq("id", claimed.material_id);

    await supabase.from("material_movements").insert({
      company_id: companyId,
      material_id: claimed.material_id,
      movement_type: "entnahme",
      quantity: Number(claimed.quantity),
      performed_by: userId,
      reason: "Reservierung verbraucht",
    });
  }

  revalidatePath("/material");
}

// --- Zugeordnete Aufträge (order_materials, bestehende Tabelle aus der
//     Auftragsverwaltung – hier nur die "Verbrauch buchen"-Aktion, die den
//     Bestand nach Einsatz automatisch reduziert) ---

export async function consumeOrderMaterial(orderMaterialId: string, returnTo: string) {
  const { supabase, companyId, userId, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung"));
  }

  // Analog zu consumeMaterialReservation: erst atomar per bedingtem Update
  // (nur wenn noch "reserviert") beanspruchen, dann den Bestand reduzieren –
  // verhindert eine doppelte Abbuchung bei Doppelklick/erneutem Submit.
  const { data: claimed } = await supabase
    .from("order_materials")
    .update({ status: "verbraucht", consumed_at: new Date().toISOString() })
    .eq("id", orderMaterialId)
    .eq("status", "reserviert")
    .select("material_id, quantity, order_id")
    .maybeSingle();

  if (!claimed) {
    revalidatePath("/material");
    return;
  }
  const link = claimed;

  const { data: material } = await supabase
    .from("materials")
    .select("quantity, min_quantity, status")
    .eq("id", link.material_id)
    .maybeSingle();

  if (material) {
    const newQuantity = Math.max(0, Number(material.quantity) - Number(link.quantity));
    await supabase
      .from("materials")
      .update({
        quantity: newQuantity,
        status: computeAutoStatus(newQuantity, material.min_quantity !== null ? Number(material.min_quantity) : null, material.status),
      })
      .eq("id", link.material_id);

    await supabase.from("material_movements").insert({
      company_id: companyId,
      material_id: link.material_id,
      movement_type: "entnahme",
      quantity: Number(link.quantity),
      order_id: link.order_id,
      performed_by: userId,
      reason: "Materialverbrauch aus Auftrag gebucht",
    });
  }

  revalidatePath("/material");
  revalidatePath("/auftraege");
}

// --- CSV-Import ("Material importieren") ---
//
// Erwartet eine mit Semikolon oder Komma getrennte CSV-Datei mit einer
// Kopfzeile. Erkannt werden die Spalten name/bezeichnung, unit/einheit,
// category/kategorie, quantity/bestand, min_quantity/mindestbestand,
// supplier_name/lieferant, purchase_price/einkaufspreis, unit_price/
// verkaufspreis – alle außer "name" sind optional. Nicht erkannte Spalten
// werden ignoriert. Jede importierte Zeile erhält wie bei der manuellen
// Anlage automatisch eine Materialnummer/QR-Code sowie bei Bestand > 0
// einen protokollierten Anfangsbestand (Wareneingang).

function parseCsvLine(line: string, delimiter: string): string[] {
  return line.split(delimiter).map((cell) => cell.trim().replace(/^"(.*)"$/, "$1").replace(/""/g, '"'));
}

export async function importMaterialsCsv(returnTo: string, formData: FormData) {
  const { supabase, companyId } = await requireMaterialAdminContext();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(withError(returnTo, "Bitte eine CSV-Datei auswählen"));
  }

  const text = await (file as File).text();
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    redirect(withError(returnTo, "Die CSV-Datei enthält keine Datenzeilen"));
  }

  const delimiter = (lines[0]?.match(/;/g)?.length ?? 0) >= (lines[0]?.match(/,/g)?.length ?? 0) ? ";" : ",";
  const header = parseCsvLine(lines[0]!, delimiter).map((h) => h.toLowerCase());
  const colIndex = (...keys: string[]) => keys.map((k) => header.indexOf(k)).find((i) => i !== -1) ?? -1;

  const idx = {
    name: colIndex("name", "bezeichnung"),
    unit: colIndex("unit", "einheit"),
    category: colIndex("category", "kategorie"),
    quantity: colIndex("quantity", "bestand", "menge"),
    minQuantity: colIndex("min_quantity", "mindestbestand"),
    supplierName: colIndex("supplier_name", "lieferant"),
    purchasePrice: colIndex("purchase_price", "einkaufspreis"),
    unitPrice: colIndex("unit_price", "verkaufspreis", "preis"),
    notes: colIndex("notes", "notiz", "notizen"),
  };

  if (idx.name === -1) {
    redirect(withError(returnTo, "Die CSV-Datei benötigt mindestens eine Spalte 'name' bzw. 'bezeichnung'"));
  }

  let imported = 0;
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line, delimiter);
    const name = (cells[idx.name] ?? "").trim();
    if (!name) continue;

    const categoryRaw = idx.category !== -1 ? (cells[idx.category] ?? "").trim() : "";
    const category = (MATERIAL_CATEGORIES as readonly string[]).includes(categoryRaw) ? categoryRaw : null;
    const quantity = idx.quantity !== -1 ? (toNullableNumber(cells[idx.quantity] ?? null) ?? 0) : 0;
    const minQuantity = idx.minQuantity !== -1 ? toNullableNumber(cells[idx.minQuantity] ?? null) : null;

    const { data: materialNumber } = await supabase.rpc("next_material_number", { p_company_id: companyId });
    const status = computeAutoStatus(quantity, minQuantity, "verfuegbar");

    const { data: created } = await supabase
      .from("materials")
      .insert({
        name,
        unit: (idx.unit !== -1 ? (cells[idx.unit] ?? "").trim() : "") || "Stück",
        category,
        quantity,
        min_quantity: minQuantity,
        supplier_name: idx.supplierName !== -1 ? toNullableString(cells[idx.supplierName] ?? null) : null,
        purchase_price: idx.purchasePrice !== -1 ? toNullableNumber(cells[idx.purchasePrice] ?? null) : null,
        unit_price: idx.unitPrice !== -1 ? toNullableNumber(cells[idx.unitPrice] ?? null) : null,
        notes: idx.notes !== -1 ? toNullableString(cells[idx.notes] ?? null) : null,
        company_id: companyId,
        material_number: materialNumber ?? null,
        qr_code: materialNumber ?? null,
        status,
      })
      .select("id")
      .single();

    if (created) {
      imported++;
      if (quantity > 0) {
        await supabase.from("material_movements").insert({
          company_id: companyId,
          material_id: created.id as string,
          movement_type: "wareneingang",
          quantity,
          reason: "Anfangsbestand beim CSV-Import",
        });
      }
    }
  }

  revalidatePath("/material");
  redirect(`/material?message=${encodeURIComponent(`${imported} Material${imported === 1 ? "" : "ien"} importiert`)}`);
}

// --- Lagerorte ---

export async function addMaterialLocation(returnTo: string, formData: FormData) {
  const { supabase, companyId, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung"));
  }
  const name = toNullableString(formData.get("name"));
  if (!name) redirect(withError(returnTo, "Name ist erforderlich"));

  await supabase.from("material_locations").insert({ company_id: companyId, name });
  revalidatePath("/material");
  revalidatePath("/material/neu");
}

export async function deleteMaterialLocation(locationId: string, returnTo: string) {
  const { supabase, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung"));
  }
  await supabase.from("material_locations").delete().eq("id", locationId);
  revalidatePath("/material");
}

// --- Archivieren / Löschen ---

export async function archiveMaterial(id: string, archived: boolean) {
  const { supabase } = await requireMaterialAdminContext();
  await supabase.from("materials").update({ is_archived: archived }).eq("id", id);
  revalidatePath("/material");
  redirect(`/material?message=${archived ? "Material+archiviert" : "Archivierung+aufgehoben"}`);
}

export async function deleteMaterial(id: string, returnTo: string) {
  const { supabase } = await requireMaterialAdminContext();
  const { error } = await supabase.from("materials").delete().eq("id", id);
  revalidatePath("/material");
  if (error) {
    // 23503 = Fremdschlüsselverletzung – order_materials.material_id_fkey
    // ist bewusst ON DELETE RESTRICT (im Gegensatz zu den anderen, per
    // CASCADE verknüpften Tabellen), damit die Verbrauchshistorie eines
    // Auftrags nicht durch das Löschen eines Materials verloren geht.
    const message = error.code === "23503" ? "Material ist Aufträgen zugeordnet und kann nicht gelöscht werden – bitte stattdessen archivieren" : error.message;
    redirect(withError(returnTo, message));
  }
  redirect("/material?message=Material+gel%C3%B6scht");
}

// --- Massenaktionen ---

export async function bulkSetMaterialStatus(ids: string[], status: string) {
  const { supabase } = await requireMaterialAdminContext();
  if (ids.length === 0 || !(MATERIAL_STATUSES as readonly string[]).includes(status)) return;
  await supabase.from("materials").update({ status }).in("id", ids);
  revalidatePath("/material");
}

export async function bulkSetMaterialArchived(ids: string[], archived: boolean) {
  const { supabase } = await requireMaterialAdminContext();
  if (ids.length === 0) return;
  await supabase.from("materials").update({ is_archived: archived }).in("id", ids);
  revalidatePath("/material");
}

export async function bulkDeleteMaterials(ids: string[]): Promise<{ error: string | null }> {
  const { supabase } = await requireMaterialAdminContext();
  if (ids.length === 0) return { error: null };
  const { error } = await supabase.from("materials").delete().in("id", ids);
  revalidatePath("/material");
  if (error) {
    // Ein einzelnes, per Fremdschlüssel gegen order_materials gesperrtes
    // Material lässt den gesamten Batch-Delete fehlschlagen (Postgres führt
    // ein DELETE ... IN (...) atomar aus) – daher die UI explizit
    // informieren, statt stillschweigend "Erfolg" zu melden.
    return {
      error:
        error.code === "23503"
          ? "Mindestens ein ausgewähltes Material ist Aufträgen zugeordnet und konnte nicht gelöscht werden – bitte stattdessen archivieren"
          : error.message,
    };
  }
  return { error: null };
}
