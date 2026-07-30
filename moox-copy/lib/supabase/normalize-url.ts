/** Normalize Supabase project URL for client/server clients. */
export function normalizeSupabaseUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let url = raw.trim().replace(/^["']|["']$/g, "");
  if (!url) return undefined;
  url = url.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
    return parsed.origin;
  } catch {
    return undefined;
  }
}
