import { createClient } from "@supabase/supabase-js";

// IMPORTANT:
// Do NOT throw errors at build time.
// Supabase client should be created lazily.

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
);


