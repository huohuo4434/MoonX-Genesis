import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

function inspect(rel: string) {
  const path = resolve(process.cwd(), rel);
  if (!existsSync(path)) {
    console.log(rel, "MISSING");
    return;
  }
  const keys = ["MOONX_ADMIN_INITIAL_PASSWORD", "NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
  const map: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    map[k] = v;
  }
  console.log(rel, Object.fromEntries(keys.map((k) => {
    const v = map[k] ?? "";
    return [k, { present: Boolean(v), len: v.length, placeholder: v.includes("SENSITIVE") || v === "[SENSITIVE]" }];
  })));
}

inspect(".env.local");
inspect(".vercel/.env.production.local");
inspect(".env.production.local");
