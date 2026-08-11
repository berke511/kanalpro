"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { IN_PROGRESS_STATUSES, ORDER_KINDS, ORDER_PRIORITIES, ORDER_STATUSES, STATUS_LABELS } from "@/lib/orders";
import { canCreateOrders, canDeleteOrArchiveOrders, canManageResourcesAndSchedule } from "@/lib/roles";

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

function emptyToNull(value: FormDataEntryValue | null) {
  const str = String(value ?? "").trim();
  return str.length ? str : null;
}

function withError(returnTo: string, message: string) {
  const sep = returnTo.includes("?") ? "&" : "?";
  return `${returnTo}${sep}error=${encodeURIComponent(message)}`;
}

function intOrNull(value: FormDataEntryValue | null) {
  const str = String(value ?? "").trim();
  if (!str) return null;
  const n = Number.parseInt(str, 10);
  return Number.isFinite(n) ? n : null;
}

async function logOrderAudit(
  supabase: DbClient,
  entry: {
    companyId: string;
    orderId: string | null;
    orderLabel: string;
    actorId: string;
    action:
      | "created"
      | "updated"
      | "status_changed"
      | "assigned"
      | "unassigned"
      | "resource_assigned"
      | "resource_unassigned"
      | "material_added"
      | "document_uploaded"
      | "note_added"
      | "archived"
      | "unarchived"
      | "deleted";
    summary?: string;
  },
) {
  await supabase.from("order_audit_log").insert({
    company_id: entry.companyId,
    order_id: entry.orderId,
    order_label: entry.orderLabel,
    actor_id: entry.actorId,
    action: entry.action,
    summary: entry.summary ?? null,
  });
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
  const { supabase, companyId, userId, role } = await requireCompanyContext();

  if (!canCreateOrders(role)) {
    redirect("/auftraege?error=Keine+Berechtigung+zum+Anlegen+von+Auftr%C3%A4gen");
  }

  const fields = readOrderForm(formData);

  if (!fields.title) {
    redirect("/auftraege/neu?error=Titel+ist+erforderlich");
  }

  const { data: orderNumber } = await supabase.rpc("next_order_number", { p_company_id: companyId });

  const { data: inserted, error } = await supabase
    .from("orders")
    .insert({
      ...fields,
      company_id: companyId,
      order_number: orderNumber ?? null,
      created_by: userId,
      updated_by: userId,
    })
    .select("id, title, order_number")
    .single();

  if (error || !inserted) {
    redirect(`/auftraege/neu?error=${encodeURIComponent(error?.message ?? "Unbekannter Fehler")}`);
  }

  await logOrderAudit(supabase, {
    companyId,
    orderId: inserted.id,
    orderLabel: `${inserted.order_number ?? ""} ${inserted.title}`.trim(),
    actorId: userId,
    action: "created",
  });

  if (fields.assigned_to) {
    await supabase
      .from("order_assignments")
      .insert({ company_id: companyId, order_id: inserted.id, employee_id: fields.assigned_to, assigned_by: userId })
      .select()
      .maybeSingle();
  }

  revalidatePath("/auftraege");
  redirect("/auftraege");
}

export async function updateOrder(id: string, formData: FormData) {
  const { supabase, companyId, userId } = await requireCompanyContext();
  const fields = readOrderForm(formData);

  if (!fields.title) {
    redirect(`/auftraege/${id}?error=Titel+ist+erforderlich`);
  }

  const { error } = await supabase
    .from("orders")
    .update({ ...fields, updated_by: userId })
    .eq("id", id);

  if (error) {
    redirect(`/auftraege/${id}?error=${encodeURIComponent(error.message)}`);
  }

  await logOrderAudit(supabase, {
    companyId,
    orderId: id,
    orderLabel: fields.title,
    actorId: userId,
    action: "updated",
  });

  revalidatePath("/auftraege");
  revalidatePath(`/auftraege/${id}`);
  redirect(`/auftraege/${id}?message=Gespeichert`);
}

// Vollständiges Bearbeiten-Formular (Vorlage "Übersicht + Formular" auf
// /auftraege/[id]) – deckt im Gegensatz zum alten updateOrder() oben auch
// Auftragsart, Priorität, Uhrzeit/Dauer sowie mehrere Mitarbeiter/
// Fahrzeuge/Maschinen ab. Ressourcen werden per Diff abgeglichen (entfernte
// Häkchen werden auch wirklich entfernt, nicht nur ergänzt).
export async function updateOrderFull(id: string, formData: FormData) {
  const { supabase, companyId, userId } = await requireCompanyContext();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    redirect(`/auftraege/${id}?error=Titel+ist+erforderlich`);
  }

  const orderKindRaw = String(formData.get("order_kind") ?? "sonstige");
  const orderKind = (ORDER_KINDS as readonly string[]).includes(orderKindRaw) ? orderKindRaw : "sonstige";
  const priorityRaw = String(formData.get("priority") ?? "standard");
  const priority = (ORDER_PRIORITIES as readonly string[]).includes(priorityRaw) ? priorityRaw : "standard";
  const statusRaw = String(formData.get("status") ?? "offen");
  const status = (ORDER_STATUSES as readonly string[]).includes(statusRaw) ? statusRaw : "offen";

  const { error } = await supabase
    .from("orders")
    .update({
      title,
      description: emptyToNull(formData.get("description")),
      order_kind: orderKind,
      priority,
      status,
      customer_id: emptyToNull(formData.get("customer_id")),
      scheduled_date: emptyToNull(formData.get("scheduled_date")),
      start_time: emptyToNull(formData.get("start_time")),
      planned_duration_minutes: intOrNull(formData.get("planned_duration_minutes")),
      updated_by: userId,
    })
    .eq("id", id);

  if (error) {
    redirect(`/auftraege/${id}?error=${encodeURIComponent(error.message)}`);
  }

  const employeeIds = formData.getAll("employee_ids").map(String).filter(Boolean);
  const resourceIds = [...formData.getAll("vehicle_ids"), ...formData.getAll("machine_ids")].map(String).filter(Boolean);

  const [{ data: currentAssignments }, { data: currentResources }] = await Promise.all([
    supabase.from("order_assignments").select("id, employee_id").eq("order_id", id),
    supabase.from("order_resources").select("id, fleet_item_id").eq("order_id", id),
  ]);

  const currentEmployeeIds = new Set((currentAssignments ?? []).map((a) => a.employee_id));
  const currentResourceIds = new Set((currentResources ?? []).map((r) => r.fleet_item_id));

  const toRemoveAssignmentIds = (currentAssignments ?? []).filter((a) => !employeeIds.includes(a.employee_id)).map((a) => a.id);
  const toAddEmployeeIds = employeeIds.filter((eid) => !currentEmployeeIds.has(eid));

  const toRemoveResourceIds = (currentResources ?? []).filter((r) => !resourceIds.includes(r.fleet_item_id)).map((r) => r.id);
  const toAddResourceIds = resourceIds.filter((rid) => !currentResourceIds.has(rid));

  if (toRemoveAssignmentIds.length > 0) {
    await supabase.from("order_assignments").delete().in("id", toRemoveAssignmentIds);
  }
  if (toAddEmployeeIds.length > 0) {
    await supabase.from("order_assignments").insert(
      toAddEmployeeIds.map((employeeId) => ({ company_id: companyId, order_id: id, employee_id: employeeId, assigned_by: userId })),
    );
  }
  if (toRemoveResourceIds.length > 0) {
    await supabase.from("order_resources").delete().in("id", toRemoveResourceIds);
  }
  if (toAddResourceIds.length > 0) {
    await supabase.from("order_resources").insert(
      toAddResourceIds.map((fleetItemId) => ({ company_id: companyId, order_id: id, fleet_item_id: fleetItemId })),
    );
  }

  await logOrderAudit(supabase, {
    companyId,
    orderId: id,
    orderLabel: title,
    actorId: userId,
    action: "updated",
  });

  revalidatePath("/auftraege");
  revalidatePath(`/auftraege/${id}`);
  revalidatePath("/einsatzplanung");
  redirect(`/auftraege/${id}?message=Gespeichert`);
}

export async function deleteOrder(id: string) {
  const { supabase, companyId, userId, role } = await requireCompanyContext();

  if (!canDeleteOrArchiveOrders(role)) {
    redirect("/auftraege?error=Keine+Berechtigung+zum+L%C3%B6schen");
  }

  const { data: order } = await supabase.from("orders").select("title, order_number").eq("id", id).maybeSingle();

  await supabase.from("orders").delete().eq("id", id);

  if (order) {
    await logOrderAudit(supabase, {
      companyId,
      orderId: null,
      orderLabel: `${order.order_number ?? ""} ${order.title}`.trim(),
      actorId: userId,
      action: "deleted",
    });
  }

  revalidatePath("/auftraege");
  redirect("/auftraege");
}

// Direkt aus Client-Komponenten aufgerufene Aktionen (kein <form action>,
// daher kein redirect() – Aufrufer nutzt startTransition + router.refresh(),
// analog zum Muster in kunden/actions.ts).

export async function toggleOrderFavorite(orderId: string, next: boolean) {
  const { supabase } = await requireCompanyContext();
  await supabase.from("orders").update({ is_favorite: next }).eq("id", orderId);
  revalidatePath("/auftraege");
}

export async function setOrderArchived(orderId: string, archived: boolean) {
  const { supabase, companyId, userId, role } = await requireCompanyContext();
  if (!canDeleteOrArchiveOrders(role)) return;

  const { data: order } = await supabase
    .from("orders")
    .select("title, order_number")
    .eq("id", orderId)
    .maybeSingle();

  await supabase.from("orders").update({ is_archived: archived, updated_by: userId }).eq("id", orderId);

  if (order) {
    await logOrderAudit(supabase, {
      companyId,
      orderId,
      orderLabel: `${order.order_number ?? ""} ${order.title}`.trim(),
      actorId: userId,
      action: archived ? "archived" : "unarchived",
    });
  }

  revalidatePath("/auftraege");
}

export async function duplicateOrder(orderId: string) {
  const { supabase, companyId, userId, role } = await requireCompanyContext();
  if (!canCreateOrders(role)) return;

  const { data: original } = await supabase
    .from("orders")
    .select(
      "title, description, customer_id, property_id, order_kind, service_type, priority, internal_notes, access_info, arrival_info, onsite_contact, safety_notes",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!original) return;

  const { data: orderNumber } = await supabase.rpc("next_order_number", { p_company_id: companyId });

  const { data: inserted } = await supabase
    .from("orders")
    .insert({
      ...original,
      title: `${original.title} (Kopie)`,
      status: "entwurf",
      order_number: orderNumber ?? null,
      company_id: companyId,
      created_by: userId,
      updated_by: userId,
    })
    .select("id, title, order_number")
    .single();

  if (inserted) {
    await logOrderAudit(supabase, {
      companyId,
      orderId: inserted.id,
      orderLabel: `${inserted.order_number ?? ""} ${inserted.title}`.trim(),
      actorId: userId,
      action: "created",
      summary: `Dupliziert von Auftrag ${orderId}`,
    });
  }

  revalidatePath("/auftraege");
}

// --- Status (aus dem Detailpanel, direkter Aufruf – kein <form>) ---

export async function updateOrderStatus(orderId: string, status: string) {
  const { supabase, companyId, userId } = await requireCompanyContext();
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) return;

  const { data: order } = await supabase
    .from("orders")
    .select("title, order_number, status, started_at, completed_at")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.status === status) return;

  const patch: { status: string; updated_by: string; started_at?: string; completed_at?: string } = {
    status,
    updated_by: userId,
  };
  if (IN_PROGRESS_STATUSES.includes(status) && !order.started_at) {
    patch.started_at = new Date().toISOString();
  }
  if (status === "abgeschlossen" && !order.completed_at) {
    patch.completed_at = new Date().toISOString();
  }

  const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
  if (error) return;

  await logOrderAudit(supabase, {
    companyId,
    orderId,
    orderLabel: `${order.order_number ?? ""} ${order.title}`.trim(),
    actorId: userId,
    action: "status_changed",
    summary: `${STATUS_LABELS[order.status] ?? order.status} → ${STATUS_LABELS[status] ?? status}`,
  });

  revalidatePath("/auftraege");
}

// --- Ressourcen: Mitarbeiter ---

export async function assignEmployee(orderId: string, returnTo: string, formData: FormData) {
  const { supabase, companyId, userId, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Zuweisen von Mitarbeitern"));
  }

  const employeeId = emptyToNull(formData.get("employee_id"));
  if (!employeeId) redirect(returnTo);

  const { error } = await supabase
    .from("order_assignments")
    .insert({ company_id: companyId, order_id: orderId, employee_id: employeeId, assigned_by: userId });

  if (!error) {
    const [{ data: order }, { data: employee }] = await Promise.all([
      supabase.from("orders").select("title, order_number").eq("id", orderId).maybeSingle(),
      supabase.from("profiles").select("full_name").eq("id", employeeId).maybeSingle(),
    ]);
    if (order) {
      await logOrderAudit(supabase, {
        companyId,
        orderId,
        orderLabel: `${order.order_number ?? ""} ${order.title}`.trim(),
        actorId: userId,
        action: "assigned",
        summary: employee?.full_name ? `Mitarbeiter zugewiesen: ${employee.full_name}` : "Mitarbeiter zugewiesen",
      });
    }
  }

  revalidatePath("/auftraege");
  redirect(error ? withError(returnTo, error.message) : returnTo);
}

export async function unassignEmployee(orderId: string, assignmentId: string, returnTo: string) {
  const { supabase, companyId, userId, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung"));
  }

  const { data: assignment } = await supabase
    .from("order_assignments")
    .select("profiles!order_assignments_employee_id_fkey(full_name)")
    .eq("id", assignmentId)
    .maybeSingle();

  await supabase.from("order_assignments").delete().eq("id", assignmentId);

  const { data: order } = await supabase.from("orders").select("title, order_number").eq("id", orderId).maybeSingle();
  if (order) {
    await logOrderAudit(supabase, {
      companyId,
      orderId,
      orderLabel: `${order.order_number ?? ""} ${order.title}`.trim(),
      actorId: userId,
      action: "unassigned",
      summary: assignment?.profiles?.full_name ? `Mitarbeiter entfernt: ${assignment.profiles.full_name}` : "Mitarbeiter entfernt",
    });
  }

  revalidatePath("/auftraege");
  redirect(returnTo);
}

// --- Ressourcen: Fahrzeuge ---

export async function assignVehicle(orderId: string, returnTo: string, formData: FormData) {
  const { supabase, companyId, userId, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Zuweisen von Fahrzeugen"));
  }

  const fleetItemId = emptyToNull(formData.get("fleet_item_id"));
  if (!fleetItemId) redirect(returnTo);

  const { error } = await supabase
    .from("order_resources")
    .insert({ company_id: companyId, order_id: orderId, fleet_item_id: fleetItemId });

  if (!error) {
    const [{ data: order }, { data: vehicle }] = await Promise.all([
      supabase.from("orders").select("title, order_number").eq("id", orderId).maybeSingle(),
      supabase.from("fleet_items").select("name, license_plate").eq("id", fleetItemId).maybeSingle(),
    ]);
    if (order) {
      await logOrderAudit(supabase, {
        companyId,
        orderId,
        orderLabel: `${order.order_number ?? ""} ${order.title}`.trim(),
        actorId: userId,
        action: "resource_assigned",
        summary: vehicle ? `Fahrzeug zugewiesen: ${vehicle.license_plate || vehicle.name}` : "Fahrzeug zugewiesen",
      });
    }
  }

  revalidatePath("/auftraege");
  redirect(error ? withError(returnTo, error.message) : returnTo);
}

export async function unassignVehicle(orderId: string, resourceId: string, returnTo: string) {
  const { supabase, companyId, userId, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung"));
  }

  const { data: resource } = await supabase
    .from("order_resources")
    .select("fleet_items(name, license_plate)")
    .eq("id", resourceId)
    .maybeSingle();

  await supabase.from("order_resources").delete().eq("id", resourceId);

  const { data: order } = await supabase.from("orders").select("title, order_number").eq("id", orderId).maybeSingle();
  if (order) {
    await logOrderAudit(supabase, {
      companyId,
      orderId,
      orderLabel: `${order.order_number ?? ""} ${order.title}`.trim(),
      actorId: userId,
      action: "resource_unassigned",
      summary: resource?.fleet_items
        ? `Fahrzeug entfernt: ${resource.fleet_items.license_plate || resource.fleet_items.name}`
        : "Fahrzeug entfernt",
    });
  }

  revalidatePath("/auftraege");
  redirect(returnTo);
}

// --- Material ---

export async function addOrderMaterial(orderId: string, returnTo: string, formData: FormData) {
  const { supabase, companyId, userId } = await requireCompanyContext();
  const materialId = emptyToNull(formData.get("material_id"));
  const quantityRaw = Number(formData.get("quantity"));
  const quantity = Number.isFinite(quantityRaw) && quantityRaw > 0 ? quantityRaw : 1;

  if (!materialId) redirect(returnTo);

  const { error } = await supabase
    .from("order_materials")
    .insert({ company_id: companyId, order_id: orderId, material_id: materialId, quantity });

  if (!error) {
    const [{ data: order }, { data: material }] = await Promise.all([
      supabase.from("orders").select("title, order_number").eq("id", orderId).maybeSingle(),
      supabase.from("materials").select("name, unit").eq("id", materialId).maybeSingle(),
    ]);
    if (order) {
      await logOrderAudit(supabase, {
        companyId,
        orderId,
        orderLabel: `${order.order_number ?? ""} ${order.title}`.trim(),
        actorId: userId,
        action: "material_added",
        summary: material ? `${quantity} ${material.unit ?? ""} ${material.name}`.trim() : "Material hinzugefügt",
      });
    }
  }

  revalidatePath("/auftraege");
  redirect(error ? withError(returnTo, error.message) : returnTo);
}

export async function removeOrderMaterial(orderId: string, materialLinkId: string, returnTo: string) {
  const { supabase } = await requireCompanyContext();
  await supabase.from("order_materials").delete().eq("id", materialLinkId);
  revalidatePath("/auftraege");
  redirect(returnTo);
}

// --- Dokumente ---

export async function uploadOrderDocument(orderId: string, returnTo: string, formData: FormData) {
  const { supabase, companyId, userId } = await requireCompanyContext();
  const file = formData.get("file");
  const categoryRaw = String(formData.get("category") ?? "dokument");
  const category = ["dokument", "bild", "plan"].includes(categoryRaw) ? categoryRaw : "dokument";

  if (!(file instanceof File) || file.size === 0) {
    redirect(withError(returnTo, "Bitte eine Datei auswählen"));
  }

  const safeName = (file as File).name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${companyId}/${orderId}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage.from("order-documents").upload(path, file as File, {
    contentType: (file as File).type || undefined,
    upsert: false,
  });

  if (uploadError) {
    redirect(withError(returnTo, uploadError.message));
  }

  await supabase.from("order_documents").insert({
    company_id: companyId,
    order_id: orderId,
    file_name: (file as File).name,
    storage_path: path,
    content_type: (file as File).type || null,
    size_bytes: (file as File).size,
    category,
    uploaded_by: userId,
  });

  const { data: order } = await supabase.from("orders").select("title, order_number").eq("id", orderId).maybeSingle();
  if (order) {
    await logOrderAudit(supabase, {
      companyId,
      orderId,
      orderLabel: `${order.order_number ?? ""} ${order.title}`.trim(),
      actorId: userId,
      action: "document_uploaded",
      summary: (file as File).name,
    });
  }

  revalidatePath("/auftraege");
  redirect(returnTo);
}

export async function deleteOrderDocument(orderId: string, documentId: string, storagePath: string, returnTo: string) {
  const { supabase } = await requireCompanyContext();
  await supabase.storage.from("order-documents").remove([storagePath]);
  await supabase.from("order_documents").delete().eq("id", documentId);
  revalidatePath("/auftraege");
  redirect(returnTo);
}

// --- Massenaktionen ---
//
// Werden alle direkt aus der Auftragstabelle (Client-Komponente) heraus
// aufgerufen, analog zu toggleOrderFavorite oben – kein <form action>, kein
// Redirect nötig, der Aufrufer ruft danach selbst router.refresh().

export async function bulkSetOrderStatus(orderIds: string[], status: string) {
  const { supabase, userId } = await requireCompanyContext();
  if (orderIds.length === 0 || !(ORDER_STATUSES as readonly string[]).includes(status)) return;
  await supabase.from("orders").update({ status, updated_by: userId }).in("id", orderIds);
  revalidatePath("/auftraege");
}

export async function bulkAssignEmployeeToOrders(orderIds: string[], employeeId: string) {
  const { supabase, companyId, userId, role } = await requireCompanyContext();
  if (orderIds.length === 0 || !employeeId || !canManageResourcesAndSchedule(role)) return;
  const rows = orderIds.map((orderId) => ({
    company_id: companyId,
    order_id: orderId,
    employee_id: employeeId,
    assigned_by: userId,
  }));
  await supabase.from("order_assignments").upsert(rows, { onConflict: "order_id,employee_id", ignoreDuplicates: true });
  revalidatePath("/auftraege");
}

export async function bulkAssignVehicleToOrders(orderIds: string[], fleetItemId: string) {
  const { supabase, companyId, role } = await requireCompanyContext();
  if (orderIds.length === 0 || !fleetItemId || !canManageResourcesAndSchedule(role)) return;
  const rows = orderIds.map((orderId) => ({ company_id: companyId, order_id: orderId, fleet_item_id: fleetItemId }));
  await supabase.from("order_resources").upsert(rows, { onConflict: "order_id,fleet_item_id", ignoreDuplicates: true });
  revalidatePath("/auftraege");
}

export async function bulkSetOrderArchived(orderIds: string[], archived: boolean) {
  const { supabase, userId, role } = await requireCompanyContext();
  if (orderIds.length === 0 || !canDeleteOrArchiveOrders(role)) return;
  await supabase.from("orders").update({ is_archived: archived, updated_by: userId }).in("id", orderIds);
  revalidatePath("/auftraege");
}

export async function bulkDeleteOrders(orderIds: string[]) {
  const { supabase, role } = await requireCompanyContext();
  if (orderIds.length === 0 || !canDeleteOrArchiveOrders(role)) return;
  await supabase.from("orders").delete().in("id", orderIds);
  revalidatePath("/auftraege");
}

// --- Neuer-Auftrag-Assistent ---

// Schnellanlage aus dem Assistenten heraus (Schritt "Kunde und Objekt") –
// direkter Aufruf (kein <form>), damit der Assistent nach dem Anlegen den
// neuen Kunden/das neue Objekt sofort auswählen kann, ohne die Seite zu
// verlassen oder den bisherigen Fortschritt im Assistenten zu verlieren.
export async function quickCreateCustomer(
  name: string,
  kind: string,
): Promise<{ id: string; name: string } | null> {
  const { supabase, companyId } = await requireCompanyContext();
  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data: customerNumber } = await supabase.rpc("next_customer_number", { p_company_id: companyId });

  const { data, error } = await supabase
    .from("customers")
    .insert({
      company_id: companyId,
      kind: kind || "privat",
      status: "neukunde",
      name: trimmed,
      customer_number: customerNumber ?? null,
    })
    .select("id, name")
    .single();

  if (error || !data) return null;
  revalidatePath("/kunden");
  return data;
}

export async function quickCreateProperty(
  customerId: string,
  name: string,
  street: string,
  postalCode: string,
  city: string,
): Promise<{ id: string; name: string } | null> {
  const { supabase, companyId } = await requireCompanyContext();
  const trimmed = name.trim();
  if (!trimmed || !customerId) return null;

  const { data, error } = await supabase
    .from("customer_properties")
    .insert({
      company_id: companyId,
      customer_id: customerId,
      name: trimmed,
      street: street.trim() || null,
      postal_code: postalCode.trim() || null,
      city: city.trim() || null,
    })
    .select("id, name")
    .single();

  if (error || !data) return null;
  return data;
}

// Prüft auf bereits vorhandene, noch offene Aufträge für denselben Kunden
// (bzw. dasselbe Objekt, falls angegeben) – Schritt "Kunde und Objekt" warnt
// den Nutzer damit vor versehentlichen Doppelaufträgen.
export async function checkDuplicateOpenOrders(customerId: string, propertyId: string) {
  const { supabase } = await requireCompanyContext();
  if (!customerId) return [];

  let query = supabase
    .from("orders")
    .select("id, order_number, title, status")
    .eq("customer_id", customerId)
    .eq("is_archived", false)
    .not("status", "in", '("abgeschlossen","storniert")')
    .limit(5);

  if (propertyId) {
    query = query.eq("property_id", propertyId);
  }

  const { data } = await query;
  return data ?? [];
}

// Prüft, ob ausgewählte Mitarbeiter/Fahrzeuge/Maschinen am gewünschten
// Termin bereits einem anderen Auftrag zugewiesen sind – Schritt
// "Ressourcen" zeigt Konflikte direkt an; Speichern mit Konflikten ist
// weiterhin möglich, erfordert im Assistenten aber eine Bestätigung.
export async function checkResourceConflicts(employeeIds: string[], fleetItemIds: string[], date: string) {
  const { supabase } = await requireCompanyContext();
  if (!date || (employeeIds.length === 0 && fleetItemIds.length === 0)) {
    return { employees: [] as Array<{ id: string; name: string; orderLabel: string }>, vehicles: [] as Array<{ id: string; name: string; orderLabel: string }> };
  }

  const [{ data: assignmentRows }, { data: resourceRows }] = await Promise.all([
    employeeIds.length > 0
      ? supabase
          .from("order_assignments")
          .select("employee_id, orders!inner(order_number, title, scheduled_date), profiles!order_assignments_employee_id_fkey(full_name)")
          .in("employee_id", employeeIds)
          .eq("orders.scheduled_date", date)
      : Promise.resolve({ data: [] }),
    fleetItemIds.length > 0
      ? supabase
          .from("order_resources")
          .select("fleet_item_id, orders!inner(order_number, title, scheduled_date), fleet_items(name, license_plate)")
          .in("fleet_item_id", fleetItemIds)
          .eq("orders.scheduled_date", date)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    employees: (assignmentRows ?? []).map((r) => ({
      id: r.employee_id,
      name: r.profiles?.full_name ?? "Unbekannt",
      orderLabel: r.orders?.order_number ?? r.orders?.title ?? "",
    })),
    vehicles: (resourceRows ?? []).map((r) => ({
      id: r.fleet_item_id,
      name: r.fleet_items?.license_plate || r.fleet_items?.name || "Unbekannt",
      orderLabel: r.orders?.order_number ?? r.orders?.title ?? "",
    })),
  };
}

// Finale Anlage aus dem 7-Schritte-Assistenten – deckt alle Felder aller
// Schritte in einem Aufruf ab (Kunde/Objekt, Auftragsart/Leistung, Termin,
// Ressourcen, Beschreibung/Hinweise, Dokumente).
export async function createOrderFull(formData: FormData) {
  const { supabase, companyId, userId, role } = await requireCompanyContext();

  if (!canCreateOrders(role)) {
    redirect("/auftraege?error=Keine+Berechtigung+zum+Anlegen+von+Auftr%C3%A4gen");
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    redirect("/auftraege/neu?error=Titel+ist+erforderlich");
  }

  const orderKindRaw = String(formData.get("order_kind") ?? "sonstige");
  const orderKind = (ORDER_KINDS as readonly string[]).includes(orderKindRaw) ? orderKindRaw : "sonstige";
  const priorityRaw = String(formData.get("priority") ?? "standard");
  const priority = (ORDER_PRIORITIES as readonly string[]).includes(priorityRaw) ? priorityRaw : "standard";

  const { data: orderNumber } = await supabase.rpc("next_order_number", { p_company_id: companyId });

  const { data: inserted, error } = await supabase
    .from("orders")
    .insert({
      company_id: companyId,
      customer_id: emptyToNull(formData.get("customer_id")),
      property_id: emptyToNull(formData.get("property_id")),
      title,
      description: emptyToNull(formData.get("description")),
      order_kind: orderKind,
      service_type: emptyToNull(formData.get("service_type")),
      priority,
      status: "offen",
      scheduled_date: emptyToNull(formData.get("scheduled_date")),
      start_time: emptyToNull(formData.get("start_time")),
      planned_duration_minutes: intOrNull(formData.get("planned_duration_minutes")),
      time_window_start: emptyToNull(formData.get("time_window_start")),
      time_window_end: emptyToNull(formData.get("time_window_end")),
      all_day: formData.get("all_day") === "1",
      is_recurring: formData.get("is_recurring") === "1",
      internal_notes: emptyToNull(formData.get("internal_notes")),
      access_info: emptyToNull(formData.get("access_info")),
      arrival_info: emptyToNull(formData.get("arrival_info")),
      onsite_contact: emptyToNull(formData.get("onsite_contact")),
      safety_notes: emptyToNull(formData.get("safety_notes")),
      order_number: orderNumber ?? null,
      created_by: userId,
      updated_by: userId,
    })
    .select("id, title, order_number")
    .single();

  if (error || !inserted) {
    redirect(`/auftraege/neu?error=${encodeURIComponent(error?.message ?? "Unbekannter Fehler")}`);
  }

  await logOrderAudit(supabase, {
    companyId,
    orderId: inserted.id,
    orderLabel: `${inserted.order_number ?? ""} ${inserted.title}`.trim(),
    actorId: userId,
    action: "created",
  });

  const employeeIds = formData.getAll("employee_ids").map(String).filter(Boolean);
  const resourceIds = [...formData.getAll("vehicle_ids"), ...formData.getAll("machine_ids")].map(String).filter(Boolean);

  if (employeeIds.length > 0) {
    await supabase.from("order_assignments").insert(
      employeeIds.map((employeeId) => ({
        company_id: companyId,
        order_id: inserted.id,
        employee_id: employeeId,
        assigned_by: userId,
      })),
    );
  }
  if (resourceIds.length > 0) {
    await supabase.from("order_resources").insert(
      resourceIds.map((fleetItemId) => ({ company_id: companyId, order_id: inserted.id, fleet_item_id: fleetItemId })),
    );
  }

  const documentFiles = formData.getAll("documents").filter((f): f is File => f instanceof File && f.size > 0);
  for (const file of documentFiles) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${companyId}/${inserted.id}/${Date.now()}_${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("order-documents")
      .upload(path, file, { contentType: file.type || undefined });
    if (!uploadError) {
      await supabase.from("order_documents").insert({
        company_id: companyId,
        order_id: inserted.id,
        file_name: file.name,
        storage_path: path,
        content_type: file.type || null,
        size_bytes: file.size,
        category: "dokument",
        uploaded_by: userId,
      });
    }
  }

  revalidatePath("/auftraege");
  redirect(`/auftraege?panel=${inserted.id}`);
}
