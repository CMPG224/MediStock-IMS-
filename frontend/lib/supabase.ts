import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Anon key only — safe in the browser; RLS enforces access.
// Never put the service_role key here.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
