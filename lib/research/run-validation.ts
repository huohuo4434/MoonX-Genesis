/**
 * Runs MoonX content validation once at server startup (development only).
 * Never throws — a bad optional field must not take pages down.
 */
import { loadMoonXResearch } from "@/lib/moonx/load-research";

let hasRun = false;

export async function runResearchDataValidation(): Promise<void> {
  if (hasRun) return;
  hasRun = true;

  try {
    const doc = loadMoonXResearch({ forceReload: true });
    // eslint-disable-next-line no-console
    console.log(
      `[moonx:research-data] Validation passed — version ${doc.version}, ${doc.meta.assetCount} assets, ${doc.meta.historySnapshotCount} history snapshots.`
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[moonx:research-data] Validation failed (pages will still attempt to render):", error);
  }
}
