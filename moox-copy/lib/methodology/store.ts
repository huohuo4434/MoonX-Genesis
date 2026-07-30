/**
 * Methodology module config store (JSON).
 * Primary: moonx-data/methodology/config.json; local fallback for admin/dev.
 */
import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { defaultMethodologyConfig } from "@/lib/methodology/defaults";
import { applyRuntimeGates } from "@/lib/methodology/gates";
import type { MethodologyConfig, MethodologyModule, MethodologyModuleId } from "@/lib/methodology/types";
import { getFeatureFlags } from "@/lib/feature-flags";

export { applyRuntimeGates } from "@/lib/methodology/gates";

function normalizeSupabaseUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed || trimmed.includes("[SENSITIVE]")) return undefined;
  return trimmed;
}

function getStorageAdmin(): SupabaseClient | null {
  const url = normalizeSupabaseUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  );
  const serviceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  )?.trim();
  if (!url || !serviceKey || serviceKey === "[SENSITIVE]") return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const BUCKET = "moonx-data";
const FILE = "methodology/config.json";
const LOCAL_FILE = resolve(process.cwd(), "data", "methodology-config.json");

function mergeWithDefaults(partial: Partial<MethodologyConfig> | null): MethodologyConfig {
  const base = defaultMethodologyConfig();
  if (!partial?.modules?.length) return base;
  const byId = new Map(partial.modules.map((m) => [m.id, m]));
  return {
    version: 1,
    updatedAt: partial.updatedAt ?? base.updatedAt,
    modules: base.modules.map((def) => {
      const override = byId.get(def.id);
      if (!override) return def;
      return {
        ...def,
        ...override,
        id: def.id,
      };
    }),
  };
}

function readLocal(): MethodologyConfig | null {
  try {
    if (!existsSync(LOCAL_FILE)) return null;
    return mergeWithDefaults(JSON.parse(readFileSync(LOCAL_FILE, "utf8")) as MethodologyConfig);
  } catch {
    return null;
  }
}

function writeLocal(config: MethodologyConfig): void {
  mkdirSync(resolve(process.cwd(), "data"), { recursive: true });
  writeFileSync(LOCAL_FILE, JSON.stringify(config, null, 2), "utf8");
}

async function readStore(): Promise<MethodologyConfig> {
  try {
    const admin = getStorageAdmin();
    if (admin) {
      const { data, error } = await admin.storage.from(BUCKET).download(FILE);
      if (!error && data) {
        return mergeWithDefaults(JSON.parse(await data.text()) as MethodologyConfig);
      }
    }
  } catch {
    /* fall through */
  }
  return readLocal() ?? defaultMethodologyConfig();
}

async function writeStore(config: MethodologyConfig): Promise<void> {
  const body: MethodologyConfig = { ...config, updatedAt: new Date().toISOString(), version: 1 };
  writeLocal(body);
  const admin = getStorageAdmin();
  if (!admin) return;
  const blob = new Blob([JSON.stringify(body, null, 2)], { type: "application/json" });
  const { error } = await admin.storage.from(BUCKET).upload(FILE, blob, {
    upsert: true,
    contentType: "application/json",
  });
  if (error) console.warn("[methodology-config] upload:", error.message);
}

/** Apply runtime feature gates so offline modules cannot be advertised as live. */
export function gatedModules(modules: MethodologyModule[]): MethodologyModule[] {
  const flags = getFeatureFlags();
  return applyRuntimeGates(modules, {
    intelligenceSnapshotEnabled: flags.intelligenceSnapshotEnabled,
  });
}

export async function getMethodologyConfig(): Promise<MethodologyConfig> {
  const stored = await readStore();
  return {
    ...stored,
    modules: gatedModules(stored.modules),
  };
}

/** Public page: enabled + publicDisplay only. */
export async function getPublicMethodologyModules(): Promise<MethodologyModule[]> {
  const config = await getMethodologyConfig();
  return config.modules.filter((m) => m.enabled && m.publicDisplay);
}

export async function updateMethodologyModule(
  id: MethodologyModuleId,
  patch: Partial<Omit<MethodologyModule, "id">>
): Promise<MethodologyConfig> {
  const current = await readStore();
  const modules = current.modules.map((m) =>
    m.id === id
      ? {
          ...m,
          ...patch,
          id: m.id,
          updatedAt: new Date().toISOString(),
        }
      : m
  );
  const next: MethodologyConfig = {
    version: 1,
    updatedAt: new Date().toISOString(),
    modules,
  };
  await writeStore(next);
  return {
    ...next,
    modules: gatedModules(next.modules),
  };
}
