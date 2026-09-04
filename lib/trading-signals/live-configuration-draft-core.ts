export const LIVE_CONFIGURATION_DRAFT_CODE = "LIVE_CONFIGURATION_DRAFT_V1";
export type LiveConfigurationDraft = {
  schemaVersion: 1;
  state: "PENDING";
  durationMode: "CONTINUOUS" | "FIXED";
  durationDays: number | null;
  capitalUsdt: string;
  leverage: 1 | 2;
};

// This is a requested budget, not equity, a deposit, or execution permission.
export function parseLiveConfigurationDraft(value: unknown): LiveConfigurationDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_CONFIGURATION");
  const data = value as Record<string, unknown>;
  if (Object.keys(data).some((key) => !["durationMode", "durationDays", "capitalUsdt", "leverage"].includes(key))) throw new Error("INVALID_CONFIGURATION");
  if (typeof data.capitalUsdt !== "string" || !/^\d{1,14}(?:\.\d{1,2})?$/.test(data.capitalUsdt)) throw new Error("INVALID_BUDGET");
  const [whole = "", fraction = ""] = data.capitalUsdt.split(".");
  const hundred = BigInt(100);
  const cents = BigInt(whole) * hundred + BigInt(fraction.padEnd(2, "0"));
  if (cents <= BigInt(0) || cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("INVALID_BUDGET");
  if (data.durationMode !== "CONTINUOUS" && data.durationMode !== "FIXED") throw new Error("INVALID_DURATION");
  if (data.durationMode === "CONTINUOUS" && data.durationDays != null) throw new Error("INVALID_DURATION");
  if (data.durationMode === "FIXED" && (typeof data.durationDays !== "number" || !Number.isInteger(data.durationDays) || data.durationDays < 1 || data.durationDays > 36525)) throw new Error("INVALID_DURATION");
  // Older V1 drafts did not store leverage and keep the existing 2x default.
  const leverage = data.leverage === undefined ? 2 : data.leverage;
  if (leverage !== 1 && leverage !== 2) throw new Error("INVALID_LEVERAGE");
  return {
    schemaVersion: 1, state: "PENDING", durationMode: data.durationMode,
    durationDays: data.durationMode === "FIXED" ? data.durationDays as number : null,
    capitalUsdt: `${cents / hundred}.${String(cents % hundred).padStart(2, "0")}`,
    leverage,
  };
}

export type LiveConfigurationDraftView = {
  draft: LiveConfigurationDraft | null;
  revision: string | null;
  savedAt: string | null;
  applied: false;
};

export function readLiveConfigurationDraftEvent(event: { id: string; detail: string; createdAt: Date } | null): LiveConfigurationDraftView {
  if (!event) return { draft: null, revision: null, savedAt: null, applied: false };
  const value = JSON.parse(event.detail);
  if (value?.schemaVersion !== 1 || value?.state !== "PENDING") throw new Error("INVALID_SAVED_CONFIGURATION");
  const draft = parseLiveConfigurationDraft({ durationMode: value.durationMode, durationDays: value.durationDays, capitalUsdt: value.capitalUsdt, leverage: value.leverage });
  return { draft, revision: event.id, savedAt: event.createdAt.toISOString(), applied: false };
}
