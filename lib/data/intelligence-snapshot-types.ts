/**
 * Client-safe types and pure helpers for the Intelligence Snapshot UI.
 * Keep filesystem / MoonX loaders out of this file.
 */
import type { ForecastDirection } from "./demo-content";
import type { MoonXFrameworkName } from "./research-intelligence";

export type SnapshotStatus = "draft-pending-verification" | "verified" | "archived";

export interface SnapshotMetadata {
  snapshotDate: string;
  dataType: string;
  dataSourceDisclosure: string;
  status: SnapshotStatus;
  statusLabel: string;
  mainConclusion: string[];
}

export interface FrameworkEvidenceEntry {
  framework: MoonXFrameworkName;
  commentary: string;
}

export interface ObservationZone {
  label: string;
  range: string;
}

export interface AssetIntelligenceScores {
  bullish: number;
  bearish: number;
  neutral: number;
  agreement: number;
  evidence: number;
  confidence: number;
}

export interface AssetIntelligenceSnapshot {
  id: string;
  asset: string;
  symbol: string;
  currentView: string;
  summaryZh?: string;
  forecastWindow: { start: string; end: string };
  scores: AssetIntelligenceScores;
  shortView: string;
  keyLevelsSummary: string;
  trendPath: string[];
  keySupport?: string[];
  keyResistance?: string[];
  observationZones?: ObservationZone[];
  observationZonesNote?: string;
  frameworkEvidence: FrameworkEvidenceEntry[];
  conflictingView?: string;
  primaryRisk: string;
  verificationItems: string[];
}

export interface CrossAssetConsensus {
  mainConclusion: string;
  beforeWindow: string[];
  afterWindow: string[];
  caveat: string;
  strongestEvidence: string[];
  mainConflicts: string[];
}

export interface LongRangeTimelinePeriod {
  id: string;
  period: string;
  outlook: string;
}

export function getDominantDirection(scores: AssetIntelligenceScores): ForecastDirection {
  if (scores.bullish >= scores.bearish && scores.bullish >= scores.neutral) return "up";
  if (scores.bearish >= scores.bullish && scores.bearish >= scores.neutral) return "down";
  return "neutral";
}
