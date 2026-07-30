/** Load KEY=VALUE lines from a dotenv file into process.env (no logging). */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

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

function looksLikePlaceholder(val: string): boolean {
  const v = val.trim().toLowerCase();
  if (!v) return true;
  if (v.length < 20) return true;
  if (/^(change.?me|placeholder|your[_-]?|xxx|todo|null|undefined)$/i.test(v)) return true;
  if (/\$\{|<.*>/.test(val)) return true;
  return false;
}

export function loadEnvFile(path: string, options?: { override?: boolean }): void {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    const existing = process.env[key];
    const existingStrong = Boolean(existing && !looksLikePlaceholder(existing));
    const nextStrong = !looksLikePlaceholder(val);

    // Never clobber a strong value with a placeholder.
    if (existingStrong && !nextStrong) continue;

    if (options?.override || !existing || looksLikePlaceholder(existing) || nextStrong) {
      process.env[key] = val;
    }
  }
}

export function loadProductionEnv(): void {
  // Later strong values replace earlier placeholders.
  loadEnvFile(resolve(process.cwd(), ".vercel/.env.production.local"));
  loadEnvFile(resolve(process.cwd(), ".env.production.local"));
  loadEnvFile(resolve(process.cwd(), ".env.local"));
  loadEnvFile(resolve(process.cwd(), ".env"));
  const normalized = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (normalized) process.env.NEXT_PUBLIC_SUPABASE_URL = normalized;
}
