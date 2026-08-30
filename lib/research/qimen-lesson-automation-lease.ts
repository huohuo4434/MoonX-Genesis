import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const AUTOMATION_LEASE_ID = "process-lessons:qimen-shadow-v1";
export const QIMEN_STORE_WRITE_LEASE_TTL_MS = 420_000;
const MAX_LEASE_TTL_MS = 600_000;

async function acquireLease(input: { leaseId: string; owner: string; ttlMs: number }): Promise<boolean> {
  const db = prisma;
  if (!db) return false;
  const ttlMs = Math.max(5_000, Math.min(MAX_LEASE_TTL_MS, Math.trunc(input.ttlMs)));
  const rows = await db.$queryRaw<Array<{ owner: string }>>(Prisma.sql`
    INSERT INTO "QimenLessonAutomationLease" ("id", "owner", "expiresAt", "updatedAt")
    VALUES (
      ${input.leaseId},
      ${input.owner},
      CURRENT_TIMESTAMP + (${ttlMs} * INTERVAL '1 millisecond'),
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("id") DO UPDATE
      SET "owner" = EXCLUDED."owner",
          "expiresAt" = EXCLUDED."expiresAt",
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "QimenLessonAutomationLease"."expiresAt" <= CURRENT_TIMESTAMP
    RETURNING "owner"
  `);
  return rows[0]?.owner === input.owner;
}

async function releaseLease(leaseId: string, owner: string): Promise<void> {
  const db = prisma;
  if (!db) return;
  await db.$executeRaw(Prisma.sql`
    DELETE FROM "QimenLessonAutomationLease"
    WHERE "id" = ${leaseId} AND "owner" = ${owner}
  `);
}

export async function acquireQimenLessonAutomationLease(input: {
  owner: string;
  ttlMs: number;
}): Promise<boolean> {
  return acquireLease({ leaseId: AUTOMATION_LEASE_ID, ...input });
}

export async function releaseQimenLessonAutomationLease(owner: string): Promise<void> {
  return releaseLease(AUTOMATION_LEASE_ID, owner);
}

export async function acquireQimenStoreWriteLease(input: {
  storeId: "master-intelligence" | "teacher-knowledge";
  owner: string;
  ttlMs?: number;
}): Promise<boolean> {
  return acquireLease({ leaseId: `qimen-json-store:${input.storeId}:v1`, owner: input.owner, ttlMs: input.ttlMs ?? QIMEN_STORE_WRITE_LEASE_TTL_MS });
}

export async function renewQimenStoreWriteLease(input: {
  storeId: "master-intelligence" | "teacher-knowledge";
  owner: string;
  ttlMs?: number;
}): Promise<boolean> {
  const db = prisma;
  if (!db) return false;
  const ttlMs = Math.max(5_000, Math.min(MAX_LEASE_TTL_MS, Math.trunc(input.ttlMs ?? QIMEN_STORE_WRITE_LEASE_TTL_MS)));
  const rows = await db.$queryRaw<Array<{ owner: string }>>(Prisma.sql`
    UPDATE "QimenLessonAutomationLease"
    SET "expiresAt" = CURRENT_TIMESTAMP + (${ttlMs} * INTERVAL '1 millisecond'),
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${`qimen-json-store:${input.storeId}:v1`}
      AND "owner" = ${input.owner}
      AND "expiresAt" > CURRENT_TIMESTAMP
    RETURNING "owner"
  `);
  return rows[0]?.owner === input.owner;
}

export async function releaseQimenStoreWriteLease(
  storeId: "master-intelligence" | "teacher-knowledge",
  owner: string,
): Promise<void> {
  return releaseLease(`qimen-json-store:${storeId}:v1`, owner);
}
