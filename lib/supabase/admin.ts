import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeSupabaseUrl } from "@/lib/supabase/normalize-url";

let cached: SupabaseClient | null | undefined;

/** Service-role admin client — server only. Never expose to the browser. */
export function getAdminClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL);
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY)?.trim();
  if (!url || !serviceKey) {
    cached = null;
    return null;
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** @deprecated Use getAdminClient() */
export function createSupabaseAdminClient() {
  return getAdminClient();
}

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(getAdminClient());
}
