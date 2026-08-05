import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"] & {
  companies: Database["public"]["Tables"]["companies"]["Row"] | null;
};

/**
 * Every authenticated user must end up with a `profiles` row that assigns
 * them to a company (tenant). Signup happens in two steps because Supabase
 * may require e-mail confirmation before a session exists, so we create the
 * company + profile lazily on first authenticated visit instead of inside
 * the sign-up action itself.
 */
export async function getOrCreateProfile(
  supabase: SupabaseClient<Database>,
  user: User,
): Promise<Profile | null> {
  const { data: existing } = await supabase
    .from("profiles")
    .select("*, companies(*)")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    // E-Mail-Adresse mit auth.users synchron halten (z. B. nach einer
    // Adressänderung) – nur bei Abweichung schreiben, damit nicht bei
    // jedem Seitenaufruf ein unnötiges UPDATE anfällt.
    if (existing.email !== user.email && user.email) {
      const { data: updated } = await supabase
        .from("profiles")
        .update({ email: user.email })
        .eq("id", user.id)
        .select("*, companies(*)")
        .maybeSingle();
      if (updated) return updated as Profile;
    }
    return existing as Profile;
  }

  const fullName = (user.user_metadata?.full_name as string | undefined)?.trim() ?? "";
  const inviteToken = (user.user_metadata?.invite_token as string | undefined)?.trim();

  if (inviteToken) {
    // Nutzer kam über einen Einladungslink eines bestehenden Unternehmens.
    // accept_company_invite() ist ebenfalls SECURITY DEFINER (gleicher
    // Henne-Ei-Grund wie unten bei bootstrap_company_and_profile) und legt
    // das Profil direkt in der einladenden Firma mit der vorgesehenen Rolle an.
    const { error: acceptError } = await supabase.rpc("accept_company_invite", {
      p_token: inviteToken,
      p_full_name: fullName,
    });

    if (acceptError) {
      return null;
    }

    const { data: invitedProfile } = await supabase
      .from("profiles")
      .select("*, companies(*)")
      .eq("id", user.id)
      .maybeSingle();

    return (invitedProfile as Profile) ?? null;
  }

  const companyName =
    (user.user_metadata?.company_name as string | undefined)?.trim() ||
    "Mein Unternehmen";

  // Plain inserts here run into a chicken-and-egg RLS problem: PostgREST
  // re-selects the inserted row to return it, which requires the SELECT
  // policies on `companies`/`profiles` to pass — and those resolve through
  // current_company_id(), which looks up the caller's own `profiles` row.
  // That row doesn't exist yet on first login, so no ordinary
  // INSERT ... RETURNING can ever satisfy it. The
  // bootstrap_company_and_profile() SECURITY DEFINER function creates both
  // rows bypassing RLS instead; we then read them back with a normal
  // (now-satisfiable) SELECT.
  const { error: bootstrapError } = await supabase.rpc("bootstrap_company_and_profile", {
    p_company_name: companyName,
    p_full_name: fullName,
  });

  if (bootstrapError) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, companies(*)")
    .eq("id", user.id)
    .maybeSingle();

  return (profile as Profile) ?? null;
}
