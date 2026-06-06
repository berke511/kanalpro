import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  || 'https://ighqrqzespmvafkkqxeu.supabase.co';
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnaHFycXplc3BtdmFma2txeGV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NzAyNDgsImV4cCI6MjA5NjM0NjI0OH0.ZI00OAojEi1tD72TwQvqOYa62BgeRLk7r_jVgfjGVnU';

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
