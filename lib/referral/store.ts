/**
 * Referral invite / reward store.
 * Primary: moonx-data/referrals/store.json (same pattern as payment orders).
 * SQL schema: supabase/migrations/007_referral.sql + Prisma models.
 */
import { createHash, randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

export const REFERRAL_REWARD_DAYS = 7;
export const REFERRAL_DEVICE_WINDOW_MS = 60 * 60 * 1000;
export const REFERRAL_DEVICE_MAX_REGISTRATIONS = 3;

export type ReferralRecordStatus = "pending" | "success" | "flagged";

export type ReferralInvite = {
  id: string;
  inviter_id: string;
  invite_code: string;
  created_at: string;
};

export type ReferralRecord = {
  id: string;
  inviter_id: string;
  invitee_id: string;
  payment_id: string | null;
  status: ReferralRecordStatus;
  reward_days: number;
  device_id: string | null;
  flagged_reason: string | null;
  created_at: string;
  inviter_email?: string | null;
  invitee_email?: string | null;
};

type ReferralStore = {
  version: 1;
  updatedAt: string;
  invites: ReferralInvite[];
  records: ReferralRecord[];
  deviceEvents: Array<{ device_id: string; user_id: string; at: string }>;
};

const BUCKET = "moonx-data";
const FILE = "referrals/store.json";
const LOCAL_FILE = resolve(process.cwd(), "data", "referral-store.json");

function id(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;
}

function emptyStore(): ReferralStore {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    invites: [],
    records: [],
    deviceEvents: [],
  };
}

function readLocal(): ReferralStore | null {
  try {
    if (!existsSync(LOCAL_FILE)) return null;
    const parsed = JSON.parse(readFileSync(LOCAL_FILE, "utf8")) as ReferralStore;
    if (!parsed?.invites || !parsed?.records) return null;
    return {
      ...emptyStore(),
      ...parsed,
      deviceEvents: parsed.deviceEvents ?? [],
    };
  } catch {
    return null;
  }
}

function writeLocal(store: ReferralStore): void {
  mkdirSync(resolve(process.cwd(), "data"), { recursive: true });
  writeFileSync(LOCAL_FILE, JSON.stringify(store, null, 2), "utf8");
}

async function readStore(): Promise<ReferralStore> {
  // Unit tests and local scripts can force the JSON file to avoid remote races.
  if (process.env.MOONX_REFERRAL_LOCAL_ONLY === "1") {
    return readLocal() ?? emptyStore();
  }
  try {
    const admin = getStorageAdmin();
    if (admin) {
      const { data, error } = await admin.storage.from(BUCKET).download(FILE);
      if (!error && data) {
        const parsed = JSON.parse(await data.text()) as ReferralStore;
        if (parsed?.invites && parsed?.records) {
          return {
            ...emptyStore(),
            ...parsed,
            deviceEvents: parsed.deviceEvents ?? [],
          };
        }
      }
    }
  } catch {
    /* fall through */
  }
  return readLocal() ?? emptyStore();
}

async function writeStore(store: ReferralStore): Promise<void> {
  const body: ReferralStore = { ...store, updatedAt: new Date().toISOString() };
  writeLocal(body);
  if (process.env.MOONX_REFERRAL_LOCAL_ONLY === "1") return;
  const admin = getStorageAdmin();
  if (!admin) return;
  const blob = new Blob([JSON.stringify(body, null, 2)], { type: "application/json" });
  const { error } = await admin.storage.from(BUCKET).upload(FILE, blob, {
    upsert: true,
    contentType: "application/json",
  });
  if (error) console.warn("[referral-store] upload:", error.message);
}

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Exclude O/0/I/1 to avoid ambiguous invite codes. */
const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(seed?: string): string {
  // Mix seed entropy with random bytes; always emit 8 unambiguous chars.
  const hash = createHash("sha1")
    .update(seed ?? "")
    .update(randomBytes(8))
    .digest();
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += INVITE_ALPHABET[hash[i]! % INVITE_ALPHABET.length]!;
  }
  return out;
}

export async function getInviteByCode(code: string): Promise<ReferralInvite | null> {
  const normalized = normalizeInviteCode(code);
  if (!normalized) return null;
  const store = await readStore();
  return store.invites.find((i) => i.invite_code === normalized) ?? null;
}

export async function getInviteByInviter(inviterId: string): Promise<ReferralInvite | null> {
  const store = await readStore();
  return store.invites.find((i) => i.inviter_id === inviterId) ?? null;
}

export async function ensureReferralInvite(inviterId: string, preferredCode?: string): Promise<ReferralInvite> {
  const store = await readStore();
  const existing = store.invites.find((i) => i.inviter_id === inviterId);
  if (existing) return existing;

  const preferred = preferredCode ? normalizeInviteCode(preferredCode) : "";
  // Prefer an existing code from metadata even if it contains legacy ambiguous chars.
  const preferredOk =
    preferred.length >= 6 &&
    preferred.length <= 12 &&
    !store.invites.some((i) => i.invite_code === preferred);

  let code = preferredOk ? preferred : generateInviteCode(inviterId);
  let attempt = 0;
  while (store.invites.some((i) => i.invite_code === code) && attempt < 16) {
    code = generateInviteCode(`${inviterId}:${attempt}`);
    attempt += 1;
  }
  if (store.invites.some((i) => i.invite_code === code)) {
    throw new Error("INVITE_CODE_CONFLICT");
  }

  const invite: ReferralInvite = {
    id: id("rinv"),
    inviter_id: inviterId,
    invite_code: code,
    created_at: new Date().toISOString(),
  };
  store.invites.push(invite);
  await writeStore(store);
  return invite;
}

export async function listReferralRecords(filter?: {
  inviterId?: string;
  inviteeId?: string;
}): Promise<ReferralRecord[]> {
  const store = await readStore();
  return store.records
    .filter((r) => (filter?.inviterId ? r.inviter_id === filter.inviterId : true))
    .filter((r) => (filter?.inviteeId ? r.invitee_id === filter.inviteeId : true))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getReferralStats(inviterId: string): Promise<{
  successCount: number;
  rewardDaysTotal: number;
  pendingCount: number;
}> {
  const rows = await listReferralRecords({ inviterId });
  const success = rows.filter((r) => r.status === "success");
  return {
    successCount: success.length,
    rewardDaysTotal: success.reduce((sum, r) => sum + (r.reward_days || 0), 0),
    pendingCount: rows.filter((r) => r.status === "pending").length,
  };
}

export async function recordDeviceRegistration(deviceId: string | null | undefined, userId: string): Promise<{
  flagged: boolean;
  reason: string | null;
  recentCount: number;
}> {
  if (!deviceId || deviceId.length < 8) {
    return { flagged: false, reason: null, recentCount: 0 };
  }
  const store = await readStore();
  const now = Date.now();
  store.deviceEvents = (store.deviceEvents ?? []).filter(
    (e) => now - new Date(e.at).getTime() < REFERRAL_DEVICE_WINDOW_MS * 24
  );
  store.deviceEvents.push({ device_id: deviceId, user_id: userId, at: new Date().toISOString() });
  const recent = store.deviceEvents.filter(
    (e) =>
      e.device_id === deviceId && now - new Date(e.at).getTime() <= REFERRAL_DEVICE_WINDOW_MS
  );
  const flagged = recent.length > REFERRAL_DEVICE_MAX_REGISTRATIONS;
  await writeStore(store);
  return {
    flagged,
    reason: flagged ? "同设备短时间大量注册" : null,
    recentCount: recent.length,
  };
}

export async function bindReferralOnRegister(input: {
  inviterId: string;
  inviteeId: string;
  inviteeEmail: string;
  inviterEmail?: string | null;
  deviceId?: string | null;
}): Promise<{ ok: boolean; record?: ReferralRecord; error?: string }> {
  if (input.inviterId === input.inviteeId) {
    return { ok: false, error: "不能邀请自己" };
  }

  const store = await readStore();
  if (store.records.some((r) => r.invitee_id === input.inviteeId)) {
    return { ok: false, error: "该账户已绑定邀请关系" };
  }

  const device = await recordDeviceRegistration(input.deviceId, input.inviteeId);
  // re-read after device write
  const latest = await readStore();
  const status: ReferralRecordStatus = device.flagged ? "flagged" : "pending";
  const record: ReferralRecord = {
    id: id("rrec"),
    inviter_id: input.inviterId,
    invitee_id: input.inviteeId,
    payment_id: null,
    status,
    reward_days: REFERRAL_REWARD_DAYS,
    device_id: input.deviceId ?? null,
    flagged_reason: device.reason,
    created_at: new Date().toISOString(),
    inviter_email: input.inviterEmail ?? null,
    invitee_email: input.inviteeEmail.toLowerCase(),
  };
  latest.records.push(record);
  await writeStore(latest);
  return { ok: true, record };
}

export async function findPendingReferralForInvitee(
  inviteeId: string
): Promise<ReferralRecord | null> {
  const store = await readStore();
  const record = store.records.find((r) => r.invitee_id === inviteeId) ?? null;
  return record;
}

export async function finalizeReferralReward(input: {
  inviteeId: string;
  paymentId: string;
}): Promise<{
  applied: boolean;
  skipped?: string;
  record?: ReferralRecord;
}> {
  const store = await readStore();

  if (store.records.some((r) => r.payment_id === input.paymentId && r.status === "success")) {
    return { applied: false, skipped: "同一付款记录已奖励" };
  }

  const record = store.records.find((r) => r.invitee_id === input.inviteeId);
  if (!record) return { applied: false, skipped: "无邀请关系" };
  if (record.status === "success") return { applied: false, skipped: "已发放奖励", record };
  if (record.status === "flagged") {
    return { applied: false, skipped: record.flagged_reason ?? "邀请关系已标记异常", record };
  }
  if (record.inviter_id === input.inviteeId) {
    return { applied: false, skipped: "不能邀请自己", record };
  }

  record.payment_id = input.paymentId;
  record.status = "success";
  record.reward_days = REFERRAL_REWARD_DAYS;
  await writeStore(store);
  return { applied: true, record };
}

/** @deprecated use finalizeReferralReward */
export async function applyReferralRewardForPayment(input: {
  inviteeId: string;
  paymentId: string;
}): Promise<{
  applied: boolean;
  skipped?: string;
  record?: ReferralRecord;
}> {
  return finalizeReferralReward(input);
}

export async function listAllReferralRecordsAdmin(): Promise<ReferralRecord[]> {
  return listReferralRecords();
}

/** Seed helpers for tests / local demos */
export async function seedReferralDemo(input: {
  inviterId: string;
  inviterEmail: string;
  inviteeId: string;
  inviteeEmail: string;
  code?: string;
}): Promise<{ invite: ReferralInvite; record: ReferralRecord }> {
  const invite = await ensureReferralInvite(input.inviterId, input.code ?? "ABC123");
  const bound = await bindReferralOnRegister({
    inviterId: input.inviterId,
    inviteeId: input.inviteeId,
    inviteeEmail: input.inviteeEmail,
    inviterEmail: input.inviterEmail,
    deviceId: "seed-device-demo-0001",
  });
  if (!bound.ok || !bound.record) {
    const existing = (await listReferralRecords({ inviteeId: input.inviteeId }))[0];
    if (!existing) throw new Error(bound.error ?? "seed bind failed");
    return { invite, record: existing };
  }
  return { invite, record: bound.record };
}
