/**
 * Adapters from MoonX processed research → existing UI data shapes.
 * Keeps React components on their current prop contracts while ensuring
 * every view is fed by `loadMoonXResearch()`.
 */
import type { AssetChartScenario, ForecastScenarioId } from "@/types/forecast-chart";
import type { MoonXFrameworkName } from "@/lib/data/research-intelligence";
import type {
  AssetIntelligenceSnapshot,
  SnapshotMetadata,
} from "@/lib/data/intelligence-snapshot-types";
import type { TimelineEvent, WatchlistEntry, WatchlistRating, WatchlistStatus } from "@/types/research";
import type { MoonXLocalizedText, MoonXProcessedAsset, MoonXProcessedDocument } from "./types";
import { normalizeZhCopy } from "./text-normalize";

const KNOWN_FRAMEWORKS = new Set<string>([
  "Oracle Six Yao",
  "Oracle Six Yao Timing",
  "Cycle Structure",
  "Gann Structure",
  "Harmonic Structure",
  "Market Flow & Risk",
  "Market Risk and Sentiment",
  "Macro Capital Cycle",
  "Macro Liquidity Rotation",
  "Altcoin Risk Appetite",
  "ETF and Stablecoin Flows",
  "Technical Structure",
]);

function en(text: MoonXLocalizedText | undefined, fallback = ""): string {
  return text?.en ?? fallback;
}

function zh(text: MoonXLocalizedText | undefined): string | undefined {
  return text?.zhCN;
}

function toFrameworkNames(names: string[]): MoonXFrameworkName[] {
  return names.filter((name): name is MoonXFrameworkName => KNOWN_FRAMEWORKS.has(name)) as MoonXFrameworkName[];
}

export function toSnapshotMetadata(doc: MoonXProcessedDocument): SnapshotMetadata {
  return {
    snapshotDate: doc.researchDate,
    dataType: zh(doc.dataType) ?? en(doc.dataType),
    dataTypeZh: zh(doc.dataType),
    dataSourceDisclosure: zh(doc.dataSourceDisclosure) ?? en(doc.dataSourceDisclosure),
    dataSourceDisclosureZh: zh(doc.dataSourceDisclosure),
    status: doc.status,
    statusLabel: (zh(doc.statusLabel) ?? en(doc.statusLabel)).replace(" — ", "｜"),
    statusLabelZh: zh(doc.statusLabel)?.replace(" — ", "｜"),
    mainConclusion: doc.mainConclusion.map((p) => zh(p) ?? en(p)),
    mainConclusionZh: doc.mainConclusion.map((p) => zh(p) ?? en(p)),
  };
}

export function toRiskDisclaimer(doc: MoonXProcessedDocument): string {
  return zh(doc.riskDisclaimer) ?? en(doc.riskDisclaimer);
}

export function toAssetIntelligenceSnapshot(asset: MoonXProcessedAsset): AssetIntelligenceSnapshot {
  const score = asset.calculatedScore;
  // Map -100…100 score into bullish/bearish/neutral presentation buckets.
  const bullish = Math.max(0, Math.min(100, Math.round(50 + score / 2)));
  const bearish = Math.max(0, Math.min(100, Math.round(50 - score / 2)));
  const neutral = Math.max(0, 100 - bullish - bearish);

  const supports = asset.supportLevels.map((n) => n.toLocaleString("en-US"));
  const resistances = asset.resistanceLevels.map((n) => n.toLocaleString("en-US"));

  return {
    id: asset.id,
    asset: en(asset.localizedName),
    assetZh: zh(asset.localizedName),
    symbol: asset.symbol,
    currentView: en(asset.localizedSummary),
    summaryZh: zh(asset.localizedSummary),
    forecastWindow: asset.chart?.forecastWindow ?? {
      start: asset.researchDate,
      end: asset.lastUpdated,
    },
    scores: {
      bullish,
      bearish,
      neutral,
      agreement: Math.round((asset.confidence + 50) / 1.5),
      evidence: asset.confidence,
      confidence: asset.confidence,
    },
    shortView: en(asset.shortView),
    shortViewZh: zh(asset.shortView),
    keyLevelsSummary: [
      supports.length ? `Support ${supports.slice(0, 2).join(" / ")}` : null,
      resistances.length ? `Resistance ${resistances.slice(0, 2).join(" / ")}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    keyLevelsSummaryZh: [
      supports.length ? `支撑位 ${supports.slice(0, 2).join(" / ")}` : null,
      resistances.length ? `压力位 ${resistances.slice(0, 2).join(" / ")}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    trendPath: asset.trendPath.map((t) => en(t)),
    trendPathZh: asset.trendPath.map((t) => zh(t) ?? en(t)),
    keySupport: supports.length ? supports : undefined,
    keyResistance: resistances.length ? resistances : undefined,
    frameworkEvidence: asset.frameworkFactors.map((factor) => ({
      framework: (KNOWN_FRAMEWORKS.has(factor.framework)
        ? factor.framework
        : "Macro Capital Cycle") as MoonXFrameworkName,
      commentary: en(factor.explanation),
      commentaryZh: zh(factor.explanation),
    })),
    primaryRisk: en(asset.riskConditions[0]) || "See research notes.",
    primaryRiskZh: zh(asset.riskConditions[0]) ?? en(asset.riskConditions[0]) ?? "请参阅研究说明。",
    verificationItems: asset.verificationChecklist.map((item) => en(item)),
    verificationItemsZh: asset.verificationChecklist.map((item) => zh(item) ?? en(item)),
  };
}

export function toAssetChartScenario(asset: MoonXProcessedAsset): AssetChartScenario | undefined {
  const chart = asset.chart;
  if (!chart) return undefined;

  const weights = asset.normalizedScenarioWeights;
  const levelLabel = (localized: MoonXLocalizedText) => ({
    label: en(localized),
    labelZh: zh(localized),
  });

  const buildScenario = (id: ForecastScenarioId) => {
    const path = chart.scenarios[id];
    return {
      id,
      label: id === "base" ? "Base Case" : id === "bull" ? "Bull Case" : "Bear Case",
      summary: en(path.summary),
      summaryZh: zh(path.summary),
      volatility: path.volatility,
      scenarioWeight: weights[id],
      logic: en(path.logic),
      logicZh: zh(path.logic),
      waypoints: path.waypoints,
    };
  };

  return {
    id: asset.id,
    asset: en(asset.localizedName),
    assetZh: zh(asset.localizedName),
    symbol: asset.symbol,
    chartTitle: en(chart.chartTitle),
    chartTitleZh: zh(chart.chartTitle),
    forecastWindow: chart.forecastWindow,
    referencePrice: chart.referencePrice,
    pricePrecision: chart.pricePrecision,
    historicalCandleCount: chart.historicalCandleCount,
    forecastCandleCount: chart.forecastCandleCount,
    seed: chart.seed,
    historicalWaypoints: chart.historicalWaypoints,
    historicalVolatility: chart.historicalVolatility,
    levels: chart.levels.map((level) => ({
      id: level.id,
      price: level.price,
      kind: level.kind,
      ...levelLabel(level.label),
    })),
    zones: chart.zones.map((zone) => ({
      id: zone.id,
      from: zone.from,
      to: zone.to,
      kind: zone.kind,
      label: en(zone.label),
      labelZh: zh(zone.label),
    })),
    turningWindows: chart.turningWindows.map((window_) => ({
      id: window_.id,
      label: en(window_.label),
      labelZh: zh(window_.label),
      startDate: window_.startDate,
      endDate: window_.endDate,
      note: window_.note ? en(window_.note) : undefined,
    })),
    scenarios: {
      base: buildScenario("base"),
      bull: buildScenario("bull"),
      bear: buildScenario("bear"),
    },
    relevantFrameworks: toFrameworkNames(asset.relevantFrameworks),
    currentView: en(asset.localizedSummary),
    currentViewZh: zh(asset.localizedSummary),
    mainSupport: en(asset.mainSupportLabel) || asset.supportLevels[0]?.toLocaleString("en-US") || "—",
    mainSupportZh: zh(asset.mainSupportLabel) ?? asset.supportLevels[0]?.toLocaleString("en-US") ?? "—",
    mainResistance: en(asset.mainResistanceLabel) || asset.resistanceLevels[0]?.toLocaleString("en-US") || "—",
    mainResistanceZh: zh(asset.mainResistanceLabel) ?? asset.resistanceLevels[0]?.toLocaleString("en-US") ?? "—",
    invalidationLevel: en(asset.invalidationLabel) || "—",
    invalidationLevelZh: zh(asset.invalidationLabel) ?? "—",
    nextTurningWindow: en(asset.nextTurningWindowLabel) || "—",
    nextTurningWindowZh: zh(asset.nextTurningWindowLabel) ?? "—",
    keyRisks: asset.riskConditions.map((r) => en(r)),
    keyRisksZh: asset.riskConditions.map((r) => zh(r) ?? en(r)),
    verificationChecklist: asset.verificationChecklist.map((v) => en(v)),
    verificationChecklistZh: asset.verificationChecklist.map((v) => zh(v) ?? en(v)),
  };
}

function mapWatchlistStatus(status: string): WatchlistStatus {
  switch (status) {
    case "pre-ipo-watch":
      return "pre-ipo-watch";
    case "ipo-strategic-watch":
      return "ipo-strategic-watch";
    case "high-volatility-watch":
      return "high-volatility-watch";
    default:
      return "active";
  }
}

function mapWatchlistRating(rating: string): WatchlistRating {
  if (rating === "bearish" || rating === "strong-bearish") return "bearish";
  if (rating === "neutral" || rating === "watch") return "neutral";
  return "bullish";
}

export function toWatchlistEntry(asset: MoonXProcessedAsset): WatchlistEntry | undefined {
  const settings = asset.strategicWatchlistSettings;
  if (!settings?.enabled) return undefined;

  return {
    id: asset.id,
    assetName: asset.localizedName,
    symbol: asset.symbol,
    rating: mapWatchlistRating(asset.activeWatchlistRating ?? settings.rating),
    ratingNote: asset.activeWatchlistRatingLabel,
    status: mapWatchlistStatus(settings.status),
    horizon: settings.horizon,
    mainTheme: settings.mainThemes,
    thesis: settings.thesis,
    risks: settings.risks,
    nextEvent: settings.nextEvent ?? { zhCN: "—", zhTW: "—", en: "—" },
    nextEventDate: settings.nextEventDate ?? undefined,
    researchAssetId: asset.id,
    meta: [
      settings.listingStatus !== "n/a"
        ? {
            labelKey: "watchlist.meta.market",
            value: {
              zhCN: settings.listingStatus === "preIPO" ? "上市前" : "已上市",
              zhTW: settings.listingStatus === "preIPO" ? "上市前" : "已上市",
              en: settings.listingStatus === "preIPO" ? "Pre-IPO" : "Listed",
            },
          }
        : null,
      settings.ipoPrice != null && settings.priceCurrency
        ? {
            labelKey: "watchlist.meta.ipoPrice",
            value: {
              zhCN: `${settings.ipoPrice} ${settings.priceCurrency}`,
              zhTW: `${settings.ipoPrice} ${settings.priceCurrency}`,
              en: `${settings.ipoPrice} ${settings.priceCurrency}`,
            },
          }
        : null,
      settings.listingDate
        ? {
            labelKey: "watchlist.meta.ipoDate",
            value: { zhCN: settings.listingDate, zhTW: settings.listingDate, en: settings.listingDate },
          }
        : null,
    ].filter((item): item is NonNullable<typeof item> => item !== null),
    warning: settings.warning,
  };
}

export function toTimelineEvents(doc: MoonXProcessedDocument): TimelineEvent[] {
  return [...doc.timeline]
    .map((event) => ({
      id: event.id,
      date: event.date,
      start: event.start,
      end: event.end,
      title: {
        zhCN: normalizeZhCopy(event.title.zhCN),
        zhTW: event.title.zhTW,
        en: event.title.en,
      },
      description: event.description
        ? {
            zhCN: normalizeZhCopy(event.description.zhCN),
            zhTW: event.description.zhTW,
            en: event.description.en,
          }
        : undefined,
      categories: event.categories,
      verification: event.verification,
      isLongRange: event.isLongRange,
    }))
    .sort((a, b) => (a.date ?? a.start ?? "").localeCompare(b.date ?? b.start ?? ""));
}
