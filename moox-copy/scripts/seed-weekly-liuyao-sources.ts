/**
 * Seed / upsert the 6 canonical weekly Liu Yao sources (non-destructive).
 * Usage: npx tsx scripts/seed-weekly-liuyao-sources.ts
 */
import { loadProductionEnv } from "./load-env";
loadProductionEnv();

async function main() {
  const { ensureCanonicalWeeklySourcesInDb } = await import("../lib/weekly-source/store");
  const { CANONICAL_WEEKLY_LIUYAO_SOURCES } = await import("../lib/weekly-source/canonical-six");
  const result = await ensureCanonicalWeeklySourcesInDb();
  console.log(
    JSON.stringify(
      {
        ok: true,
        ...result,
        ids: CANONICAL_WEEKLY_LIUYAO_SOURCES.map((s) => ({
          id: s.id,
          marketCode: s.marketCode,
          movingLines: s.movingLines,
          periodStart: s.periodStart,
        })),
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
});
