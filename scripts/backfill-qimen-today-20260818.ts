/**
 * One-time V7.20.1 backfill for the missing 2026-08-18 Qimen daily evidence.
 *
 * --dry-run: pure weekly->daily generation + Qimen overlay, no DB writes.
 * --write: append a new LOCKED version when today's latest locked/published row
 *          lacks Qimen evidence. Existing published/locked versions are never
 *          modified or deleted in place.
 */
import {
  CORE_DAILY_MARKETS,
  generateCoreMarketsFromWeeklyPure,
} from "@/lib/forecasts/daily-pipeline";
import { applyQimenFirstToGeneratedDaily } from "@/lib/forecasts/qimen-first-policy";
import type { GeneratedDailyForecastRecord } from "@/lib/weekly-source/types";

const TARGET_DATE = "2026-08-18";
const WRITE = process.argv.includes("--write");
const pureRows = generateCoreMarketsFromWeeklyPure(TARGET_DATE, "LOCKED");
const pureByMarket = new Map(pureRows.map((row) => [row.marketCode.toUpperCase(), row] as const));

function hasQimenEvidence(row: GeneratedDailyForecastRecord | null): boolean {
  return Boolean(
    row?.qimenEvidence &&
      row.qimenEvidence.includes("奇门主判=") &&
      row.qimenEvidence.includes("金融用神=") &&
      row.qimenEvidence.includes("用神依据=")
  );
}

function qimenize(row: GeneratedDailyForecastRecord): GeneratedDailyForecastRecord {
  return applyQimenFirstToGeneratedDaily(row, {
    liuyaoDirection: row.liuyaoEvidence,
    previousQimenEvidence: row.qimenEvidence,
  });
}

async function main() {
  console.log(`QIMEN TODAY BACKFILL target=${TARGET_DATE} mode=${WRITE ? "WRITE" : "DRY_RUN"}`);

  if (!WRITE) {
    for (const market of CORE_DAILY_MARKETS) {
      const source = pureByMarket.get(market);
      if (!source) {
        console.log(`${market}: SKIP no weekly source`);
        continue;
      }
      const next = qimenize(source);
      console.log(
        `${market}: ${next.direction} | ${String(next.qimenEvidence ?? "").split("；").slice(0, 4).join("；")}`
      );
    }
    console.log("TODAY QIMEN BACKFILL DRY RUN PASSED");
    return;
  }

  const {
    getLatestGeneratedDailyForMarketDate,
    upsertGeneratedDaily,
  } = await import("@/lib/weekly-source/store");

  let created = 0;
  let already = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  for (const market of CORE_DAILY_MARKETS) {
    const latest = await getLatestGeneratedDailyForMarketDate(market, TARGET_DATE).catch(() => null);
    if (hasQimenEvidence(latest)) {
      console.log(`${market}: EXISTING_QIMEN ${latest?.id}`);
      already += 1;
      continue;
    }

    const base = latest ?? pureByMarket.get(market) ?? null;
    if (!base) {
      console.log(`${market}: SKIP no daily/weekly source`);
      skipped += 1;
      continue;
    }

    const qimenized = qimenize(base);
    const version = latest ? latest.version + 1 : base.version;
    const next: GeneratedDailyForecastRecord = {
      ...qimenized,
      id: `GDF-${market}-${TARGET_DATE.replace(/-/g, "")}-V${version}`,
      marketCode: market,
      forecastDate: TARGET_DATE,
      version,
      previousVersionId: latest?.id ?? base.previousVersionId ?? null,
      status: "LOCKED",
      generatedAt: now,
      publishedAt: now,
      lockedAt: now,
      revisionReason: [
        "2026-08-18奇门日盘补录",
        qimenized.revisionReason,
      ].filter(Boolean).join("；"),
    };

    const result = await upsertGeneratedDaily(next);
    console.log(`${market}: ${result.created ? "CREATED" : "UPSERTED"} ${result.record.id}`);
    if (result.created) created += 1;
    else already += 1;
  }

  console.log(`TODAY QIMEN BACKFILL WRITE FINISHED created=${created} existing=${already} skipped=${skipped}`);
}

main().catch((error) => {
  console.error("TODAY QIMEN BACKFILL FAILED", error);
  process.exitCode = 1;
});
