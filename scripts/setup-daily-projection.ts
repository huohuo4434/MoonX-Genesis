import { loadProductionEnv } from "./load-env";

loadProductionEnv();
async function main() {
  const { ensureProjectionBucket } = await import("../lib/research/daily-candle-projection-storage.server");
  if (process.argv.includes("--setup")) {
    await ensureProjectionBucket();
    console.log("PRIVATE_PROJECTION_BUCKET_READY");
  }
  if (process.argv.includes("--run")) {
    const { refreshAllDailyProjections } = await import("../lib/research/daily-candle-projection.server");
    const result = await refreshAllDailyProjections();
    console.log(JSON.stringify(result));
    if (!result.ok) process.exitCode = 1;
  }
}
main().catch(() => { console.error("DAILY_PROJECTION_SETUP_FAILED"); process.exitCode = 1; });
