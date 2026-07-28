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
    return existing as Profile;
  }

  const companyName =
    (user.user_metadata?.company_name as string | undefined)?.trim() ||
    "Mein Unternehmen";
  const fullName = (user.user_metadata?.full_name as string | undefined)?.trim() ?? null;

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({ name: companyName })
    .select()
    .single();

  if (companyError || !company) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      company_id: company.id,
      full_name: fullName,
      role: "owner",
    })
    .select("*, companies(*)")
    .single();

  if (profileError || !profile) {
    return null;
  }

  return profile as Profile;
}
