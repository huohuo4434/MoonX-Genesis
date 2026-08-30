import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  registerQimenShadowCandidate,
  verifyQimenShadowReadingRow,
} from "@/lib/research/qimen-shadow-store";
import { planQimenShadowReadingPair } from "@/lib/research/qimen-shadow-reading-pair-core";

const PAIR_GROUP_LIMIT = 8;
const PAIR_LOOKAHEAD_MS = 31 * 24 * 60 * 60_000;

export type QimenShadowPairingResult = {
  studyKey: string;
  status: "CREATED" | "UNCHANGED" | "WAITING" | "SKIPPED" | "FAILED";
  candidateId?: string;
  reason?: string;
};

function safeReason(error: unknown): string {
  return (error instanceof Error ? error.message : "UNKNOWN_ERROR").replace(/[\r\n\t]+/g, " ").slice(0, 240);
}

export async function pairFutureQimenShadowReadings(options: {
  scanStartedAt?: Date;
  deadlineMs: number;
  clock?: () => Date;
}): Promise<QimenShadowPairingResult[]> {
  const db = prisma;
  if (!db) throw new Error("未配置数据库。");
  if (!Number.isFinite(options.deadlineMs)) throw new Error("配对截止时间无效。");
  const clock = options.clock ?? (() => new Date());
  const scanStartedAt = options.scanStartedAt ?? clock();
  const lookaheadAt = new Date(scanStartedAt.getTime() + PAIR_LOOKAHEAD_MS);
  const completeGroups = await db.$queryRaw<Array<{ studyKey: string }>>(Prisma.sql`
    SELECT r."studyKey", MIN(r."decisionAt") AS first_decision
    FROM "QimenShadowReading" r
    WHERE r."decisionAt" > ${scanStartedAt}
      AND r."decisionAt" <= ${lookaheadAt}
      AND NOT EXISTS (
        SELECT 1
        FROM "QimenShadowCandidate" c
        WHERE c."studyKey" = r."studyKey"
      )
    GROUP BY r."studyKey"
    HAVING COUNT(*) FILTER (WHERE r."schoolId" = 'OBJECT_YONGSHEN') >= 1
       AND COUNT(*) FILTER (WHERE r."schoolId" = 'DIRECTIONAL_PALACE') >= 1
    ORDER BY first_decision ASC, r."studyKey" ASC
    LIMIT ${PAIR_GROUP_LIMIT}
  `);
  const studyKeys = completeGroups.map((row) => row.studyKey);
  if (!studyKeys.length) return [];
  const rows = await db.qimenShadowReading.findMany({
    where: { studyKey: { in: studyKeys } },
    orderBy: [{ decisionAt: "asc" }, { createdAt: "asc" }],
  });
  const grouped = new Map<string, typeof rows>();
  for (const row of rows) grouped.set(row.studyKey, [...(grouped.get(row.studyKey) ?? []), row]);
  const results: QimenShadowPairingResult[] = [];
  const groups = studyKeys.map((studyKey) => [studyKey, grouped.get(studyKey) ?? []] as const);
  for (const [studyKey, groupRows] of groups) {
    if (clock().getTime() >= options.deadlineMs) {
      results.push({ studyKey, status: "SKIPPED", reason: "RUN_BUDGET_EXHAUSTED" });
      break;
    }
    try {
      const readings = groupRows.map(verifyQimenShadowReadingRow);
      const plan = planQimenShadowReadingPair(readings);
      if (plan.status !== "READY") {
        results.push(plan);
        continue;
      }
      const result = await registerQimenShadowCandidate(plan.candidate, "AUTOMATION:qimen-reading-pairer", { clock });
      results.push({ studyKey, candidateId: plan.candidateId, status: result.created ? "CREATED" : "UNCHANGED" });
    } catch (error) {
      results.push({ studyKey, status: "FAILED", reason: safeReason(error) });
    }
  }
  return results;
}
