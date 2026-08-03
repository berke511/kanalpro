"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { ORDER_STATUSES } from "@/lib/orders";
import { canCreateOrders, canDeleteOrArchiveOrders } from "@/lib/roles";

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
