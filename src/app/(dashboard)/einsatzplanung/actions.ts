"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { canManageResourcesAndSchedule } from "@/lib/roles";

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

// Auftrag im Kalender einplanen (aus der "Nicht eingeplante Aufträge"-Liste
// heraus) – setzt Termin/Uhrzeit, weist optional Mitarbeiter/Fahrzeuge zu
// und hebt den Status auf "geplant" an, falls er noch "offen"/"entwurf" war.
// Direktaufruf (kein <form action>), damit die Seite nach dem Einplanen per
// router.refresh() aktualisiert werden kann, ohne die Scroll-Position/den
// Wochenfilter zu verlieren.
export async function scheduleOrder(
  orderId: string,
  returnTo: string,
  formData: FormData,
) {
  const { supabase, companyId, userId, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Einplanen"));
  }

  const scheduledDate = String(formData.get("scheduled_date") ?? "").trim();
  const startTime = String(formData.get("start_time") ?? "").trim();
  const employeeIds = formData.getAll("employee_ids").map(String).filter(Boolean);
  const vehicleIds = formData.getAll("vehicle_ids").map(String).filter(Boolean);

  if (!scheduledDate) {
    redirect(withError(returnTo, "Datum ist erforderlich"));
  }

  const { data: order } = await supabase.from("orders").select("status").eq("id", orderId).maybeSingle();
  if (!order) redirect(withError(returnTo, "Auftrag nicht gefunden"));

  const patch: { scheduled_date: string; start_time: string | null; updated_by: string; status?: string } = {
    scheduled_date: scheduledDate,
    start_time: startTime || null,
    updated_by: userId,
  };
  if (order.status === "offen" || order.status === "entwurf") {
    patch.status = "geplant";
  }

  const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
  if (error) redirect(withError(returnTo, error.message));

  if (employeeIds.length > 0) {
    await supabase.from("order_assignments").upsert(
      employeeIds.map((employeeId) => ({ company_id: companyId, order_id: orderId, employee_id: employeeId, assigned_by: userId })),
      { onConflict: "order_id,employee_id", ignoreDuplicates: true },
    );
  }
  if (vehicleIds.length > 0) {
    await supabase.from("order_resources").upsert(
      vehicleIds.map((fleetItemId) => ({ company_id: companyId, order_id: orderId, fleet_item_id: fleetItemId })),
      { onConflict: "order_id,fleet_item_id", ignoreDuplicates: true },
    );
  }

  revalidatePath("/einsatzplanung");
  revalidatePath("/auftraege");
}

// Termin aus dem Kalender entfernen (Auftrag wandert zurück in "Nicht
// eingeplante Aufträge") – Zuweisungen bleiben bewusst erhalten, nur der
// Termin selbst wird gelöscht.
export async function unscheduleOrder(orderId: string, returnTo: string) {
  const { supabase, userId, role } = await requireCompanyContext();
  if (!canManageResourcesAndSchedule(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Verschieben"));
  }

  const { error } = await supabase
    .from("orders")
    .update({ scheduled_date: null, start_time: null, updated_by: userId })
    .eq("id", orderId);

  if (error) redirect(withError(returnTo, error.message));

  revalidatePath("/einsatzplanung");
  revalidatePath("/auftraege");
}
