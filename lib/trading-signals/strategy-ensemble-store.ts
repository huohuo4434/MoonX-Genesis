import { prisma } from "@/lib/prisma";
import { ensureUnifiedLiveAccount, recordUnifiedLiveEvents } from "@/lib/trading-signals/unified-live-store";
import type { StrategyEnsembleCandidate, StrategyEnsembleSnapshot } from "@/types/strategy-ensemble";

function signature(candidate: StrategyEnsembleCandidate) {
  return `${candidate.sleeve}|${candidate.symbol}|${candidate.side}|${Math.round(candidate.confidence / 5) * 5}|${candidate.forecastDate}`;
}

export async function persistStrategyEnsembleSnapshot(snapshot: StrategyEnsembleSnapshot, ownerKey = "official") {
  const ensured = await ensureUnifiedLiveAccount({ ownerKey, accountScope: ownerKey === "official" ? "OFFICIAL" : "MEMBER" });
  if (!ensured.ok) return { ok: false as const, migrationRequired: true, written: 0 };
  if (!prisma) return { ok: false as const, migrationRequired: true, written: 0 };

  const recentSince = new Date(Date.now() - 60 * 60_000);
  const recent = await prisma.mooxUnifiedLiveEvent.findMany({
    where: { accountId: ensured.account.id, code: "STRATEGY_ENSEMBLE_SIGNAL", createdAt: { gte: recentSince } },
    orderBy: { createdAt: "desc" },
    take: 300,
  }).catch(() => []);
  const recentSignatures = new Set<string>();
  for (const row of recent) {
    try {
      const parsed = JSON.parse(row.detail) as StrategyEnsembleCandidate;
      recentSignatures.add(signature(parsed));
    } catch {}
  }

  const fresh = snapshot.actionable.filter((item) => !item.researchOnly && !recentSignatures.has(signature(item)));
  if (!fresh.length) return { ok: true as const, migrationRequired: false, written: 0 };
  await recordUnifiedLiveEvents(ownerKey, fresh.map((item) => ({
    code: "STRATEGY_ENSEMBLE_SIGNAL",
    severity: "WARN",
    symbol: item.symbol,
    detail: JSON.stringify(item),
  })));
  return { ok: true as const, migrationRequired: false, written: fresh.length };
}

export async function approveStrategyEnsembleCandidate(candidate: StrategyEnsembleCandidate, ownerKey = "official") {
  const ensured = await ensureUnifiedLiveAccount({ ownerKey, accountScope: ownerKey === "official" ? "OFFICIAL" : "MEMBER" });
  if (!ensured.ok) return { ok: false as const, migrationRequired: true };
  await recordUnifiedLiveEvents(ownerKey, [{
    code: "STRATEGY_ENSEMBLE_APPROVED",
    severity: "WARN",
    symbol: candidate.symbol,
    detail: JSON.stringify({ ...candidate, approvedAt: new Date().toISOString(), execution: "ADMIN_CONFIRMATION_REQUIRED" }),
  }]);
  return { ok: true as const, migrationRequired: false };
}

export async function listStrategyEnsembleHistory(ownerKey = "official", take = 200) {
  if (!prisma) return [];
  const account = await prisma.mooxUnifiedLiveAccount.findUnique({ where: { ownerKey } }).catch(() => null);
  if (!account) return [];
  const rows = await prisma.mooxUnifiedLiveEvent.findMany({
    where: { accountId: account.id, code: { in: ["STRATEGY_ENSEMBLE_SIGNAL", "STRATEGY_ENSEMBLE_APPROVED"] } },
    orderBy: { createdAt: "desc" },
    take,
  }).catch(() => []);
  return rows.map((row) => {
    let payload: unknown = row.detail;
    try { payload = JSON.parse(row.detail); } catch {}
    return { id: row.id, code: row.code, symbol: row.symbol, createdAt: row.createdAt.toISOString(), payload };
  });
}
