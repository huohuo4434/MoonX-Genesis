/**
 * Single entry point for all MoonX curated research content.
 *
 * Components and `lib/data/*` accessors MUST call `loadMoonXResearch()` —
 * never import `content/moonx/*.json` directly.
 *
 * Uses Node filesystem APIs — only import from Server Components,
 * Route Handlers, or Node scripts (never from `"use client"` modules).
 */
import { readFileSync, readdirSync, existsSync } from "fs";
import path from "path";
import { MoonXDocumentSchema } from "./schema";
import { calculateWeightedResearchScore, normalizeScenarioWeights } from "./score-engine";
import { resolveWatchlistRating, scoreToRatingLabel, computeImpliedMarketCap } from "./rating-engine";
import type { MoonXDocument, MoonXLoadError, MoonXProcessedAsset, MoonXProcessedDocument } from "./types";

const CONTENT_DIR = path.join(process.cwd(), "content", "moonx");
const LATEST_PATH = path.join(CONTENT_DIR, "latest.json");
const HISTORY_DIR = path.join(CONTENT_DIR, "history");

let cache: MoonXProcessedDocument | null = null;
let cacheMtimeMs: number | null = null;

function countHistorySnapshots(): number {
  if (!existsSync(HISTORY_DIR)) return 0;
  return readdirSync(HISTORY_DIR).filter((name) => name.endsWith(".json")).length;
}

function formatZodIssues(error: { issues: { path: PropertyKey[]; message: string }[] }): string[] {
  return error.issues.map((issue) => {
    const pathLabel = issue.path.length > 0 ? issue.path.map(String).join(".") : "(root)";
    return `${pathLabel}: ${issue.message}`;
  });
}

export function parseMoonXDocument(raw: unknown): { ok: true; data: MoonXDocument } | { ok: false; error: MoonXLoadError } {
  const parsed = MoonXDocumentSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "MoonX research content failed schema validation.",
        issues: formatZodIssues(parsed.error),
      },
    };
  }
  return { ok: true, data: parsed.data };
}

function processDocument(doc: MoonXDocument, sourceFile: string): MoonXProcessedDocument {
  const assets: MoonXProcessedAsset[] = doc.assets.map((asset) => {
    const normalizedScenarioWeights = normalizeScenarioWeights(asset.scenarioWeights);
    const calculatedScore = calculateWeightedResearchScore(asset.frameworkFactors, {
      rawScore: asset.rawScore,
      direction: asset.direction,
    });
    const ratingLabel = scoreToRatingLabel(calculatedScore);

    let activeWatchlistRating: string | undefined;
    let activeWatchlistRatingLabel = asset.strategicWatchlistSettings?.ratingLabel;
    let watchlist = asset.strategicWatchlistSettings;

    if (watchlist) {
      const resolved = resolveWatchlistRating(watchlist);
      activeWatchlistRating = resolved.rating;
      activeWatchlistRatingLabel = resolved.ratingLabel;

      const implied = computeImpliedMarketCap(watchlist.ipoPrice, watchlist.totalShares);
      watchlist = {
        ...watchlist,
        impliedMarketCap: implied,
      };
    }

    return {
      ...asset,
      scenarioWeights: normalizedScenarioWeights,
      strategicWatchlistSettings: watchlist,
      calculatedScore,
      ratingLabel,
      normalizedScenarioWeights,
      activeWatchlistRating,
      activeWatchlistRatingLabel,
    };
  });

  const marketThemes = (doc.marketThemes ?? []).map((theme) => {
    const normalizedScenarioWeights = normalizeScenarioWeights(theme.scenarioWeights);
    const calculatedScore = calculateWeightedResearchScore(theme.frameworkFactors, {
      direction: theme.direction,
    });
    const ratingLabel = scoreToRatingLabel(calculatedScore);
    return {
      ...theme,
      normalizedScenarioWeights,
      calculatedScore,
      ratingLabel,
    };
  });

  return {
    version: doc.version,
    snapshotId: doc.snapshotId,
    researchDate: doc.researchDate,
    lastUpdated: doc.lastUpdated,
    status: doc.status,
    statusLabel: doc.statusLabel,
    dataType: doc.dataType,
    dataSourceDisclosure: doc.dataSourceDisclosure,
    mainConclusion: doc.mainConclusion,
    riskDisclaimer: doc.riskDisclaimer,
    assets,
    marketThemes,
    timeline: doc.timeline,
    meta: {
      assetCount: assets.length,
      historySnapshotCount: countHistorySnapshots(),
      sourceFile,
      validationStatus: "valid",
    },
  };
}

/**
 * Load, validate, normalize, and score the current MoonX research document.
 * Throws a clear Error when content is missing or invalid.
 */
export function loadMoonXResearch(options?: { forceReload?: boolean }): MoonXProcessedDocument {
  if (!existsSync(LATEST_PATH)) {
    throw new Error(
      `[moonx] Missing content file: content/moonx/latest.json. Create it and run npm run moonx:validate.`
    );
  }

  const statMtime = (() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("fs") as typeof import("fs");
      return fs.statSync(LATEST_PATH).mtimeMs;
    } catch {
      return null;
    }
  })();

  if (!options?.forceReload && cache && cacheMtimeMs === statMtime) {
    return cache;
  }

  let rawText: string;
  try {
    rawText = readFileSync(LATEST_PATH, "utf8");
  } catch (error) {
    throw new Error(`[moonx] Failed to read content/moonx/latest.json: ${String(error)}`);
  }

  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch (error) {
    throw new Error(`[moonx] Invalid JSON in content/moonx/latest.json: ${String(error)}`);
  }

  const result = parseMoonXDocument(json);
  if (!result.ok) {
    const detail = result.error.issues?.map((i) => `  - ${i}`).join("\n") ?? result.error.message;
    throw new Error(`[moonx] ${result.error.message}\n${detail}`);
  }

  const processed = processDocument(result.data, "content/moonx/latest.json");
  cache = processed;
  cacheMtimeMs = statMtime;
  return processed;
}

/** Async wrapper matching the existing `lib/data/*` accessor style. */
export async function loadMoonXResearchAsync(options?: { forceReload?: boolean }): Promise<MoonXProcessedDocument> {
  return loadMoonXResearch(options);
}

export function getMoonXAsset(id: string): MoonXProcessedAsset | undefined {
  return loadMoonXResearch().assets.find((asset) => asset.id === id);
}

export async function getMoonXAssetAsync(id: string): Promise<MoonXProcessedAsset | undefined> {
  return getMoonXAsset(id);
}

export function getMoonXContentPaths() {
  return { contentDir: CONTENT_DIR, latestPath: LATEST_PATH, historyDir: HISTORY_DIR };
}

/** Clear the in-memory cache (used by scripts / tests). */
export function clearMoonXCache(): void {
  cache = null;
  cacheMtimeMs = null;
}
