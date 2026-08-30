import "server-only";

import { prisma } from "@/lib/prisma";
import {
  registerQimenShadowCandidate,
  verifyQimenShadowReadingRow,
} from "@/lib/research/qimen-shadow-store";
import { planQimenShadowReadingPair } from "@/lib/research/qimen-shadow-reading-pair-core";

const PAIR_SCAN_LIMIT = 32;
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
  const rows = await db.qimenShadowReading.findMany({
    where: {
      decisionAt: {
        gt: scanStartedAt,
        lte: new Date(scanStartedAt.getTime() + PAIR_LOOKAHEAD_MS),
      },
    },
    orderBy: [{ decisionAt: "asc" }, { createdAt: "asc" }],
    take: PAIR_SCAN_LIMIT,
  });
  const grouped = new Map<string, typeof rows>();
  for (const row of rows) grouped.set(row.studyKey, [...(grouped.get(row.studyKey) ?? []), row]);
  const results: QimenShadowPairingResult[] = [];
  const groups = [...grouped.entries()];
  for (const [studyKey, groupRows] of groups.slice(0, PAIR_GROUP_LIMIT)) {
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
  if (groups.length > PAIR_GROUP_LIMIT) {
    results.push({
      studyKey: "PAIRER",
      status: "SKIPPED",
      reason: `PAIR_GROUP_LIMIT_REACHED:${groups.length - PAIR_GROUP_LIMIT}`,
    });
  }
  return results;
}
