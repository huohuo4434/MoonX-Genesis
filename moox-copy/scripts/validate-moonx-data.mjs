/**
 * npm run moonx:validate
 * Validates content/moonx/latest.json (+ optional history snapshots)
 * against the MoonX Zod schema and additional integrity rules.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const latestPath = path.join(root, "content", "moonx", "latest.json");
const historyDir = path.join(root, "content", "moonx", "history");

function fail(message, issues = []) {
  console.error("\n✕ MoonX validation FAILED\n");
  console.error(message);
  for (const issue of issues) console.error(`  - ${issue}`);
  console.error("");
  process.exit(1);
}

function loadTsModule(relativePath) {
  // Compile/load via tsx register when available.
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

async function main() {
  if (!existsSync(latestPath)) {
    fail(`Missing ${path.relative(root, latestPath)}`);
  }

  let raw;
  try {
    raw = JSON.parse(readFileSync(latestPath, "utf8"));
  } catch (error) {
    fail(`Invalid JSON in latest.json: ${error.message}`);
  }

  const { parseMoonXDocument } = await loadTsModule("lib/moonx/load-research.ts");
  const { calculateWeightedResearchScore, normalizeScenarioWeights } = await loadTsModule("lib/moonx/score-engine.ts");

  const parsed = parseMoonXDocument(raw);
  if (!parsed.ok) {
    fail(parsed.error.message, parsed.error.issues ?? []);
  }

  const doc = parsed.data;
  const issues = [];

  const ids = new Set();
  for (const asset of doc.assets) {
    if (ids.has(asset.id)) issues.push(`Duplicate asset id: ${asset.id}`);
    ids.add(asset.id);

    for (const dateField of [asset.researchDate, asset.lastUpdated, asset.chart?.forecastWindow?.start, asset.chart?.forecastWindow?.end]) {
      if (dateField && Number.isNaN(new Date(dateField).getTime())) {
        issues.push(`${asset.id}: invalid date "${dateField}"`);
      }
    }

    const total = asset.scenarioWeights.base + asset.scenarioWeights.bull + asset.scenarioWeights.bear;
    if (Math.abs(total - 100) > 0.01) {
      issues.push(`${asset.id}: scenarioWeights total ${total}, expected 100`);
    }

    for (const factor of asset.frameworkFactors) {
      if (factor.weight < 0 || factor.weight > 100) issues.push(`${asset.id}: factor ${factor.id} weight out of range`);
      if (factor.confidence < 0 || factor.confidence > 100) issues.push(`${asset.id}: factor ${factor.id} confidence out of range`);
      if (factor.directionScore < -100 || factor.directionScore > 100) {
        issues.push(`${asset.id}: factor ${factor.id} directionScore out of range`);
      }
    }

    const score = calculateWeightedResearchScore(asset.frameworkFactors, {
      rawScore: asset.rawScore,
      direction: asset.direction,
    });
    if (score < -100 || score > 100) issues.push(`${asset.id}: calculated score ${score} out of range`);

    for (const level of [...asset.supportLevels, ...asset.resistanceLevels, ...asset.targetLevels, ...asset.invalidationLevels]) {
      if (typeof level !== "number" || !Number.isFinite(level)) {
        issues.push(`${asset.id}: non-numeric level ${level}`);
      }
    }

    for (const locale of ["zhCN", "zhTW", "en"]) {
      if (!asset.localizedName?.[locale]?.trim()) issues.push(`${asset.id}: missing localizedName.${locale}`);
      if (!asset.localizedSummary?.[locale]?.trim()) issues.push(`${asset.id}: missing localizedSummary.${locale}`);
    }

    if (asset.chart) {
      const progresses = asset.chart.historicalWaypoints.map((w) => w.progress);
      // Candle uniqueness is enforced at generation time by count clamp; here we
      // check waypoint progress uniqueness as a proxy for path integrity.
      if (new Set(progresses).size !== progresses.length) {
        issues.push(`${asset.id}: duplicate historical waypoint progress values`);
      }
      for (const key of ["base", "bull", "bear"]) {
        const wps = asset.chart.scenarios[key].waypoints.map((w) => w.progress);
        if (new Set(wps).size !== wps.length) {
          issues.push(`${asset.id}: duplicate ${key} waypoint progress values`);
        }
      }
    }

    if (asset.strategicWatchlistSettings?.listingStatus === "preIPO" && asset.strategicWatchlistSettings.listingDate) {
      // Allowed but warn — preIPO with a listing date is unusual.
      console.warn(`! ${asset.id}: preIPO listingStatus with listingDate set (${asset.strategicWatchlistSettings.listingDate})`);
    }
  }

  const timelineIds = new Set();
  for (const event of doc.timeline) {
    if (timelineIds.has(event.id)) issues.push(`Duplicate timeline id: ${event.id}`);
    timelineIds.add(event.id);
  }

  // History snapshots
  let historyCount = 0;
  const historyVersions = new Map();
  if (existsSync(historyDir)) {
    const files = readdirSync(historyDir).filter((f) => f.endsWith(".json"));
    historyCount = files.length;
    for (const file of files) {
      const full = path.join(historyDir, file);
      try {
        const hist = JSON.parse(readFileSync(full, "utf8"));
        const histParsed = parseMoonXDocument(hist);
        if (!histParsed.ok) {
          issues.push(`History ${file}: ${histParsed.error.issues?.join("; ") ?? histParsed.error.message}`);
          continue;
        }
        const version = histParsed.data.version;
        if (historyVersions.has(version)) {
          issues.push(`Duplicate prediction version "${version}" in ${file} and ${historyVersions.get(version)}`);
        } else {
          historyVersions.set(version, file);
        }
      } catch (error) {
        issues.push(`History ${file}: ${error.message}`);
      }
    }
  }

  // Smoke: normalize weights
  for (const asset of doc.assets) {
    const n = normalizeScenarioWeights(asset.scenarioWeights);
    if (n.base + n.bull + n.bear !== 100) {
      issues.push(`${asset.id}: normalizeScenarioWeights did not total 100`);
    }
  }

  for (const theme of doc.marketThemes ?? []) {
    const total = theme.scenarioWeights.base + theme.scenarioWeights.bull + theme.scenarioWeights.bear;
    if (Math.abs(total - 100) > 0.01) {
      issues.push(`${theme.id}: scenarioWeights total ${total}, expected 100`);
    }
    for (const factor of theme.frameworkFactors) {
      if (factor.weight < 0 || factor.weight > 100) issues.push(`${theme.id}: factor ${factor.id} weight out of range`);
      if (factor.confidence < 0 || factor.confidence > 100) issues.push(`${theme.id}: factor ${factor.id} confidence out of range`);
    }
    const score = calculateWeightedResearchScore(theme.frameworkFactors, { direction: theme.direction });
    if (score < -100 || score > 100) issues.push(`${theme.id}: calculated score ${score} out of range`);
    for (const assetId of theme.linkedWatchlistAssetIds) {
      if (!doc.assets.some((a) => a.id === assetId)) {
        issues.push(`${theme.id}: linkedWatchlistAssetIds references missing asset "${assetId}"`);
      }
    }
  }

  if (issues.length > 0) {
    fail(`${issues.length} integrity issue(s) found`, issues);
  }

  console.log("\n✓ MoonX validation PASSED\n");
  console.log(`  File:        content/moonx/latest.json`);
  console.log(`  Version:     ${doc.version}`);
  console.log(`  Snapshot:    ${doc.snapshotId}`);
  console.log(`  Assets:      ${doc.assets.length}`);
  console.log(`  Timeline:    ${doc.timeline.length}`);
  console.log(`  History:     ${historyCount} snapshot(s)`);
  console.log(`  Size:        ${statSync(latestPath).size.toLocaleString()} bytes`);
  console.log("");
}

main().catch((error) => {
  fail(error?.stack || String(error));
});
