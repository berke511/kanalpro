import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Fehlende ENV-Variable: NEXT_PUBLIC_SUPABASE_URL  und NEXT_PUBLIC_SUPABASE_ANON_KEY müssen gesetzt sein.'
  );
}

const supabase = createBrowserClient(supabaseUrl, supabaseKey);

export default supabase;
