"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { INVITABLE_ROLES, ROLE_LABELS, canChangeEmployeeStatus, canManageEmployees } from "@/lib/roles";
import { DOCUMENT_CATEGORIES, EMPLOYEE_STATUSES, QUALIFICATION_TYPES, WORK_TIME_MODELS } from "@/lib/employees";
import { sendInviteEmail } from "@/lib/email";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const s = String(value ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// --- Einladungen & Rollen (bestehend, Formular-basiert mit Redirect) ---

async function requireAdminContext() {
  const { supabase, role, ...rest } = await requireCompanyContext();
  if (!canManageEmployees(role)) {
    redirect("/mitarbeiter?error=Daf%C3%BCr+fehlt+dir+die+Berechtigung");
  }
  return { supabase, role, ...rest };
}

export async function createInvite(formData: FormData) {
  const { supabase, companyId, userId } = await requireAdminContext();
  const roleRaw = String(formData.get("role") ?? "techniker");
  const role = (INVITABLE_ROLES as readonly string[]).includes(roleRaw) ? roleRaw : "techniker";
  const email = toNullableString(formData.get("email"));

  if (!email || !EMAIL_PATTERN.test(email)) {
    redirect("/mitarbeiter?error=Bitte+eine+g%C3%BCltige+E-Mail-Adresse+angeben");
  }

  const { data: invite, error } = await supabase
    .from("company_invites")
    .insert({
      company_id: companyId,
      role,
      email,
      created_by: userId,
    })
    .select("token")
    .single();

  if (error || !invite) {
    redirect(`/mitarbeiter?error=${encodeURIComponent(error?.message ?? "Einladung konnte nicht erstellt werden")}`);
  }

  const { data: company } = await supabase.from("companies").select("name").eq("id", companyId).maybeSingle();
  const inviteUrl = await getInviteUrl(invite.token);

  const result = await sendInviteEmail({
    to: email,
    companyName: company?.name ?? "KanalPro",
    roleLabel: ROLE_LABELS[role] ?? role,
    inviteUrl,
  });

  revalidatePath("/mitarbeiter");

  if (!result.sent) {
    redirect(
      `/mitarbeiter?message=Einladung+erstellt,+E-Mail-Versand+fehlgeschlagen&error=${encodeURIComponent(result.reason)}`,
    );
  }

  redirect(`/mitarbeiter?message=${encodeURIComponent(`Einladung an ${email} verschickt`)}`);
}

export async function revokeInvite(id: string) {
  const { supabase } = await requireAdminContext();
  await supabase.from("company_invites").delete().eq("id", id);
  revalidatePath("/mitarbeiter");
  redirect("/mitarbeiter");
}

export async function updateEmployeeRole(id: string, formData: FormData) {
  const { supabase } = await requireAdminContext();
  const roleRaw = String(formData.get("role") ?? "techniker");
  const role = (INVITABLE_ROLES as readonly string[]).includes(roleRaw) ? roleRaw : "techniker";

  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);

  if (error) {
    redirect(`/mitarbeiter?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/mitarbeiter");
  redirect("/mitarbeiter?message=Rolle+aktualisiert");
}

export async function archiveEmployee(id: string, archived: boolean) {
  const { supabase } = await requireAdminContext();
  await supabase.from("profiles").update({ is_archived: archived }).eq("id", id);
  revalidatePath("/mitarbeiter");
  redirect(`/mitarbeiter?message=${archived ? "Mitarbeiter+archiviert" : "Archivierung+aufgehoben"}`);
}

export async function removeEmployee(id: string) {
  const { supabase } = await requireAdminContext();
  await supabase.from("profiles").delete().eq("id", id);
  revalidatePath("/mitarbeiter");
  redirect("/mitarbeiter");
}

export async function getInviteUrl(token: string) {
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}/register?invite=${token}`;
}

// --- Direktaufrufe fürs Detailpanel (kein <form action>, Aufrufer macht
//     nach dem Await jeweils router.refresh() – gleiches Muster wie
//     /einsatzplanung/actions.ts) ---

export async function updateEmployeeStatus(id: string, returnTo: string, formData: FormData) {
  const { supabase, role } = await requireCompanyContext();
  if (!canChangeEmployeeStatus(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Ändern des Status"));
  }
  const status = String(formData.get("status") ?? "");
  if (!(EMPLOYEE_STATUSES as readonly string[]).includes(status)) {
    redirect(withError(returnTo, "Ungültiger Status"));
  }

  const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
  if (error) redirect(withError(returnTo, error.message));

  revalidatePath("/mitarbeiter");
}

export async function updateEmployeeProfile(id: string, returnTo: string, formData: FormData) {
  const { supabase, role } = await requireCompanyContext();
  if (!canManageEmployees(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Bearbeiten"));
  }

  const fullName = toNullableString(formData.get("full_name"));
  if (!fullName) {
    redirect(withError(returnTo, "Name ist erforderlich"));
  }

  const patch = {
    full_name: fullName,
    phone: toNullableString(formData.get("phone")),
    street: toNullableString(formData.get("street")),
    postal_code: toNullableString(formData.get("postal_code")),
    city: toNullableString(formData.get("city")),
    birth_date: toNullableString(formData.get("birth_date")),
    hire_date: toNullableString(formData.get("hire_date")),
    personnel_number: toNullableString(formData.get("personnel_number")),
    department: toNullableString(formData.get("department")),
    location: toNullableString(formData.get("location")),
    emergency_contact_name: toNullableString(formData.get("emergency_contact_name")),
    emergency_contact_phone: toNullableString(formData.get("emergency_contact_phone")),
    notes: toNullableString(formData.get("notes")),
  };

  const { error } = await supabase.from("profiles").update(patch).eq("id", id);
  if (error) redirect(withError(returnTo, error.message));

  revalidatePath("/mitarbeiter");
}

export async function updateEmployeeWorkTime(id: string, returnTo: string, formData: FormData) {
  const { supabase, role } = await requireCompanyContext();
  if (!canManageEmployees(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Bearbeiten"));
  }

  const workTimeModelRaw = String(formData.get("work_time_model") ?? "vollzeit");
  const workTimeModel = (WORK_TIME_MODELS as readonly string[]).includes(workTimeModelRaw)
    ? workTimeModelRaw
    : "vollzeit";

  const patch = {
    weekly_hours: toNullableNumber(formData.get("weekly_hours")),
    work_time_model: workTimeModel,
    vacation_days_total: toNullableNumber(formData.get("vacation_days_total")) ?? 30,
    vacation_days_used: toNullableNumber(formData.get("vacation_days_used")) ?? 0,
    sick_days_current_year: toNullableNumber(formData.get("sick_days_current_year")) ?? 0,
    overtime_hours: toNullableNumber(formData.get("overtime_hours")) ?? 0,
  };

  const { error } = await supabase.from("profiles").update(patch).eq("id", id);
  if (error) redirect(withError(returnTo, error.message));

  revalidatePath("/mitarbeiter");
}

export async function assignMainVehicle(id: string, returnTo: string, formData: FormData) {
  const { supabase, companyId, userId, role } = await requireCompanyContext();
  if (!canManageEmployees(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Zuweisen"));
  }

  const fleetItemId = toNullableString(formData.get("fleet_item_id"));

  // Offenen Fahrzeughistorien-Eintrag schließen (falls vorhanden), bevor
  // ggf. ein neuer beginnt – so bleibt lückenlos nachvollziehbar, welches
  // Fahrzeug wann Hauptfahrzeug war.
  await supabase
    .from("employee_vehicle_history")
    .update({ unassigned_at: new Date().toISOString() })
    .eq("employee_id", id)
    .is("unassigned_at", null);

  if (fleetItemId) {
    await supabase.from("employee_vehicle_history").insert({
      company_id: companyId,
      employee_id: id,
      fleet_item_id: fleetItemId,
      assigned_by: userId,
    });
  }

  const { error } = await supabase.from("profiles").update({ main_vehicle_id: fleetItemId }).eq("id", id);
  if (error) redirect(withError(returnTo, error.message));

  revalidatePath("/mitarbeiter");
}

export async function unassignMainVehicle(id: string, returnTo: string) {
  const { supabase, role } = await requireCompanyContext();
  if (!canManageEmployees(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Entfernen"));
  }

  await supabase
    .from("employee_vehicle_history")
    .update({ unassigned_at: new Date().toISOString() })
    .eq("employee_id", id)
    .is("unassigned_at", null);

  const { error } = await supabase.from("profiles").update({ main_vehicle_id: null }).eq("id", id);
  if (error) redirect(withError(returnTo, error.message));

  revalidatePath("/mitarbeiter");
}

export async function uploadEmployeePhoto(id: string, returnTo: string, formData: FormData) {
  const { supabase, companyId, role } = await requireCompanyContext();
  if (!canManageEmployees(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Hochladen"));
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(withError(returnTo, "Bitte ein Bild auswählen"));
  }

  const { data: existing } = await supabase.from("profiles").select("photo_path").eq("id", id).maybeSingle();

  const safeName = (file as File).name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${companyId}/${id}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage.from("employee-photos").upload(path, file as File, {
    contentType: (file as File).type || undefined,
    upsert: false,
  });
  if (uploadError) redirect(withError(returnTo, uploadError.message));

  const { error } = await supabase.from("profiles").update({ photo_path: path }).eq("id", id);
  if (error) redirect(withError(returnTo, error.message));

  if (existing?.photo_path) {
    await supabase.storage.from("employee-photos").remove([existing.photo_path]);
  }

  revalidatePath("/mitarbeiter");
}

export async function removeEmployeePhoto(id: string, returnTo: string) {
  const { supabase, role } = await requireCompanyContext();
  if (!canManageEmployees(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Entfernen"));
  }

  const { data: existing } = await supabase.from("profiles").select("photo_path").eq("id", id).maybeSingle();
  if (existing?.photo_path) {
    await supabase.storage.from("employee-photos").remove([existing.photo_path]);
  }

  const { error } = await supabase.from("profiles").update({ photo_path: null }).eq("id", id);
  if (error) redirect(withError(returnTo, error.message));

  revalidatePath("/mitarbeiter");
}

export async function addQualification(id: string, returnTo: string, formData: FormData) {
  const { supabase, companyId, userId, role } = await requireCompanyContext();
  if (!canManageEmployees(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Anlegen"));
  }

  const qualificationTypeRaw = String(formData.get("qualification_type") ?? "");
  if (!(QUALIFICATION_TYPES as readonly string[]).includes(qualificationTypeRaw)) {
    redirect(withError(returnTo, "Ungültige Qualifikationsart"));
  }

  const { error } = await supabase.from("employee_qualifications").insert({
    company_id: companyId,
    employee_id: id,
    qualification_type: qualificationTypeRaw,
    label: toNullableString(formData.get("label")),
    issued_date: toNullableString(formData.get("issued_date")),
    expires_at: toNullableString(formData.get("expires_at")),
    notes: toNullableString(formData.get("notes")),
    created_by: userId,
  });
  if (error) redirect(withError(returnTo, error.message));

  revalidatePath("/mitarbeiter");
}

export async function removeQualification(qualificationId: string, returnTo: string) {
  const { supabase, role } = await requireCompanyContext();
  if (!canManageEmployees(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Löschen"));
  }

  await supabase.from("employee_qualifications").delete().eq("id", qualificationId);
  revalidatePath("/mitarbeiter");
}

export async function uploadEmployeeDocument(id: string, returnTo: string, formData: FormData) {
  const { supabase, companyId, userId, role } = await requireCompanyContext();
  if (!canManageEmployees(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Hochladen"));
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(withError(returnTo, "Bitte eine Datei auswählen"));
  }

  const categoryRaw = String(formData.get("category") ?? "sonstiges");
  const category = (DOCUMENT_CATEGORIES as readonly string[]).includes(categoryRaw) ? categoryRaw : "sonstiges";

  const safeName = (file as File).name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${companyId}/${id}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage.from("employee-documents").upload(path, file as File, {
    contentType: (file as File).type || undefined,
    upsert: false,
  });
  if (uploadError) redirect(withError(returnTo, uploadError.message));

  const { error } = await supabase.from("employee_documents").insert({
    company_id: companyId,
    employee_id: id,
    category,
    file_name: (file as File).name,
    storage_path: path,
    size_bytes: (file as File).size,
    expires_at: toNullableString(formData.get("expires_at")),
    uploaded_by: userId,
  });
  if (error) redirect(withError(returnTo, error.message));

  revalidatePath("/mitarbeiter");
}

export async function deleteEmployeeDocument(documentId: string, storagePath: string, returnTo: string) {
  const { supabase, role } = await requireCompanyContext();
  if (!canManageEmployees(role)) {
    redirect(withError(returnTo, "Keine Berechtigung zum Löschen"));
  }

  await supabase.storage.from("employee-documents").remove([storagePath]);
  await supabase.from("employee_documents").delete().eq("id", documentId);
  revalidatePath("/mitarbeiter");
}

// --- Benachrichtigungen (Glocke im Topbar) ---

export async function markNotificationRead(id: string) {
  const { supabase } = await requireCompanyContext();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  const { supabase, userId } = await requireCompanyContext();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", userId)
    .is("read_at", null);
  revalidatePath("/", "layout");
}
