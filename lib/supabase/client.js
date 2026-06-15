// lib/supabase/client.js
// Kompatibilitäts-Wrapper — gibt den Singleton-Client zurück
// (für Verwendung in lib/roles.js und anderen Modulen)

import supabaseClient from '@/lib/supabase';

export function createClient() {
  return supabaseClient;
}
