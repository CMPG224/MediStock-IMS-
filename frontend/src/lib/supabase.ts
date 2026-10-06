import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// The "anon" key is safe to expose in browser code (hence NEXT_PUBLIC_) --
// it identifies the app, not a user; Row Level Security is what actually
// decides what any given request can read or write. The service_role key
// is a different, far more powerful credential and must NEVER appear here
// -- it belongs only in the Edge Function's own environment.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);