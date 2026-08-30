import "server-only";

import { prisma } from "@/lib/prisma";
import {
  registerQimenShadowCandidate,
  verifyQimenShadowReadingRow,
} from "@/lib/research/qimen-shadow-store";
import { planQimenShadowReadingPair } from "@/lib/research/qimen-shadow-reading-pair-core";

const PAIR_SCAN_LIMIT = 200;
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

export async function pairFutureQimenShadowReadings(serverNow = new Date()): Promise<QimenShadowPairingResult[]> {
  const db = prisma;
  if (!db) throw new Error("未配置数据库。");
  const rows = await db.qimenShadowReading.findMany({
    where: {
      decisionAt: {
        gt: serverNow,
        lte: new Date(serverNow.getTime() + PAIR_LOOKAHEAD_MS),
      },
    },
    orderBy: [{ decisionAt: "asc" }, { createdAt: "asc" }],
    take: PAIR_SCAN_LIMIT,
  });
  const grouped = new Map<string, typeof rows>();
  for (const row of rows) grouped.set(row.studyKey, [...(grouped.get(row.studyKey) ?? []), row]);
  const results: QimenShadowPairingResult[] = [];
  for (const [studyKey, groupRows] of grouped) {
    try {
      const readings = groupRows.map(verifyQimenShadowReadingRow);
      const plan = planQimenShadowReadingPair(readings);
      if (plan.status !== "READY") {
        results.push(plan);
        continue;
      }
      const result = await registerQimenShadowCandidate(plan.candidate, "AUTOMATION:qimen-reading-pairer", serverNow);
      results.push({ studyKey, candidateId: plan.candidateId, status: result.created ? "CREATED" : "UNCHANGED" });
    } catch (error) {
      results.push({ studyKey, status: "FAILED", reason: safeReason(error) });
    }
  }
  return results;
}
