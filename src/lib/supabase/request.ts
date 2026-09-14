import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";

// Pro Anfrage (React cache()) nur einmal berechnet statt in Layout UND
// jeder einzelnen Seite erneut Auth + Profil abzufragen - spart mehrere
// sequentielle Supabase-Auth-Roundtrips pro Klick. Der Cache gilt nur
// für den aktuellen Server-Render-Durchlauf, nicht über Requests hinweg.
export const getRequestSupabase = cache(async () => {
  return createClient();
});

export const getRequestUser = cache(async () => {
  const supabase = await getRequestSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getRequestProfile = cache(async () => {
  const user = await getRequestUser();
  if (!user) return null;
  const supabase = await getRequestSupabase();
  return getOrCreateProfile(supabase, user);
});
