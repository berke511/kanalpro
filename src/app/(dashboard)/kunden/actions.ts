"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { CUSTOMER_REQUIRED_FIELD_SLOTS, customerDisplayName, geocodeAddress, isCompanyKind } from "@/lib/customers";
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

  return { supabase, companyId: profile.company_id, userId: user.id };
}

function emptyToNull(value: FormDataEntryValue | null) {
  const str = String(value ?? "").trim();
  return str.length ? str : null;
}

// Hängt eine Fehlermeldung an ein Rücksprungziel an (Vollprofil-Tab oder
// Kundenliste mit geöffnetem Detailpanel), unabhängig davon, ob die
// Ziel-URL bereits andere Query-Parameter enthält.
function withError(returnTo: string, message: string) {
  const sep = returnTo.includes("?") ? "&" : "?";
  return `${returnTo}${sep}error=${encodeURIComponent(message)}`;
}

function intOrNull(value: FormDataEntryValue | null) {
  const str = String(value ?? "").trim();
  if (!str) return null;
  const n = Number.parseInt(str, 10);
  return Number.isNaN(n) ? null : n;
}

function floatOrNull(value: FormDataEntryValue | null) {
  const str = String(value ?? "").trim();
  if (!str) return null;
  const n = Number.parseFloat(str);
  return Number.isNaN(n) ? null : n;
}

function parseTags(value: FormDataEntryValue | null) {
  const str = String(value ?? "").trim();
  if (!str) return [] as string[];
  return Array.from(
    new Set(
      str
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
    ),
  );
}

type CustomerFields = Omit<
  Database["public"]["Tables"]["customers"]["Insert"],
  "company_id" | "id" | "created_at" | "updated_at" | "name" | "customer_number" | "created_by" | "updated_by" | "latitude" | "longitude"
> & {
  kind: string;
  status: string;
  country: string;
  billing_same_as_main: boolean;
  service_same_as_main: boolean;
  tags: string[];
};

function readCustomerForm(formData: FormData): CustomerFields {
  const kindRaw = String(formData.get("kind") ?? "privat");
  const billingSame = formData.get("billing_same_as_main") === "on";
  const serviceSame = formData.get("service_same_as_main") === "on";

  return {
    kind: kindRaw,
    status: String(formData.get("status") ?? "neukunde"),
    first_name: emptyToNull(formData.get("first_name")),
    last_name: emptyToNull(formData.get("last_name")),
    company_name: emptyToNull(formData.get("company_name")),
    legal_form: emptyToNull(formData.get("legal_form")),
    register_number: emptyToNull(formData.get("register_number")),
    vat_id: emptyToNull(formData.get("vat_id")),
    contact_person: emptyToNull(formData.get("contact_person")),
    email: emptyToNull(formData.get("email")),
    phone: emptyToNull(formData.get("phone")),
    mobile: emptyToNull(formData.get("mobile")),
    fax: emptyToNull(formData.get("fax")),
    website: emptyToNull(formData.get("website")),
    street: emptyToNull(formData.get("street")),
    postal_code: emptyToNull(formData.get("postal_code")),
    city: emptyToNull(formData.get("city")),
    country: emptyToNull(formData.get("country")) ?? "Deutschland",
    billing_same_as_main: billingSame,
    billing_street: billingSame ? null : emptyToNull(formData.get("billing_street")),
    billing_postal_code: billingSame ? null : emptyToNull(formData.get("billing_postal_code")),
    billing_city: billingSame ? null : emptyToNull(formData.get("billing_city")),
    service_same_as_main: serviceSame,
    service_street: serviceSame ? null : emptyToNull(formData.get("service_street")),
    service_postal_code: serviceSame ? null : emptyToNull(formData.get("service_postal_code")),
    service_city: serviceSame ? null : emptyToNull(formData.get("service_city")),
    payment_term_days: intOrNull(formData.get("payment_term_days")),
    discount_percent: floatOrNull(formData.get("discount_percent")),
    discount_days: intOrNull(formData.get("discount_days")),
    debitor_number: emptyToNull(formData.get("debitor_number")),
    tags: parseTags(formData.get("tags")),
    assigned_employee_id: emptyToNull(formData.get("assigned_employee_id")),
  };
}

function fieldsToQuery(fields: CustomerFields) {
  const params = new URLSearchParams();
  params.set("draft", JSON.stringify(fields));
  return params;
}

function missingHardSlots(fields: CustomerFields) {
  const fieldMap = fields as unknown as Record<string, unknown>;
  return CUSTOMER_REQUIRED_FIELD_SLOTS.filter((slot) => slot.hard).filter((slot) => {
    const filled = slot.fieldNames.some((name) => {
      const value = fieldMap[name];
      return typeof value === "string" && value.trim().length > 0;
    });
    return !filled;
  });
}

async function findDuplicateCustomers(
  supabase: DbClient,
  companyId: string,
  fields: CustomerFields,
  excludeId?: string,
) {
  const checks: PromiseLike<{ data: { id: string; name: string; customer_number: string | null }[] | null }>[] = [];

  if (fields.company_name) {
    checks.push(
      supabase
        .from("customers")
        .select("id, name, customer_number")
        .eq("company_id", companyId)
        .ilike("company_name", fields.company_name),
    );
  }
  if (fields.phone) {
    checks.push(
      supabase.from("customers").select("id, name, customer_number").eq("company_id", companyId).eq("phone", fields.phone),
    );
  }
  if (fields.email) {
    checks.push(
      supabase.from("customers").select("id, name, customer_number").eq("company_id", companyId).eq("email", fields.email),
    );
  }
  if (fields.vat_id) {
    checks.push(
      supabase.from("customers").select("id, name, customer_number").eq("company_id", companyId).eq("vat_id", fields.vat_id),
    );
  }

  if (!checks.length) return [];

  const results = await Promise.all(checks);
  const matches = new Map<string, { id: string; name: string; customer_number: string | null }>();
  for (const r of results) {
    for (const c of r.data ?? []) {
      if (c.id !== excludeId) matches.set(c.id, c);
    }
  }
  return Array.from(matches.values());
}

async function logAudit(
  supabase: DbClient,
  entry: {
    companyId: string;
    customerId: string | null;
    customerLabel: string;
    actorId: string;
    action: "created" | "updated" | "deleted";
    summary?: string;
  },
) {
  await supabase.from("customer_audit_log").insert({
    company_id: entry.companyId,
    customer_id: entry.customerId,
    customer_label: entry.customerLabel,
    actor_id: entry.actorId,
    action: entry.action,
    summary: entry.summary ?? null,
  });
}

export async function createCustomer(formData: FormData) {
  const { supabase, companyId, userId } = await requireCompanyContext();
  const fields = readCustomerForm(formData);
  const confirmDuplicate = formData.get("confirm_duplicate") === "1";

  const missing = missingHardSlots(fields);
  if (missing.length > 0) {
    const params = fieldsToQuery(fields);
    params.set("missing", missing.map((s) => s.key).join(","));
    const label = isCompanyKind(fields.kind) ? "Firmenname" : "Nachname";
    redirect(`/kunden/neu?error=${encodeURIComponent(label + " ist erforderlich")}&${params.toString()}`);
  }

  if (!confirmDuplicate) {
    const duplicates = await findDuplicateCustomers(supabase, companyId, fields);
    if (duplicates.length > 0) {
      const matches = duplicates.map((d) => `${d.customer_number ?? "?"}: ${d.name}`).join("; ");
      const params = fieldsToQuery(fields);
      params.set("duplicate", "1");
      params.set("matches", matches);
      redirect(`/kunden/neu?${params.toString()}`);
    }
  }

  const { data: customerNumber } = await supabase.rpc("next_customer_number", { p_company_id: companyId });
  const geo = await geocodeAddress({ street: fields.street, postal_code: fields.postal_code, city: fields.city, country: fields.country });

  const { data: created, error } = await supabase
    .from("customers")
    .insert({
      ...fields,
      company_id: companyId,
      customer_number: customerNumber ?? null,
      name: customerDisplayName(fields),
      created_by: userId,
      updated_by: userId,
      latitude: geo?.latitude ?? null,
      longitude: geo?.longitude ?? null,
    })
    .select("id, name")
    .single();

  if (error || !created) {
    redirect(`/kunden/neu?error=${encodeURIComponent(error?.message ?? "Kunde konnte nicht angelegt werden")}`);
  }

  await logAudit(supabase, {
    companyId,
    customerId: created.id,
    customerLabel: created.name,
    actorId: userId,
    action: "created",
    summary: `Kunde ${customerNumber ?? ""} angelegt`.trim(),
  });

  revalidatePath("/kunden");
  redirect(`/kunden/${created.id}?message=Kunde+angelegt`);
}

export async function updateCustomer(id: string, formData: FormData) {
  const { supabase, companyId, userId } = await requireCompanyContext();
  const fields = readCustomerForm(formData);
  const confirmDuplicate = formData.get("confirm_duplicate") === "1";
  const activeSection = emptyToNull(formData.get("active_section")) ?? "allgemein";
  const tab = activeSection === "adressen" ? "adressen" : "allgemein";

  const missing = missingHardSlots(fields);
  if (missing.length > 0) {
    const params = fieldsToQuery(fields);
    params.set("missing", missing.map((s) => s.key).join(","));
    params.set("tab", tab);
    const label = isCompanyKind(fields.kind) ? "Firmenname" : "Nachname";
    redirect(`/kunden/${id}?error=${encodeURIComponent(label + " ist erforderlich")}&${params.toString()}`);
  }

  if (!confirmDuplicate) {
    const duplicates = await findDuplicateCustomers(supabase, companyId, fields, id);
    if (duplicates.length > 0) {
      const matches = duplicates.map((d) => `${d.customer_number ?? "?"}: ${d.name}`).join("; ");
      const params = fieldsToQuery(fields);
      params.set("duplicate", "1");
      params.set("matches", matches);
      params.set("tab", tab);
      redirect(`/kunden/${id}?${params.toString()}`);
    }
  }

  const geo = await geocodeAddress({ street: fields.street, postal_code: fields.postal_code, city: fields.city, country: fields.country });
  const name = customerDisplayName(fields);

  const { error } = await supabase
    .from("customers")
    .update({
      ...fields,
      name,
      updated_by: userId,
      ...(geo ? { latitude: geo.latitude, longitude: geo.longitude } : {}),
    })
    .eq("id", id);

  if (error) {
    redirect(`/kunden/${id}?error=${encodeURIComponent(error.message)}&tab=${tab}`);
  }

  await logAudit(supabase, {
    companyId,
    customerId: id,
    customerLabel: name,
    actorId: userId,
    action: "updated",
    summary: "Kundendaten aktualisiert",
  });

  revalidatePath("/kunden");
  revalidatePath(`/kunden/${id}`);
  redirect(`/kunden/${id}?message=Gespeichert&tab=${tab}`);
}

export async function deleteCustomer(id: string) {
  const { supabase, companyId, userId } = await requireCompanyContext();

  const { data: customer } = await supabase
    .from("customers")
    .select("name, customer_number")
    .eq("id", id)
    .maybeSingle();

  await logAudit(supabase, {
    companyId,
    customerId: id,
    customerLabel: customer ? `${customer.customer_number ?? ""} ${customer.name}`.trim() : "Kunde",
    actorId: userId,
    action: "deleted",
    summary: "Kunde gelöscht",
  });

  await supabase.from("customers").delete().eq("id", id);
  revalidatePath("/kunden");
  redirect("/kunden");
}

export async function duplicateCustomer(id: string) {
  const { supabase, companyId, userId } = await requireCompanyContext();

  const { data: source } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
  if (!source) {
    redirect("/kunden?error=Kunde+nicht+gefunden");
  }

  const { data: customerNumber } = await supabase.rpc("next_customer_number", { p_company_id: companyId });

  const duplicateName =
    source.kind && ["gewerbe", "industrie", "kommune", "sonstige"].includes(source.kind)
      ? `${source.company_name ?? source.name} (Kopie)`
      : `${source.name} (Kopie)`;

  const { data: created, error } = await supabase
    .from("customers")
    .insert({
      kind: source.kind,
      status: "neukunde",
      first_name: source.first_name,
      last_name: source.last_name,
      company_name: source.company_name,
      legal_form: source.legal_form,
      register_number: source.register_number,
      vat_id: source.vat_id,
      email: source.email,
      phone: source.phone,
      mobile: source.mobile,
      fax: source.fax,
      website: source.website,
      street: source.street,
      postal_code: source.postal_code,
      city: source.city,
      country: source.country,
      billing_same_as_main: source.billing_same_as_main,
      billing_street: source.billing_street,
      billing_postal_code: source.billing_postal_code,
      billing_city: source.billing_city,
      service_same_as_main: source.service_same_as_main,
      service_street: source.service_street,
      service_postal_code: source.service_postal_code,
      service_city: source.service_city,
      payment_term_days: source.payment_term_days,
      discount_percent: source.discount_percent,
      discount_days: source.discount_days,
      debitor_number: source.debitor_number,
      tags: source.tags,
      assigned_employee_id: source.assigned_employee_id,
      company_id: companyId,
      customer_number: customerNumber ?? null,
      name: duplicateName,
      created_by: userId,
      updated_by: userId,
    })
    .select("id, name")
    .single();

  if (error || !created) {
    redirect(`/kunden/${id}?error=${encodeURIComponent(error?.message ?? "Duplizieren fehlgeschlagen")}`);
  }

  await logAudit(supabase, {
    companyId,
    customerId: created.id,
    customerLabel: created.name,
    actorId: userId,
    action: "created",
    summary: `Als Kopie von ${source.customer_number ?? source.name} angelegt`,
  });

  revalidatePath("/kunden");
  redirect(`/kunden/${created.id}?message=Kunde+dupliziert`);
}

// --- Ansprechpartner ---

export async function addCustomerContact(customerId: string, formData: FormData) {
  const { supabase, companyId } = await requireCompanyContext();
  const name = emptyToNull(formData.get("name"));

  if (!name) {
    redirect(`/kunden/${customerId}?tab=kontakte&error=Name+ist+erforderlich`);
  }

  await supabase.from("customer_contacts").insert({
    company_id: companyId,
    customer_id: customerId,
    name: name!,
    role: emptyToNull(formData.get("role")),
    phone: emptyToNull(formData.get("phone")),
    email: emptyToNull(formData.get("email")),
    is_primary: formData.get("is_primary") === "on",
    notes: emptyToNull(formData.get("notes")),
  });

  revalidatePath(`/kunden/${customerId}`);
  redirect(`/kunden/${customerId}?tab=kontakte`);
}

// Wird direkt aus einer Client-Komponente aufgerufen (nicht als <form action>),
// um während der Eingabe eine unverbindliche Dublettenwarnung anzuzeigen.
// Next.js ruft Server Actions transparent per RPC auf, dafür ist kein
// eigener Route Handler nötig.
export async function checkCustomerDuplicatesLive(input: {
  companyName?: string;
  email?: string;
  phone?: string;
  vatId?: string;
  excludeId?: string;
}) {
  const { supabase, companyId } = await requireCompanyContext();

  const fields: CustomerFields = {
    kind: "sonstige",
    status: "neukunde",
    company_name: emptyToNull(input.companyName ?? null),
    email: emptyToNull(input.email ?? null),
    phone: emptyToNull(input.phone ?? null),
    vat_id: emptyToNull(input.vatId ?? null),
    country: "Deutschland",
    billing_same_as_main: true,
    service_same_as_main: true,
    tags: [],
  } as CustomerFields;

  const duplicates = await findDuplicateCustomers(supabase, companyId, fields, input.excludeId);
  return duplicates.map((d) => ({ id: d.id, label: `${d.customer_number ?? "?"}: ${d.name}` }));
}

export async function deleteCustomerContact(customerId: string, contactId: string) {
  const { supabase } = await requireCompanyContext();
  await supabase.from("customer_contacts").delete().eq("id", contactId);
  revalidatePath(`/kunden/${customerId}`);
  redirect(`/kunden/${customerId}?tab=kontakte`);
}

// --- Notizen ---
//
// Nimmt zusätzlich ein "returnTo"-Ziel entgegen, da diese Aktion sowohl vom
// Vollprofil (/kunden/[id]?tab=notizen) als auch aus dem rechten
// Detailpanel auf der Kundenliste (/kunden?...&panel=<id>&panelTab=aktivitaeten)
// heraus aufgerufen wird.

export async function addCustomerNote(customerId: string, returnTo: string, formData: FormData) {
  const { supabase, companyId, userId } = await requireCompanyContext();
  const note = emptyToNull(formData.get("note"));

  if (!note) {
    redirect(returnTo);
  }

  await supabase.from("customer_notes").insert({
    company_id: companyId,
    customer_id: customerId,
    author_id: userId,
    note: note!,
  });

  revalidatePath(`/kunden/${customerId}`);
  revalidatePath("/kunden");
  redirect(returnTo);
}

// --- Dokumente ---

export async function uploadCustomerDocument(customerId: string, returnTo: string, formData: FormData) {
  const { supabase, companyId, userId } = await requireCompanyContext();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    redirect(withError(returnTo, "Bitte eine Datei auswählen"));
  }

  const safeName = (file as File).name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${companyId}/${customerId}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage.from("customer-documents").upload(path, file as File, {
    contentType: (file as File).type || undefined,
    upsert: false,
  });

  if (uploadError) {
    redirect(withError(returnTo, uploadError.message));
  }

  await supabase.from("customer_documents").insert({
    company_id: companyId,
    customer_id: customerId,
    file_name: (file as File).name,
    storage_path: path,
    content_type: (file as File).type || null,
    size_bytes: (file as File).size,
    uploaded_by: userId,
  });

  revalidatePath(`/kunden/${customerId}`);
  revalidatePath("/kunden");
  redirect(returnTo);
}

export async function deleteCustomerDocument(customerId: string, documentId: string, storagePath: string, returnTo: string) {
  const { supabase } = await requireCompanyContext();
  await supabase.storage.from("customer-documents").remove([storagePath]);
  await supabase.from("customer_documents").delete().eq("id", documentId);
  revalidatePath(`/kunden/${customerId}`);
  revalidatePath("/kunden");
  redirect(returnTo);
}

// --- Objekte (Einsatzobjekte/Standorte) ---

export async function addCustomerProperty(customerId: string, returnTo: string, formData: FormData) {
  const { supabase, companyId } = await requireCompanyContext();
  const name = emptyToNull(formData.get("name"));

  if (!name) {
    redirect(withError(returnTo, "Bezeichnung ist erforderlich"));
  }

  await supabase.from("customer_properties").insert({
    company_id: companyId,
    customer_id: customerId,
    name: name!,
    street: emptyToNull(formData.get("street")),
    postal_code: emptyToNull(formData.get("postal_code")),
    city: emptyToNull(formData.get("city")),
    notes: emptyToNull(formData.get("notes")),
  });

  revalidatePath(`/kunden/${customerId}`);
  revalidatePath("/kunden");
  redirect(returnTo);
}

export async function deleteCustomerProperty(customerId: string, propertyId: string, returnTo: string) {
  const { supabase } = await requireCompanyContext();
  await supabase.from("customer_properties").delete().eq("id", propertyId);
  revalidatePath(`/kunden/${customerId}`);
  revalidatePath("/kunden");
  redirect(returnTo);
}

export async function toggleCustomerFavorite(customerId: string, nextValue: boolean) {
  const { supabase } = await requireCompanyContext();
  await supabase.from("customers").update({ is_favorite: nextValue }).eq("id", customerId);
  revalidatePath("/kunden");
}
