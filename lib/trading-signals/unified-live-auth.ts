type UnknownRecord = Record<string, unknown>;
type UnknownFn = (...args: unknown[]) => unknown;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" ? (value as UnknownRecord) : null;
}

async function invokeCandidate(module: UnknownRecord, names: string[], request?: Request) {
  for (const name of names) {
    const candidate = module[name];
    if (typeof candidate !== "function") continue;
    const fn = candidate as UnknownFn;
    for (const args of request ? [[request], []] : [[]]) {
      try {
        const value = await fn(...args);
        if (value) return value;
      } catch {
        // Try the next compatible signature without exposing authentication details.
      }
    }
  }
  return null;
}

export interface UnifiedLiveActor {
  id: string;
  email?: string;
  role?: string;
  raw: UnknownRecord;
}

export async function resolveUnifiedLiveActor(request?: Request): Promise<UnifiedLiveActor | null> {
  const accessModule = (await import("@/lib/auth/get-access-user")) as UnknownRecord;
  const value = await invokeCandidate(
    accessModule,
    ["getAccessUser", "getCurrentAccessUser", "resolveAccessUser", "getCurrentUser"],
    request,
  );
  const record = asRecord(value);
  if (!record) return null;
  const idValue = record.id ?? record.userId ?? record.email;
  if (typeof idValue !== "string" || !idValue.trim()) return null;
  return {
    id: idValue,
    email: typeof record.email === "string" ? record.email : undefined,
    role: typeof record.role === "string" ? record.role : undefined,
    raw: record,
  };
}

export async function isUnifiedLiveAdmin(actor: UnifiedLiveActor | null): Promise<boolean> {
  if (!actor) return false;
  if (String(actor.role ?? "").toUpperCase().includes("ADMIN")) return true;
  try {
    const adminModule = (await import("@/lib/auth/is-admin")) as UnknownRecord;
    const result = await invokeCandidate(
      adminModule,
      ["isAdmin", "isAdminUser", "checkIsAdmin"],
    );
    if (typeof result === "boolean") return result;
  } catch {
    // Fall through to fail-closed.
  }
  return false;
}
