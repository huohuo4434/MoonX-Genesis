/**
 * Referral invite / reward store.
 * Production: Prisma tables ReferralInvite / ReferralRecord (DATABASE_URL).
 * Never writes /var/task/data/*.json on Vercel (EROFS).
 * Tests: MOONX_REFERRAL_LOCAL_ONLY=1 uses in-memory (+ optional local file if writable).
 */
import { createHash, randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { prisma } from "@/lib/prisma";
import {
  REFERRAL_INVITER_REWARD_DAYS,
  isReferralRewardDeliveryPlan,
  type ReferralRewardDeliveryPlan,
} from "@/lib/referral/reward-policy";

/** @deprecated Use role-specific constants. This legacy alias is the inviter reward. */
export const REFERRAL_REWARD_DAYS = REFERRAL_INVITER_REWARD_DAYS;
export const REFERRAL_DEVICE_WINDOW_MS = 60 * 60 * 1000;
export const REFERRAL_DEVICE_MAX_REGISTRATIONS = 3;

export type ReferralRecordStatus = "pending" | "rewarding" | "success" | "flagged";

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
  reward_delivery_token?: string | null;
  reward_delivery_started_at?: string | null;
  reward_delivery_plan?: ReferralRewardDeliveryPlan | null;
};

type ReferralStore = {
  version: 1;
  updatedAt: string;
  invites: ReferralInvite[];
  records: ReferralRecord[];
  deviceEvents: Array<{ device_id: string; user_id: string; at: string }>;
};

const LOCAL_FILE = resolve(process.cwd(), "data", "referral-store.json");

/** In-memory store for unit tests (and ephemeral fallback). */
let memoryStore: ReferralStore | null = null;

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

function isLocalOnly(): boolean {
  return process.env.MOONX_REFERRAL_LOCAL_ONLY === "1";
}

function shouldUsePrisma(): boolean {
  return Boolean(prisma && process.env.DATABASE_URL?.trim() && !isLocalOnly());
}

function readLocalFile(): ReferralStore | null {
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

/** Soft write — never on Vercel / production; never throws EROFS to callers. */
function tryWriteLocalFile(store: ReferralStore): void {
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return;
  }
  if (!isLocalOnly()) return;
  try {
    mkdirSync(resolve(process.cwd(), "data"), { recursive: true });
    writeFileSync(LOCAL_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/EROFS|read-only|EACCES/i.test(msg)) {
      console.warn("[referral] skipped local file write (read-only FS)");
      return;
    }
    console.warn("[referral] local write failed:", msg);
  }
}

function getMemoryStore(): ReferralStore {
  // Never touch local JSON on Vercel / production — Prisma only.
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    if (!memoryStore) memoryStore = emptyStore();
    return memoryStore;
  }
  if (!memoryStore) memoryStore = (isLocalOnly() ? readLocalFile() : null) ?? emptyStore();
  return memoryStore;
}

function saveMemoryStore(store: ReferralStore): void {
  memoryStore = { ...store, updatedAt: new Date().toISOString() };
  if (isLocalOnly()) tryWriteLocalFile(memoryStore);
}

function mapInvite(row: {
  id: string;
  inviterId: string;
  inviteCode: string;
  createdAt: Date;
}): ReferralInvite {
  return {
    id: row.id,
    inviter_id: row.inviterId,
    invite_code: row.inviteCode,
    created_at: row.createdAt.toISOString(),
  };
}

function mapRecord(row: {
  id: string;
  inviterId: string;
  inviteeId: string;
  paymentId: string | null;
  status: string;
  rewardDays: number;
  deviceId: string | null;
  flaggedReason: string | null;
  createdAt: Date;
}): ReferralRecord {
  const rewarding = parseRewardingStatus(row.status);
  const status = (rewarding ? "rewarding" : row.status === "success" || row.status === "flagged" ? row.status : "pending") as ReferralRecordStatus;
  return {
    id: row.id,
    inviter_id: row.inviterId,
    invitee_id: row.inviteeId,
    payment_id: row.paymentId,
    status,
    reward_days: row.rewardDays,
    device_id: row.deviceId,
    flagged_reason: row.flaggedReason,
    created_at: row.createdAt.toISOString(),
    reward_delivery_token: rewarding?.token ?? null,
    reward_delivery_started_at: rewarding ? new Date(rewarding.startedAtMs).toISOString() : null,
    reward_delivery_plan: rewarding?.plan ?? null,
  };
}

export const REFERRAL_REWARD_RECOVERY_MS = 5 * 60 * 1000;

function rewardingStatus(token: string, startedAtMs: number, plan?: ReferralRewardDeliveryPlan | null): string {
  const encodedPlan = plan ? Buffer.from(JSON.stringify(plan), "utf8").toString("base64url") : "";
  return `rewarding:${startedAtMs}:${token}${encodedPlan ? `:${encodedPlan}` : ""}`;
}

function parseRewardingStatus(status: string): { token: string; startedAtMs: number; plan: ReferralRewardDeliveryPlan | null } | null {
  const match = /^rewarding:(\d+):([A-Za-z0-9_-]{8,})(?::([A-Za-z0-9_-]+))?$/.exec(status);
  if (!match) return null;
  const startedAtMs = Number(match[1]);
  if (!Number.isFinite(startedAtMs)) return null;
  let plan: ReferralRewardDeliveryPlan | null = null;
  if (match[3]) {
    try {
      const decoded: unknown = JSON.parse(Buffer.from(match[3], "base64url").toString("utf8"));
      if (!isReferralRewardDeliveryPlan(decoded)) return null;
      plan = decoded;
    } catch {
      return null;
    }
  }
  return { startedAtMs, token: match[2]!, plan };
}

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Exclude O/0/I/1 to avoid ambiguous invite codes. */
const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(seed?: string): string {
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
  if (shouldUsePrisma() && prisma) {
    const row = await prisma.referralInvite.findUnique({ where: { inviteCode: normalized } });
    return row ? mapInvite(row) : null;
  }
  const store = getMemoryStore();
  return store.invites.find((i) => i.invite_code === normalized) ?? null;
}

export async function getInviteByInviter(inviterId: string): Promise<ReferralInvite | null> {
  if (shouldUsePrisma() && prisma) {
    const row = await prisma.referralInvite.findFirst({ where: { inviterId } });
    return row ? mapInvite(row) : null;
  }
  const store = getMemoryStore();
  return store.invites.find((i) => i.inviter_id === inviterId) ?? null;
}

export async function ensureReferralInvite(
  inviterId: string,
  preferredCode?: string
): Promise<ReferralInvite> {
  const existing = await getInviteByInviter(inviterId);
  if (existing) return existing;

  const preferred = preferredCode ? normalizeInviteCode(preferredCode) : "";

  if (shouldUsePrisma() && prisma) {
    const preferredOk =
      preferred.length >= 6 &&
      preferred.length <= 12 &&
      !(await prisma.referralInvite.findUnique({ where: { inviteCode: preferred } }));

    let code = preferredOk ? preferred : generateInviteCode(inviterId);
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const clash = await prisma.referralInvite.findUnique({ where: { inviteCode: code } });
      if (!clash) {
        const row = await prisma.referralInvite.create({
          data: { inviterId, inviteCode: code },
        });
        return mapInvite(row);
      }
      code = generateInviteCode(`${inviterId}:${attempt}`);
    }
    throw new Error("INVITE_CODE_CONFLICT");
  }

  const store = getMemoryStore();
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
  saveMemoryStore(store);
  return invite;
}

export async function listReferralRecords(filter?: {
  inviterId?: string;
  inviteeId?: string;
}): Promise<ReferralRecord[]> {
  if (shouldUsePrisma() && prisma) {
    const rows = await prisma.referralRecord.findMany({
      where: {
        ...(filter?.inviterId ? { inviterId: filter.inviterId } : {}),
        ...(filter?.inviteeId ? { inviteeId: filter.inviteeId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapRecord);
  }
  const store = getMemoryStore();
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

export async function recordDeviceRegistration(
  deviceId: string | null | undefined,
  userId: string
): Promise<{
  flagged: boolean;
  reason: string | null;
  recentCount: number;
}> {
  if (!deviceId || deviceId.length < 8) {
    return { flagged: false, reason: null, recentCount: 0 };
  }

  if (shouldUsePrisma() && prisma) {
    const since = new Date(Date.now() - REFERRAL_DEVICE_WINDOW_MS);
    const recentCount = await prisma.referralRecord.count({
      where: { deviceId, createdAt: { gte: since } },
    });
    // +1 for the registration about to happen
    const flagged = recentCount + 1 > REFERRAL_DEVICE_MAX_REGISTRATIONS;
    return {
      flagged,
      reason: flagged ? "同设备短时间大量注册" : null,
      recentCount: recentCount + 1,
    };
  }

  const store = getMemoryStore();
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
  saveMemoryStore(store);
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

  const existing = await listReferralRecords({ inviteeId: input.inviteeId });
  if (existing.length) return { ok: false, error: "该账户已绑定邀请关系" };

  const device = await recordDeviceRegistration(input.deviceId, input.inviteeId);
  const status: ReferralRecordStatus = device.flagged ? "flagged" : "pending";

  if (shouldUsePrisma() && prisma) {
    try {
      const row = await prisma.referralRecord.create({
        data: {
          inviterId: input.inviterId,
          inviteeId: input.inviteeId,
          paymentId: null,
          status,
          rewardDays: REFERRAL_REWARD_DAYS,
          deviceId: input.deviceId ?? null,
          flaggedReason: device.reason,
        },
      });
      return { ok: true, record: mapRecord(row) };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/unique|duplicate/i.test(msg)) {
        return { ok: false, error: "该账户已绑定邀请关系" };
      }
      throw err;
    }
  }

  const store = getMemoryStore();
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
  store.records.push(record);
  saveMemoryStore(store);
  return { ok: true, record };
}

export async function findPendingReferralForInvitee(
  inviteeId: string
): Promise<ReferralRecord | null> {
  const rows = await listReferralRecords({ inviteeId });
  return rows[0] ?? null;
}

export async function claimReferralRewardDelivery(input: {
  inviteeId: string;
  paymentId: string;
  ownerToken: string;
  now?: Date;
}): Promise<{ claimed: boolean; skipped?: string; record?: ReferralRecord }> {
  const now = input.now ?? new Date();

  if (shouldUsePrisma() && prisma) {
    const row = await prisma.referralRecord.findUnique({ where: { inviteeId: input.inviteeId } });
    if (!row) return { claimed: false, skipped: "无邀请关系" };
    if (row.status === "success") return { claimed: false, skipped: "已发放奖励", record: mapRecord(row) };
    if (row.status === "flagged") return { claimed: false, skipped: row.flaggedReason ?? "邀请关系已标记异常", record: mapRecord(row) };
    if (row.inviterId === input.inviteeId) return { claimed: false, skipped: "不能邀请自己", record: mapRecord(row) };
    if (row.paymentId && row.paymentId !== input.paymentId) {
      return { claimed: false, skipped: "邀请关系已绑定其他付款", record: mapRecord(row) };
    }

    const delivering = parseRewardingStatus(row.status);
    if (delivering && now.getTime() - delivering.startedAtMs < REFERRAL_REWARD_RECOVERY_MS) {
      return { claimed: false, skipped: "奖励发放处理中", record: mapRecord(row) };
    }
    if (row.status !== "pending" && !delivering) {
      return { claimed: false, skipped: "邀请奖励状态不可处理", record: mapRecord(row) };
    }

    const claimed = await prisma.referralRecord.updateMany({
      where: { id: row.id, status: row.status },
      data: {
        paymentId: row.paymentId ?? input.paymentId,
        status: rewardingStatus(input.ownerToken, now.getTime(), delivering?.plan),
        rewardDays: REFERRAL_INVITER_REWARD_DAYS,
      },
    });
    const authoritative = await prisma.referralRecord.findUnique({ where: { id: row.id } });
    if (!authoritative) return { claimed: false, skipped: "无邀请关系" };
    return claimed.count === 1
      ? { claimed: true, record: mapRecord(authoritative) }
      : { claimed: false, skipped: "奖励发放处理中", record: mapRecord(authoritative) };
  }

  const store = getMemoryStore();
  const record = store.records.find((item) => item.invitee_id === input.inviteeId);
  if (!record) return { claimed: false, skipped: "无邀请关系" };
  if (record.status === "success") return { claimed: false, skipped: "已发放奖励", record };
  if (record.status === "flagged") return { claimed: false, skipped: record.flagged_reason ?? "邀请关系已标记异常", record };
  if (record.inviter_id === input.inviteeId) return { claimed: false, skipped: "不能邀请自己", record };
  if (record.payment_id && record.payment_id !== input.paymentId) {
    return { claimed: false, skipped: "邀请关系已绑定其他付款", record };
  }
  const startedAtMs = record.reward_delivery_started_at ? new Date(record.reward_delivery_started_at).getTime() : 0;
  if (record.status === "rewarding" && now.getTime() - startedAtMs < REFERRAL_REWARD_RECOVERY_MS) {
    return { claimed: false, skipped: "奖励发放处理中", record };
  }
  if (record.status !== "pending" && record.status !== "rewarding") {
    return { claimed: false, skipped: "邀请奖励状态不可处理", record };
  }
  record.status = "rewarding";
  record.payment_id = record.payment_id ?? input.paymentId;
  record.reward_days = REFERRAL_INVITER_REWARD_DAYS;
  record.reward_delivery_token = input.ownerToken;
  record.reward_delivery_started_at = now.toISOString();
  saveMemoryStore(store);
  return { claimed: true, record };
}

export async function persistReferralRewardDeliveryPlan(input: {
  recordId: string;
  ownerToken: string;
  plan: ReferralRewardDeliveryPlan;
}): Promise<ReferralRecord> {
  if (shouldUsePrisma() && prisma) {
    const row = await prisma.referralRecord.findUnique({ where: { id: input.recordId } });
    if (!row) throw new Error("REFERRAL_RECORD_NOT_FOUND");
    const delivering = parseRewardingStatus(row.status);
    if (!delivering || delivering.token !== input.ownerToken) throw new Error("REFERRAL_REWARD_OWNER_MISMATCH");
    if (delivering.plan) return mapRecord(row);
    const plannedStatus = rewardingStatus(delivering.token, delivering.startedAtMs, input.plan);
    const planned = await prisma.referralRecord.updateMany({
      where: { id: row.id, status: row.status },
      data: { status: plannedStatus },
    });
    if (planned.count !== 1) throw new Error("REFERRAL_REWARD_PLAN_CONFLICT");
    const authoritative = await prisma.referralRecord.findUnique({ where: { id: row.id } });
    if (!authoritative) throw new Error("REFERRAL_RECORD_NOT_FOUND");
    return mapRecord(authoritative);
  }

  const store = getMemoryStore();
  const record = store.records.find((item) => item.id === input.recordId);
  if (!record) throw new Error("REFERRAL_RECORD_NOT_FOUND");
  if (record.status !== "rewarding" || record.reward_delivery_token !== input.ownerToken) {
    throw new Error("REFERRAL_REWARD_OWNER_MISMATCH");
  }
  if (!record.reward_delivery_plan) record.reward_delivery_plan = input.plan;
  saveMemoryStore(store);
  return record;
}

export async function completeReferralRewardDelivery(input: {
  recordId: string;
  ownerToken: string;
}): Promise<ReferralRecord> {
  if (shouldUsePrisma() && prisma) {
    const row = await prisma.referralRecord.findUnique({ where: { id: input.recordId } });
    if (!row) throw new Error("REFERRAL_RECORD_NOT_FOUND");
    const delivering = parseRewardingStatus(row.status);
    if (!delivering || delivering.token !== input.ownerToken) {
      throw new Error("REFERRAL_REWARD_OWNER_MISMATCH");
    }
    const completed = await prisma.referralRecord.updateMany({
      where: { id: row.id, status: row.status },
      data: { status: "success" },
    });
    if (completed.count !== 1) throw new Error("REFERRAL_REWARD_COMPLETE_CONFLICT");
    const authoritative = await prisma.referralRecord.findUnique({ where: { id: row.id } });
    if (!authoritative) throw new Error("REFERRAL_RECORD_NOT_FOUND");
    return mapRecord(authoritative);
  }

  const store = getMemoryStore();
  const record = store.records.find((item) => item.id === input.recordId);
  if (!record) throw new Error("REFERRAL_RECORD_NOT_FOUND");
  if (record.status !== "rewarding" || record.reward_delivery_token !== input.ownerToken) {
    throw new Error("REFERRAL_REWARD_OWNER_MISMATCH");
  }
  record.status = "success";
  record.reward_delivery_token = null;
  record.reward_delivery_started_at = null;
  record.reward_delivery_plan = null;
  saveMemoryStore(store);
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
  if (shouldUsePrisma() && prisma) {
    const paid = await prisma.referralRecord.findFirst({
      where: { paymentId: input.paymentId, status: "success" },
    });
    if (paid) return { applied: false, skipped: "同一付款记录已奖励", record: mapRecord(paid) };

    const row = await prisma.referralRecord.findUnique({ where: { inviteeId: input.inviteeId } });
    if (!row) return { applied: false, skipped: "无邀请关系" };
    if (row.status === "success") return { applied: false, skipped: "已发放奖励", record: mapRecord(row) };
    if (row.status === "flagged") {
      return {
        applied: false,
        skipped: row.flaggedReason ?? "邀请关系已标记异常",
        record: mapRecord(row),
      };
    }
    if (row.inviterId === input.inviteeId) {
      return { applied: false, skipped: "不能邀请自己", record: mapRecord(row) };
    }

    const claimed = await prisma.referralRecord.updateMany({
      where: { id: row.id, status: "pending" },
      data: {
        paymentId: input.paymentId,
        status: "success",
        rewardDays: REFERRAL_REWARD_DAYS,
      },
    });
    const authoritative = await prisma.referralRecord.findUnique({ where: { id: row.id } });
    if (!authoritative) return { applied: false, skipped: "无邀请关系" };
    if (claimed.count !== 1) {
      return { applied: false, skipped: "已发放奖励", record: mapRecord(authoritative) };
    }
    return { applied: true, record: mapRecord(authoritative) };
  }

  const store = getMemoryStore();
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
  saveMemoryStore(store);
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

/** Test helper: reset in-memory store. */
export function __resetReferralMemoryForTests(): void {
  memoryStore = emptyStore();
}
