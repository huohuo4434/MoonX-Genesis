import "server-only";

import { createClient } from "@supabase/supabase-js";
import { normalizeSupabaseUrl } from "@/lib/supabase/normalize-url";

/**
 * Re-authenticate an existing account without persisting a second browser session.
 * Used before trusting a brand-new device or performing security-sensitive device actions.
 */
export async function verifyAccountPassword(email: string, password: string): Promise<boolean> {
  const url = normalizeSupabaseUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  );
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY
  )?.trim();

  if (!url || !key || password.length < 8) return false;

  const verifier = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { data, error } = await verifier.auth.signInWithPassword({ email, password });
  return !error && Boolean(data.user);
}
