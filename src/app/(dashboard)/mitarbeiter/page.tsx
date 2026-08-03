import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { INVITABLE_ROLES, ROLE_LABELS } from "@/lib/roles";
import {
  createInvite,
  revokeInvite,
  updateEmployeeRole,
  removeEmployee,
  getInviteUrl,
} from "./actions";

export default async function MitarbeiterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const currentProfile = await getOrCreateProfile(supabase, user);
  const isAdmin = currentProfile?.role === "owner" || currentProfile?.role === "admin";

  const [{ data: employees }, { data: invites }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role, created_at")
      .order("created_at", { ascending: true }),
    isAdmin
      ? supabase
          .from("company_invites")
          .select("id, token, role, created_at")
          .is("accepted_at", null)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const inviteUrls = await Promise.all(
    (invites ?? []).map(async (invite) => ({
      ...invite,
      url: await getInviteUrl(invite.token),
    })),
  );

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mitarbeiterverwaltung</h1>
          <p className="mt-1 text-sm text-muted">
            {employees?.length ?? 0} Mitarbeiter im Unternehmen
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      {message && (
        <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{message}</p>
      )}

      {isAdmin && (
        <div className="mt-6 rounded-2xl border border-border bg-card shadow-sm p-5">
          <h2 className="text-sm font-semibold">Neuen Mitarbeiter einladen</h2>
          <p className="mt-1 text-sm text-muted">
            Erstelle einen Einladungslink und teile ihn mit deinem Kollegen. Nach der
            Registrierung wird er automatisch eurem Unternehmen zugeordnet.
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
                {INVITABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Einladungslink erstellen
            </button>
          </form>
        </div>
      )}

      {isAdmin && inviteUrls.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold">
            Offene Einladungen
          </div>
          <ul className="divide-y divide-border">
            {inviteUrls.map((invite) => (
              <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
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
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-background text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Rolle</th>
              {isAdmin && <th className="px-4 py-3 font-medium">Aktionen</th>}
            </tr>
          </thead>
          <tbody>
            {(employees ?? []).map((employee) => (
              <tr key={employee.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">
                  {employee.full_name || "—"}
                  {employee.id === user.id && (
                    <span className="ml-2 text-xs font-normal text-muted">(Du)</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
                    {ROLE_LABELS[employee.role] ?? employee.role}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    {employee.id !== user.id && employee.role !== "owner" ? (
                      <div className="flex items-center gap-3">
                        <form action={updateEmployeeRole.bind(null, employee.id)} className="flex items-center gap-2">
                          <select
                            name="role"
                            defaultValue={employee.role}
                            className="rounded-lg border border-border px-2 py-1 text-xs outline-none focus:border-brand"
                          >
                            {INVITABLE_ROLES.map((role) => (
                              <option key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </option>
                            ))}
                          </select>
                          <button type="submit" className="text-xs font-medium text-brand">
                            Speichern
                          </button>
                        </form>
                        <form action={removeEmployee.bind(null, employee.id)}>
                          <button type="submit" className="text-xs font-medium text-red-600 hover:text-red-700">
                            Entfernen
                          </button>
                        </form>
                      </div>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isAdmin && (
        <p className="mt-6 text-sm text-muted">
          Nur Owner und Admins können neue Mitarbeiter einladen oder Rollen verwalten.
        </p>
      )}

      <p className="mt-6 text-xs text-muted">
        Möchtest du deine eigene Rolle ändern? Wende dich an einen anderen Admin oder den Owner.{" "}
        <Link href="/dashboard" className="text-brand">
          Zurück zum Dashboard
        </Link>
      </p>
    </div>
  );
}
