// These are Supabase's public URL and publishable (anon) key — safe to be
// visible client-side, protected entirely by Row Level Security on the
// database. The env vars are the source of truth locally and on
// git-connected deploys; the fallbacks guard against a deploy flow that
// doesn't propagate `.env.production` into the serverless runtime.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dgnmizmpeqiynlmzoyzl.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_L--v7ePp1W8PDV_UbzaUWA_qNSxM6D8";
