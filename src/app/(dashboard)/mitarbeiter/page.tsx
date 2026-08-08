
import Link from "next/link";
import {
  Briefcase,
  CalendarPlus,
  HeartPulse,
  Plane,
  UserCheck,
  Users,
  UserSquare2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { INVITABLE_ROLES, ROLE_LABELS, ROLES, canManageEmployees } from "@/lib/roles";
import { EMPLOYEE_STATUSES, isExpiringSoon } from "@/lib/employees";
import { EmployeeCard, type EmployeeCardData } from "@/components/dashboard/EmployeeCard";
import { EmployeeFilterBar } from "@/components/dashboard/EmployeeFilterBar";
import { createInvite, revokeInvite, getInviteUrl } from "./actions";

type RawSearchParams = {
  q?: string;
  role?: string;
  status?: string;
  department?: string;
  location?: string;
  archived?: string;
  error?: string;
  message?: string;
};

export default async function MitarbeiterPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const currentProfile = await getOrCreateProfile(supabase, user);
  const role = currentProfile?.role ?? null;
  const isAdmin = canManageEmployees(role);

  const q = (raw.q ?? "").trim();
  const roleFilter = (ROLES as readonly string[]).includes(raw.role ?? "") ? (raw.role as string) : "";
  const statusFilter = (EMPLOYEE_STATUSES as readonly string[]).includes(raw.status ?? "") ? (raw.status as string) : "";
  const departmentFilter = raw.department ?? "";
  const locationFilter = raw.location ?? "";
  const showArchived = raw.archived === "1";

  const [{ data: allEmployeesRaw }, { data: fleetOptions }, { data: invites }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, role, status, department, location, phone, photo_path, main_vehicle_id, is_archived, created_at",
      )
      .order("full_name", { ascending: true }),
    supabase.from("fleet_items").select("id, name, license_plate, kind").order("name", { ascending: true }),
    isAdmin
      ? supabase
          .from("company_invites")
          .select("id, token, role, created_at")
          .is("accepted_at", null)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const allEmployees = allEmployeesRaw ?? [];
  const fleetById = Object.fromEntries((fleetOptions ?? []).map((f) => [f.id, f]));

  const employeeIds = allEmployees.map((e) => e.id);
  const { data: qualificationRows } = employeeIds.length
    ? await supabase.from("employee_qualifications").select("employee_id, expires_at").in("employee_id", employeeIds)
    : { data: [] as Array<{ employee_id: string; expires_at: string | null }> };

  const expiringCountByEmployee: Record<string, number> = {};
  for (const row of qualificationRows ?? []) {
    if (isExpiringSoon(row.expires_at)) {
      expiringCountByEmployee[row.employee_id] = (expiringCountByEmployee[row.employee_id] ?? 0) + 1;
    }
  }

  // Signierte Fotos in einem Rutsch laden (Bucket ist privat).
  const photoPaths = allEmployees.map((e) => e.photo_path).filter((p): p is string => Boolean(p));
  let photoUrlByPath: Record<string, string> = {};
  if (photoPaths.length > 0) {
    const { data: signed } = await supabase.storage.from("employee-photos").createSignedUrls(photoPaths, 60 * 10);
    photoUrlByPath = Object.fromEntries((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]).filter(([p]) => p));
  }

  // KPI-Kacheln: bewusst ungefiltert (stabile Unternehmensübersicht).
  const activeEmployees = allEmployees.filter((e) => !e.is_archived);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const kpis = [
    { key: "gesamt", label: "Gesamtzahl", icon: Users, value: activeEmployees.length },
    { key: "verfuegbar", label: "Verfügbar", icon: UserCheck, value: activeEmployees.filter((e) => e.status === "verfuegbar").length },
    { key: "einsatz", label: "Im Einsatz", icon: Briefcase, value: activeEmployees.filter((e) => e.status === "einsatz").length },
    { key: "urlaub", label: "Im Urlaub", icon: Plane, value: activeEmployees.filter((e) => e.status === "urlaub").length },
    { key: "krank", label: "Krankgemeldet", icon: HeartPulse, value: activeEmployees.filter((e) => e.status === "krank").length },
    {
      key: "neu",
      label: "Neu (30 Tage)",
      icon: CalendarPlus,
      value: activeEmployees.filter((e) => new Date(e.created_at) >= thirtyDaysAgo).length,
    },
  ];

  const departmentOptions = Array.from(new Set(allEmployees.map((e) => e.department).filter((v): v is string => Boolean(v)))).sort();
  const locationOptions = Array.from(new Set(allEmployees.map((e) => e.location).filter((v): v is string => Boolean(v)))).sort();

  // Filterung im Speicher – Mitarbeiterlisten sind überschaubar groß, ein
  // eigenes idFilterSets-Muster wie bei Aufträgen lohnt sich hier nicht.
  let visibleEmployees = showArchived ? allEmployees : allEmployees.filter((e) => !e.is_archived);
  if (q) {
    const term = q.toLowerCase();
    visibleEmployees = visibleEmployees.filter(
      (e) => (e.full_name ?? "").toLowerCase().includes(term) || (e.phone ?? "").toLowerCase().includes(term),
    );
  }
  if (roleFilter) visibleEmployees = visibleEmployees.filter((e) => e.role === roleFilter);
  if (statusFilter) visibleEmployees = visibleEmployees.filter((e) => e.status === statusFilter);
  if (departmentFilter) visibleEmployees = visibleEmployees.filter((e) => e.department === departmentFilter);
  if (locationFilter) visibleEmployees = visibleEmployees.filter((e) => e.location === locationFilter);

  const employeeCards: EmployeeCardData[] = visibleEmployees.map((e) => ({
    id: e.id,
    fullName: e.full_name,
    role: e.role,
    status: e.status,
    department: e.department,
    location: e.location,
    phone: e.phone,
    photoUrl: e.photo_path ? photoUrlByPath[e.photo_path] ?? null : null,
    mainVehicleName: e.main_vehicle_id ? fleetById[e.main_vehicle_id]?.name ?? null : null,
    qualificationsExpiringCount: expiringCountByEmployee[e.id] ?? 0,
    isArchived: e.is_archived,
  }));

  const inviteUrls = await Promise.all(
    (invites ?? []).map(async (invite) => ({
      ...invite,
      url: await getInviteUrl(invite.token),
    })),
  );

  // URL-Hilfsfunktion fürs Archiviert-Toggle (Filter bleiben beim Umschalten
  // erhalten). Das frühere Detailpanel mit ?panel=/?panelTab= wurde durch
  // die eigene Seite /mitarbeiter/[id] ersetzt (siehe dort).
  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (roleFilter) baseParams.set("role", roleFilter);
  if (statusFilter) baseParams.set("status", statusFilter);
  if (departmentFilter) baseParams.set("department", departmentFilter);
  if (locationFilter) baseParams.set("location", locationFilter);
  if (showArchived) baseParams.set("archived", "1");
  const baseQuery = baseParams.toString();

  function archivedToggleHref(next: boolean) {
    const params = new URLSearchParams(baseQuery);
    if (next) {
      params.set("archived", "1");
    } else {
      params.delete("archived");
    }
    const qs = params.toString();
    return qs ? `/mitarbeiter?${qs}` : "/mitarbeiter";
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-white shadow-md shadow-brand/20">
            <UserSquare2 className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Mitarbeiterverwaltung</h1>
            <p className="mt-0.5 text-sm text-muted">{activeEmployees.length} Mitarbeiter im Unternehmen</p>
          </div>
        </div>
      </div>

      {raw.error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{raw.error}</p>}
      {raw.message && <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{raw.message}</p>}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.key} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <Icon className="h-4 w-4" />
              </span>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <EmployeeFilterBar
          q={q}
          role={roleFilter}
          status={statusFilter}
          department={departmentFilter}
          location={locationFilter}
          departmentOptions={departmentOptions}
          locationOptions={locationOptions}
        />
      </div>

      {isAdmin && (
        <details className="mt-4 rounded-2xl border border-border bg-card shadow-sm">
          <summary className="cursor-pointer list-none px-5 py-3.5 text-sm font-semibold text-foreground">
            Neuen Mitarbeiter einladen
          </summary>
          <div className="border-t border-border p-5">
            <p className="text-sm text-muted">
              Erstelle einen Einladungslink und teile ihn mit deinem Kollegen. Nach der Registrierung wird er
              automatisch eurem Unternehmen zugeordnet.
            </p>
            <form action={createInvite} className="mt-4 flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="role" className="text-sm font-medium">
                  Rolle
                </label>
                <select
                  id="role"
                  name="role"
                  defaultValue="techniker"
                  className="mt-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
                >
                  {INVITABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="rounded-lg bg-gradient-to-br from-brand to-brand-dark px-4 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md"
              >
                Einladungslink erstellen
              </button>
            </form>

            {inviteUrls.length > 0 && (
              <ul className="mt-4 divide-y divide-border border-t border-border">
                {inviteUrls.map((invite) => (
                  <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{ROLE_LABELS[invite.role] ?? invite.role}</p>
                      <p className="mt-0.5 truncate text-xs text-muted">{invite.url}</p>
                    </div>
                    <form action={revokeInvite.bind(null, invite.id)}>
                      <button type="submit" className="text-sm font-medium text-red-600 hover:text-red-700">
                        Zurückziehen
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      )}

      <div className="mt-6">
        {employeeCards.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted">
            Keine Mitarbeiter gefunden.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {employeeCards.map((employee) => (
              <EmployeeCard key={employee.id} employee={employee} href={`/mitarbeiter/${employee.id}`} />
            ))}
          </div>
        )}

        {isAdmin && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
            <Link href={archivedToggleHref(!showArchived)} className="hover:text-brand">
              {showArchived ? "Archivierte ausblenden" : "Archivierte Mitarbeiter anzeigen"}
            </Link>
          </div>
        )}
      </div>

      {!isAdmin && role !== "disponent" && (
        <p className="mt-6 text-xs text-muted">
          Nur Owner, Admin oder Geschäftsführer können Mitarbeiterdaten bearbeiten oder neue Kollegen einladen.
        </p>
      )}
    </div>
  );
}
