export type ResearchStoreState = "READY" | "MISSING" | "INVALID" | "UNCONFIGURED" | "ERROR";

export type ResearchStoreHealth = {
  id: "teacher-knowledge" | "master-intelligence";
  label: string;
  backend: "SUPABASE" | "LOCAL";
  state: ResearchStoreState;
  initialized: boolean;
  updatedAt: string | null;
  counts: Record<string, number>;
  detail: string;
};

export type ResearchStoreInitializationResult = {
  id: ResearchStoreHealth["id"];
  outcome: "CREATED" | "ALREADY_READY";
};

function storageErrorText(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const row = error as { message?: unknown; status?: unknown; statusCode?: unknown; error?: unknown };
  return [row.message, row.status, row.statusCode, row.error]
    .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
    .join(" ")
    .toLowerCase();
}

export function isMissingResearchStoreObject(error: unknown): boolean {
  const text = storageErrorText(error);
  return /(^|\s)404(\s|$)|not[ _-]?found|object not found|no such object/.test(text);
}

export function safeResearchStoreError(error: unknown): string {
  const text = storageErrorText(error).replace(/[\r\n\t]+/g, " ").trim();
  if (!text) return "存储读取失败";
  return text.slice(0, 180);
}

export function researchStoreReady(input: Omit<ResearchStoreHealth, "state" | "initialized">): ResearchStoreHealth {
  return { ...input, state: "READY", initialized: true };
}

export function researchStoreUnavailable(input: Omit<ResearchStoreHealth, "initialized">): ResearchStoreHealth {
  return { ...input, initialized: false };
}
