import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteOrder, updateOrderFull } from "@/app/(dashboard)/auftraege/actions";
import { OrderForm } from "@/components/dashboard/OrderForm";
import { formatDate } from "@/lib/date";
import { ORDER_KIND_LABELS, ORDER_PRIORITY_LABELS, STATUS_LABELS } from "@/lib/orders";

export default async function AuftragDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { id } = await params;
  const { error, message } = await searchParams;

  const supabase = await createClient();
  const [{ data: order }, { data: customersList }, { data: employeesList }, { data: fleetItems }] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).maybeSingle(),
    supabase.from("customers").select("id, name, company_name").eq("is_archived", false).order("name", { ascending: true }),
    supabase.from("profiles").select("id, full_name").order("full_name", { ascending: true }),
    supabase.from("fleet_items").select("id, name, license_plate, kind").order("name", { ascending: true }),
  ]);

  if (!order) {
    notFound();
  }

  const [{ data: customer }, { data: property }, { data: assignmentRows }, { data: resourceRows }] = await Promise.all([
    order.customer_id
      ? supabase.from("customers").select("name, company_name, street, postal_code, city").eq("id", order.customer_id).maybeSingle()
      : Promise.resolve({ data: null }),
    order.property_id
      ? supabase.from("customer_properties").select("street, postal_code, city").eq("id", order.property_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("order_assignments").select("employee_id").eq("order_id", id),
    supabase.from("order_resources").select("fleet_item_id, fleet_items(kind)").eq("order_id", id),
  ]);

  const customerLabel = customer ? customer.company_name || customer.name : "Kein Kunde hinterlegt";
  const addressLine = property
    ? [property.street, [property.postal_code, property.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")
    : customer
      ? [customer.street, [customer.postal_code, customer.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")
      : null;

  const terminLabel = order.scheduled_date
    ? `${formatDate(order.scheduled_date)}${order.start_time ? ` · ${String(order.start_time).slice(0, 5)} Uhr` : ""}${
        order.planned_duration_minutes ? ` (${(order.planned_duration_minutes / 60).toFixed(1).replace(/\.0$/, "")}h)` : ""
      }`
    : "Noch nicht terminiert";

  const employeeIds = (assignmentRows ?? []).map((a) => a.employee_id);
  const vehicleIds = (resourceRows ?? []).filter((r) => r.fleet_items?.kind !== "maschine").map((r) => r.fleet_item_id);
  const machineIds = (resourceRows ?? []).filter((r) => r.fleet_items?.kind === "maschine").map((r) => r.fleet_item_id);
  const resourceCount = vehicleIds.length + machineIds.length;
  const resourceLabel = `${employeeIds.length} Mitarbeiter · ${resourceCount} Fahrzeug${resourceCount === 1 ? "" : "e"}`;

  const infoCards = [
    { label: "Kunde", value: customerLabel },
    { label: "Termin", value: terminLabel },
    { label: "Ressourcen", value: resourceLabel },
    { label: "Standort", value: addressLine || "Keine Adresse hinterlegt" },
  ];

  const updateWithId = updateOrderFull.bind(null, id);
  const deleteWithId = deleteOrder.bind(null, id);

  return (
    <div className="p-6">
      <Link href="/auftraege" className="text-sm text-muted hover:text-foreground">
        ← Zurück zur Auftragsliste
      </Link>

      <div className="relative mt-2 overflow-hidden rounded-[20px] bg-gradient-to-br from-[#3a63ff] via-[#3151e6] to-[#5b3ec9] px-6 py-6 text-white shadow-lg shadow-brand/25">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/20 blur-2xl" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-xs font-medium">
                {STATUS_LABELS[order.status] ?? order.status}
              </span>
              {order.priority && order.priority !== "standard" && (
                <span className="rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-xs font-medium">
                  {ORDER_PRIORITY_LABELS[order.priority] ?? order.priority}
                </span>
              )}
            </div>
            <h1 className="mt-2 break-words text-2xl font-semibold tracking-tight">
              {order.order_number ? `${order.order_number} · ` : ""}
              {order.title}
            </h1>
            <p className="mt-1 text-sm text-white/80">
              {customerLabel} · {ORDER_KIND_LABELS[order.order_kind] ?? order.order_kind}
            </p>
          </div>
          <form action={deleteWithId}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-[11px] border border-white/30 bg-white/10 px-3.5 py-2 text-sm font-medium text-white hover:bg-white/20"
            >
              Auftrag löschen
            </button>
          </form>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {infoCards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_20px_rgba(16,24,40,.06)]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">{c.label}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{c.value}</p>
          </div>
        ))}
      </div>

      {message && <p className="mt-4 rounded-lg bg-brand-soft px-4 py-3 text-sm text-brand-dark">{message}</p>}
      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_20px_rgba(16,24,40,.06)]">
        <OrderForm
          action={updateWithId}
          defaultValues={order}
          submitLabel="Änderungen speichern"
          customers={(customersList ?? []).map((c) => ({ id: c.id, label: c.company_name || c.name }))}
          employees={(employeesList ?? []).map((e) => ({ id: e.id, label: e.full_name || "Unbenannt" }))}
          vehicles={(fleetItems ?? [])
            .filter((f) => f.kind === "fahrzeug")
            .map((f) => ({ id: f.id, label: f.license_plate ? `${f.license_plate} · ${f.name}` : f.name }))}
          machines={(fleetItems ?? [])
            .filter((f) => f.kind === "maschine")
            .map((f) => ({ id: f.id, label: f.name }))}
          selectedEmployeeIds={employeeIds}
          selectedVehicleIds={vehicleIds}
          selectedMachineIds={machineIds}
        />
      </div>
    </div>
  );
}
