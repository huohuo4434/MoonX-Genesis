/** Public-market read + offline replay only. No persistence/API/auth/trading writes. */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { loadKeyDateDaily } from "../lib/market-data/key-date-daily.server";
import { analyzeChanStructure } from "../lib/trading-signals/chan-structure-core";
import { czscInput, validateCzscSnapshot } from "../lib/research/czsc-research-contract";

async function main() {
  const python = process.argv[2];
  if (!python) throw new Error("Usage: node --conditions=react-server --import tsx scripts/compare-czsc-research.ts <python-path>");
  const directory = resolve(".moox-workbench", `czsc-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  mkdirSync(directory, { recursive: true });
  const summary = [];
  for (const asset of ["btc", "eth", "tsla", "sandisk"]) {
    try {
      const data = await loadKeyDateDaily(asset);
      const input = czscInput(data);
      const path = resolve(directory, `${asset}-input.json`), output = resolve(directory, `${asset}-czsc.json`);
      writeFileSync(path, JSON.stringify(input), { flag: "wx" });
      const run = spawnSync(python, ["tools/czsc-research/analyze.py", path, output], { encoding: "utf8", timeout: 60000 });
      if (run.status !== 0) throw new Error("CZSC_WORKER_FAILED");
      const report = await validateCzscSnapshot(JSON.parse(readFileSync(output, "utf8")), data);
      const legacy = analyzeChanStructure(data.bars);
      const row = { asset, source: data.source, asOf: data.asOf, bars: data.bars.length,
        legacyStrokes: legacy.strokes.length, legacyZones: legacy.zones.length,
        czscStrokes: report.strokes.length, czscZones: report.zones.length,
        replayRevisions: report.replay.revisions, profitBacktested: false, tradingEligible: false };
      summary.push(row);
      console.log(JSON.stringify(row));
    } catch (error) {
      summary.push({ asset, error: error instanceof Error ? error.message : "RESEARCH_FAILED" });
      console.log(JSON.stringify(summary.at(-1)));
    }
  }
  writeFileSync(resolve(directory, "comparison.json"), JSON.stringify(summary, null, 2), { flag: "wx" });
  console.log(`Research artifacts: ${directory}`);
  if (summary.some(r => "error" in r)) process.exitCode = 1;
}
void main().catch(() => { console.error("CZSC_RESEARCH_FAILED"); process.exitCode = 1; });
