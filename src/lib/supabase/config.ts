// These are Supabase's public URL and publishable (anon) key — safe to be
// visible client-side, protected entirely by Row Level Security on the
// database.
//
// Deliberately hardcoded rather than read from process.env: this Vercel
// project has a stale/incorrect NEXT_PUBLIC_SUPABASE_URL configured at the
// project level (pointing at a non-existent Supabase project,
// "hxgdnltrpznuhjwmrafp"), which silently overrides whatever value ships in
// the deploy payload's .env.production file and breaks every server-side
// Supabase call with "fetch failed" (DNS lookup failure). Until that stray
// project-level env var is removed in the Vercel dashboard, reading from
// process.env here is actively harmful, so we bypass it entirely.
export const SUPABASE_URL = "https://dgnmizmpeqiynlmzoyzl.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_L--v7ePp1W8PDV_UbzaUWA_qNSxM6D8";
