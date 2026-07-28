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
    if (options?.override || !existing || existing.trim().length < 20) {
      process.env[key] = val;
    }
  }
}

export function loadProductionEnv(): void {
  // Prefer project env files; Vercel pull may contain placeholders.
  loadEnvFile(resolve(process.cwd(), ".env.production.local"), { override: true });
  loadEnvFile(resolve(process.cwd(), ".env.local"));
  loadEnvFile(resolve(process.cwd(), ".vercel/.env.production.local"));
  const normalized = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (normalized) process.env.NEXT_PUBLIC_SUPABASE_URL = normalized;
}
