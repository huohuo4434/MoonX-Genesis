/**
 * Membership change ledger (MembershipEvent).
 * Primary: Supabase Storage moonx-data/membership/events.json
 * Secondary: public.membership_events when migration applied.
 */
import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";

export type MembershipEventType =
  | "PAYMENT_APPROVED"
  | "REFERRAL_REWARD"
  | "ADMIN_ADJUSTMENT"
  | "DATA_REPAIR"
  | "REVOCATION";

export type MembershipEvent = {
  id: string;
  userId: string;
  userEmail?: string | null;
  eventType: MembershipEventType;
  source: string;
  sourceId: string;
  previousExpiresAt: string | null;
  newExpiresAt: string | null;
  daysChanged: number;
  operatorId: string | null;
  note: string | null;
  createdAt: string;
};

type Store = { version: 1; updatedAt: string; events: MembershipEvent[] };

const BUCKET = "moonx-data";
const FILE = "membership/events.json";

function newId(): string {
  return `mevt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

async function readStore(): Promise<Store> {
  const admin = getAdminClient();
  if (!admin) return { version: 1, updatedAt: new Date().toISOString(), events: [] };
  const { data, error } = await admin.storage.from(BUCKET).download(FILE);
  if (error || !data) return { version: 1, updatedAt: new Date().toISOString(), events: [] };
  try {
    const parsed = JSON.parse(await data.text()) as Store;
    return {
      version: 1,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch {
    return { version: 1, updatedAt: new Date().toISOString(), events: [] };
  }
}

async function writeStore(store: Store): Promise<void> {
  const admin = getAdminClient();
  if (!admin) throw new Error("服务未配置");
  const body: Store = {
    version: 1,
    updatedAt: new Date().toISOString(),
    events: store.events,
  };
  const { error } = await admin.storage.from(BUCKET).upload(FILE, JSON.stringify(body, null, 2), {
    contentType: "application/json",
    upsert: true,
  });
  if (error) throw new Error(error.message);
}

async function tryInsertSql(event: MembershipEvent): Promise<void> {
  const admin = getAdminClient();
  if (!admin) return;
  try {
    await admin.from("membership_events").upsert(
      {
        id: event.id,
        user_id: event.userId,
        user_email: event.userEmail ?? null,
        event_type: event.eventType,
        source: event.source,
        source_id: event.sourceId,
        previous_expires_at: event.previousExpiresAt,
        new_expires_at: event.newExpiresAt,
        days_changed: event.daysChanged,
        operator_id: event.operatorId,
        note: event.note,
        created_at: event.createdAt,
      },
      { onConflict: "id" }
    );
  } catch {
    /* table may not exist yet */
  }
}

/** True if this sourceId was already applied for the given event type. */
export async function hasMembershipEventForSource(
  eventType: MembershipEventType,
  sourceId: string
): Promise<boolean> {
  const store = await readStore();
  if (store.events.some((e) => e.eventType === eventType && e.sourceId === sourceId)) {
    return true;
  }
  const admin = getAdminClient();
  if (!admin) return false;
  try {
    const { data } = await admin
      .from("membership_events")
      .select("id")
      .eq("event_type", eventType)
      .eq("source_id", sourceId)
      .limit(1);
    return Boolean(data?.length);
  } catch {
    return false;
  }
}

export async function appendMembershipEvent(
  input: Omit<MembershipEvent, "id" | "createdAt"> & { id?: string; createdAt?: string }
): Promise<MembershipEvent> {
  const event: MembershipEvent = {
    id: input.id ?? newId(),
    userId: input.userId,
    userEmail: input.userEmail ?? null,
    eventType: input.eventType,
    source: input.source,
    sourceId: input.sourceId,
    previousExpiresAt: input.previousExpiresAt,
    newExpiresAt: input.newExpiresAt,
    daysChanged: input.daysChanged,
    operatorId: input.operatorId,
    note: input.note,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };

  const store = await readStore();
  if (
    store.events.some(
      (e) => e.eventType === event.eventType && e.sourceId === event.sourceId && event.sourceId
    )
  ) {
    return store.events.find(
      (e) => e.eventType === event.eventType && e.sourceId === event.sourceId
    )!;
  }

  store.events.unshift(event);
  // Keep a bounded history in storage JSON.
  store.events = store.events.slice(0, 5000);
  await writeStore(store);
  await tryInsertSql(event);
  return event;
}

export async function listMembershipEvents(options?: {
  userId?: string;
  limit?: number;
}): Promise<MembershipEvent[]> {
  const store = await readStore();
  let rows = store.events;
  if (options?.userId) rows = rows.filter((e) => e.userId === options.userId);
  rows = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return rows.slice(0, options?.limit ?? 200);
}

export async function latestMembershipEventForUser(
  userId: string
): Promise<MembershipEvent | null> {
  const rows = await listMembershipEvents({ userId, limit: 1 });
  return rows[0] ?? null;
}
