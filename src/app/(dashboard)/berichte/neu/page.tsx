import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { canCreateOrdersAndLinkCommercialDocuments } from "@/lib/roles";
import { createReportFull } from "@/app/(dashboard)/berichte/actions";
import { ReportWizard } from "@/components/dashboard/ReportWizard";

export default async function NeuerBerichtPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; order?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getOrCreateProfile(supabase, user) : null;
  const canLinkCommercial = canCreateOrdersAndLinkCommercialDocuments(profile?.role ?? null);

  const [{ data: orders }, { data: employees }, { data: fleetItems }, { data: materials }] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, order_number, title, onsite_contact, customer_id, property_id, customers(name, street, postal_code, city), customer_properties(name, street, postal_code, city), order_assignments(employee_id)",
      )
      .eq("is_archived", false)
      .neq("status", "storniert")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("profiles").select("id, full_name, is_archived").order("full_name", { ascending: true }),
    supabase.from("fleet_items").select("id, name, kind, license_plate").order("name", { ascending: true }),
    supabase.from("materials").select("id, name, material_number, unit").eq("is_archived", false).order("name", { ascending: true }),
  ]);

  const orderOptions = (orders ?? []).map((o) => {
    const property = (o as unknown as { customer_properties: { name: string | null; street: string | null; postal_code: string | null; city: string | null } | null }).customer_properties;
    const customer = (o as unknown as { customers: { name: string; street: string | null; postal_code: string | null; city: string | null } | null }).customers;
    const addressSource = property ?? customer;
    const address = addressSource
      ? [addressSource.street, [addressSource.postal_code, addressSource.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")
      : null;
    const assignments = (o as unknown as { order_assignments: Array<{ employee_id: string }> }).order_assignments ?? [];

    return {
      id: o.id,
      label: `${o.order_number ?? o.title}${customer?.name ? ` · ${customer.name}` : ""}`,
      customerName: customer?.name ?? null,
      address: address || null,
      onsiteContact: o.onsite_contact,
      assignedEmployeeIds: assignments.map((a) => a.employee_id),
    };
  });

  const employeeOptions = (employees ?? []).filter((e) => !e.is_archived).map((e) => ({ id: e.id, label: e.full_name ?? "Unbenannt" }));
  const machineOptions = (fleetItems ?? []).map((f) => ({ id: f.id, label: f.license_plate ? `${f.license_plate} · ${f.name}` : f.name, kind: f.kind }));
  const materialOptions = (materials ?? []).map((m) => ({ id: m.id, label: m.material_number ? `${m.material_number} · ${m.name}` : m.name, unit: m.unit }));

  return (
    <div className="p-6">
      <Link href="/berichte" className="text-sm text-muted hover:text-foreground">
        ← Zurück zur Übersicht
      </Link>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="mt-4">
        <ReportWizard
          action={createReportFull}
          orderOptions={orderOptions}
          employeeOptions={employeeOptions}
          machineOptions={machineOptions}
          materialOptions={materialOptions}
          canLinkCommercial={canLinkCommercial}
        />
      </div>
    </div>
  );
}
