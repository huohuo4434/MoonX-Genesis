"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  CrosshairMode,
  LineSeries,
  LineStyle,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type MouseEventParams,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import {
  addDaysIso,
  buildForecastPathPoints,
  generateCandleRange,
  isoToUnixSeconds,
  resampleCandles,
  unixSecondsToIso,
} from "@/lib/forecast-candles";
import { hslToken, levelColor, levelWidth, readChartThemeTokens, zoneColor } from "@/lib/chart-theme";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import type {
  AssetChartScenario,
  ChartTimeframe,
  ForecastCandle,
  ForecastChartToggles,
  ForecastScenarioId,
  PriceLevel,
  TurningWindow,
} from "@/types/forecast-chart";

export interface ForecastCandlestickChartProps {
  scenario: AssetChartScenario;
  scenarioId: ForecastScenarioId;
  timeframe: ChartTimeframe;
  toggles: ForecastChartToggles;
  height?: number;
  className?: string;
  /** Compact mode (homepage preview): smaller chrome, no on-chart zone/window labels. */
  compact?: boolean;
  /** Restrict which curated levels render — used by the compact homepage preview. */
  visibleLevelIds?: string[];
  /** Increment to re-fit the visible range to the full series ("Reset View"). */
  resetToken?: number;
}

interface HoverInfo {
  x: number;
  y: number;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  kind: "historical" | "forecast";
  nearbyLevel?: PriceLevel;
  nearbyWindow?: TurningWindow;
}

interface ProcessedChartData {
  historicalCandles: ForecastCandle[];
  forecastCandles: ForecastCandle[];
  allCandles: ForecastCandle[];
  pathPoints: { time: number; value: number; majorTurningPoint?: boolean; label?: string }[];
  dividerTime: number;
}

function useProcessedChartData(
  scenario: AssetChartScenario,
  scenarioId: ForecastScenarioId,
  timeframe: ChartTimeframe
): ProcessedChartData {
  return useMemo(() => {
    const scenarioPath = scenario.scenarios[scenarioId];
    const historicalStart = addDaysIso(scenario.forecastWindow.start, -scenario.historicalCandleCount);
    const historicalEnd = addDaysIso(scenario.forecastWindow.start, -1);

    const historical = generateCandleRange({
      seed: scenario.seed,
      count: scenario.historicalCandleCount,
      startDate: historicalStart,
      endDate: historicalEnd,
      kind: "historical",
      volatility: scenario.historicalVolatility,
      waypoints: scenario.historicalWaypoints,
    });

    const forecast = generateCandleRange({
      seed: scenario.seed + scenarioId.length * 1000 + scenarioId.charCodeAt(0),
      count: scenario.forecastCandleCount,
      startDate: scenario.forecastWindow.start,
      endDate: scenario.forecastWindow.end,
      kind: "forecast",
      volatility: scenarioPath.volatility,
      waypoints: scenarioPath.waypoints,
    });

    const allDaily = [...historical, ...forecast];
    const resampled = timeframe === "1D" ? allDaily : resampleCandles(allDaily, timeframe, scenario.seed);
    const historicalCandles = resampled.filter((c) => c.kind === "historical");
    const forecastCandles = resampled.filter((c) => c.kind === "forecast");

    const pathPoints = buildForecastPathPoints(scenarioPath.waypoints, scenario.forecastWindow.start, scenario.forecastWindow.end);

    return {
      historicalCandles,
      forecastCandles,
      allCandles: resampled,
      pathPoints,
      dividerTime: isoToUnixSeconds(scenario.forecastWindow.start),
    };
  }, [scenario, scenarioId, timeframe]);
}

interface ChartInstanceRefs {
  chart: IChartApi;
  historicalSeries: ISeriesApi<"Candlestick">;
  forecastSeries: ISeriesApi<"Candlestick">;
  pathSeries: ISeriesApi<"Line">;
  markersApi: ISeriesMarkersPluginApi<Time>;
  markers: SeriesMarker<Time>[];
  levelLines: { level: PriceLevel; line: IPriceLine }[];
}

/**
 * Premium TradingView-style scenario chart. Renders two candlestick series
 * (solid historical / semi-transparent forecast) plus a dashed forecast
 * path, level price-lines, and HTML overlays for zones/turning windows that
 * stay pixel-synced with the chart via `timeToCoordinate`/`priceToCoordinate`.
 *
 * Every number drawn here comes from curated scenario data — see
 * `lib/data/forecast-chart-scenarios.ts` and `lib/forecast-candles.ts`.
 */
export function ForecastCandlestickChart({
  scenario,
  scenarioId,
  timeframe,
  toggles,
  height = 420,
  className,
  compact = false,
  visibleLevelIds,
  resetToken,
}: ForecastCandlestickChartProps) {
  const { locale } = useLocale();
  const t = useTranslations();
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dividerElRef = useRef<HTMLDivElement | null>(null);
  const zoneElRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const windowElRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const chartApiRef = useRef<ChartInstanceRefs | null>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  const processed = useProcessedChartData(scenario, scenarioId, timeframe);
  const scenarioPath = scenario.scenarios[scenarioId];
  const visibleLevels = useMemo(
    () => (visibleLevelIds ? scenario.levels.filter((l) => visibleLevelIds.includes(l.id)) : scenario.levels),
    [scenario.levels, visibleLevelIds]
  );

  const recomputeOverlays = useCallback(() => {
      const api = chartApiRef.current;
      const container = containerRef.current;
      if (!api || !container) return;
      const width = container.clientWidth;

      if (dividerElRef.current) {
        const x = api.chart.timeScale().timeToCoordinate(processed.dividerTime as UTCTimestamp);
        if (x === null) {
          dividerElRef.current.style.display = "none";
        } else {
          dividerElRef.current.style.display = "block";
          dividerElRef.current.style.left = `${x}px`;
        }
      }

      for (const zone of scenario.zones) {
        const el = zoneElRefs.current.get(zone.id);
        if (!el) continue;
        const yTop = api.historicalSeries.priceToCoordinate(zone.to);
        const yBottom = api.historicalSeries.priceToCoordinate(zone.from);
        if (yTop === null || yBottom === null) {
          el.style.display = "none";
          continue;
        }
        el.style.display = "block";
        el.style.top = `${yTop}px`;
        el.style.height = `${Math.max(yBottom - yTop, 2)}px`;
      }

      for (const window_ of scenario.turningWindows) {
        const el = windowElRefs.current.get(window_.id);
        if (!el) continue;
        const xStart = api.chart.timeScale().timeToCoordinate(isoToUnixSeconds(window_.startDate) as UTCTimestamp);
        const xEnd = api.chart.timeScale().timeToCoordinate(isoToUnixSeconds(window_.endDate) as UTCTimestamp);
        if (xStart === null && xEnd === null) {
          el.style.display = "none";
          continue;
        }
        const left = xStart ?? 0;
        const right = xEnd ?? width;
        el.style.display = "block";
        el.style.left = `${left}px`;
        el.style.width = `${Math.max(right - left, 2)}px`;
      }
    }, [processed.dividerTime, scenario.zones, scenario.turningWindows]);

    // Main lifecycle effect: (re)creates the chart whenever the processed
    // dataset (asset / scenario / timeframe) or height changes.
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return undefined;

      const tokens = readChartThemeTokens();
      const reducedMotion =
        typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const chart = createChart(container, {
        width: container.clientWidth,
        height,
        autoSize: false,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: hslToken(tokens.foregroundSecondary),
          fontSize: compact ? 10 : 11,
        },
        grid: {
          vertLines: { color: hslToken(tokens.border, 0.06) },
          horzLines: { color: hslToken(tokens.border, 0.08) },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: hslToken(tokens.foregroundTertiary, 0.4), width: 1, style: LineStyle.Dashed, labelBackgroundColor: hslToken(tokens.card) },
          horzLine: { color: hslToken(tokens.foregroundTertiary, 0.4), width: 1, style: LineStyle.Dashed, labelBackgroundColor: hslToken(tokens.card) },
        },
        rightPriceScale: {
          borderColor: hslToken(tokens.border, 0.14),
          visible: true,
        },
        timeScale: {
          borderColor: hslToken(tokens.border, 0.14),
          timeVisible: timeframe === "4H",
          secondsVisible: false,
        },
        handleScroll: !compact,
        handleScale: !compact,
        kineticScroll: { touch: !reducedMotion, mouse: false },
      });

      const historicalSeries = chart.addSeries(CandlestickSeries, {
        upColor: hslToken(tokens.success, 1),
        downColor: hslToken(tokens.danger, 1),
        borderVisible: false,
        wickUpColor: hslToken(tokens.success, 1),
        wickDownColor: hslToken(tokens.danger, 1),
        priceFormat: { type: "price", precision: scenario.pricePrecision ?? 2, minMove: scenario.pricePrecision === 0 ? 1 : 0.01 },
      });
      historicalSeries.setData(
        processed.historicalCandles.map((c) => ({ time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close }))
      );

      const forecastSeries = chart.addSeries(CandlestickSeries, {
        upColor: hslToken(tokens.success, 0.32),
        downColor: hslToken(tokens.danger, 0.32),
        borderVisible: false,
        wickUpColor: hslToken(tokens.success, 0.4),
        wickDownColor: hslToken(tokens.danger, 0.4),
        priceFormat: { type: "price", precision: scenario.pricePrecision ?? 2, minMove: scenario.pricePrecision === 0 ? 1 : 0.01 },
        lastValueVisible: false,
        priceLineVisible: false,
      });
      forecastSeries.setData(
        processed.forecastCandles.map((c) => ({ time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close }))
      );

      const pathSeries = chart.addSeries(LineSeries, {
        color: hslToken(tokens.warning, 1),
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
        visible: toggles.showForecastPath,
      });
      pathSeries.setData(processed.pathPoints.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));

      const markers: SeriesMarker<Time>[] = processed.pathPoints
        .filter((p) => p.majorTurningPoint)
        .map((p) => ({
          time: p.time as UTCTimestamp,
          position: "inBar",
          shape: "circle",
          color: hslToken(tokens.warning, 1),
          size: 1,
          text: p.label ?? "",
        }));
      const markersApi = createSeriesMarkers<Time>(pathSeries, toggles.showForecastPath ? markers : []);

      historicalSeries.createPriceLine({
        price: scenario.referencePrice,
        color: hslToken(tokens.foregroundTertiary, 0.6),
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: t("chart.reference"),
      });

      const levelLines = visibleLevels.map((level) => ({
        level,
        line: historicalSeries.createPriceLine({
          price: level.price,
          color: levelColor(level.kind, tokens),
          lineWidth: levelWidth(level.kind),
          lineStyle: level.kind === "invalidation" ? LineStyle.LargeDashed : LineStyle.Dashed,
          lineVisible: toggles.showLevels,
          axisLabelVisible: toggles.showLevels,
          title: locale === "zh-CN" ? level.labelZh ?? level.label : level.label,
        }),
      }));

      chartApiRef.current = { chart, historicalSeries, forecastSeries, pathSeries, markersApi, markers, levelLines };

      recomputeOverlays();
      chart.timeScale().subscribeVisibleLogicalRangeChange(recomputeOverlays);
      chart.timeScale().fitContent();

      const handleCrosshairMove = (param: MouseEventParams<Time>) => {
        if (!param.point || param.time === undefined) {
          setHoverInfo(null);
          return;
        }
        const historicalData = param.seriesData.get(historicalSeries) as unknown as
          | { open: number; high: number; low: number; close: number }
          | undefined;
        const forecastData = param.seriesData.get(forecastSeries) as unknown as
          | { open: number; high: number; low: number; close: number }
          | undefined;
        const data = historicalData ?? forecastData;
        if (!data) {
          setHoverInfo(null);
          return;
        }
        const time = Number(param.time);
        const isoDate = unixSecondsToIso(time);
        const threshold = data.close * 0.006;
        const nearbyLevel = scenario.levels.find((level) => Math.abs(level.price - data.close) < threshold);
        const nearbyWindow = scenario.turningWindows.find((w) => isoDate >= w.startDate && isoDate <= w.endDate);

        setHoverInfo({
          x: param.point.x,
          y: param.point.y,
          time,
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          kind: historicalData ? "historical" : "forecast",
          nearbyLevel,
          nearbyWindow,
        });
      };
      chart.subscribeCrosshairMove(handleCrosshairMove);

      const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const { width, height: observedHeight } = entry.contentRect;
        if (width > 0) {
          chart.resize(width, height || observedHeight);
          recomputeOverlays();
        }
      });
      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(recomputeOverlays);
        chart.unsubscribeCrosshairMove(handleCrosshairMove);
        markersApi.detach();
        chart.remove();
        chartApiRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [processed, height, compact, scenario.pricePrecision, scenario.referencePrice, locale, t]);

    // Lightweight toggle effect — flips visibility without recreating the chart.
    useEffect(() => {
      const api = chartApiRef.current;
      if (!api) return;
      api.levelLines.forEach(({ line }) => {
        line.applyOptions({ lineVisible: toggles.showLevels, axisLabelVisible: toggles.showLevels });
      });
      api.pathSeries.applyOptions({ visible: toggles.showForecastPath });
      api.markersApi.setMarkers(toggles.showForecastPath ? api.markers : []);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toggles, processed]);

    // "Reset View" — re-fit without recreating the chart or its data.
    useEffect(() => {
      if (resetToken === undefined) return;
      chartApiRef.current?.chart.timeScale().fitContent();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resetToken]);

    const scenarioLabel = scenarioPath.label;

    return (
      <div ref={wrapperRef} className={cn("relative w-full select-none", className)}>
        <div ref={containerRef} style={{ height }} className="w-full overflow-hidden rounded-md" />

        {/* Overlay layer — clipped to the chart's exact bounds so zones/windows
            with price levels outside the visible scale never bleed into the
            page below the chart. */}
        <div className="pointer-events-none absolute left-0 top-0 w-full overflow-hidden" style={{ height }}>
          {/* Forecast Starts divider */}
          <div
            ref={dividerElRef}
            aria-hidden="true"
            className="absolute top-0 z-10 h-full border-l border-dashed border-foreground/25"
            style={{ display: "none" }}
          >
            {!compact && (
              <span className="absolute -left-[1px] top-1 whitespace-nowrap rounded-sm border border-border/[0.12] bg-card/90 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground-secondary">
                {t("chart.forecastStarts")}
              </span>
            )}
          </div>

          {/* Consolidation / support / resistance / peak zones */}
          {toggles.showConsolidationZones &&
            scenario.zones.map((zone) => {
              const colors = zoneColor(zone.kind, readChartThemeTokens());
              return (
                <div
                  key={zone.id}
                  ref={(el) => {
                    if (el) zoneElRefs.current.set(zone.id, el);
                    else zoneElRefs.current.delete(zone.id);
                  }}
                  aria-hidden="true"
                  className="absolute left-0 z-0 w-full border-y"
                  style={{ display: "none", backgroundColor: colors.background, borderColor: colors.border }}
                >
                  {!compact && (
                    <span className="absolute left-1 top-0.5 whitespace-nowrap text-[10px] font-medium text-foreground-tertiary">
                      {locale === "zh-CN" ? zone.labelZh ?? zone.label : zone.label}
                    </span>
                  )}
                </div>
              );
            })}

          {/* Turning windows */}
          {toggles.showTurningWindows &&
            !compact &&
            scenario.turningWindows.map((window_) => (
              <div
                key={window_.id}
                ref={(el) => {
                  if (el) windowElRefs.current.set(window_.id, el);
                  else windowElRefs.current.delete(window_.id);
                }}
                aria-hidden="true"
                className="absolute top-0 z-0 h-full border-x border-dashed"
                style={{
                  display: "none",
                  backgroundColor: hslToken(readChartThemeTokens().warning, 0.05),
                  borderColor: hslToken(readChartThemeTokens().warning, 0.25),
                }}
              >
                <span className="absolute left-1 top-1 whitespace-nowrap rounded-sm bg-card/80 px-1 text-[10px] font-medium text-warning">
                  {locale === "zh-CN" ? window_.labelZh ?? window_.label : window_.label}
                </span>
              </div>
            ))}
        </div>

        {/* Hover tooltip */}
        {hoverInfo && !compact && (
          <div
            className="pointer-events-none absolute z-20 flex w-56 flex-col gap-1 rounded-md border border-border/[0.12] bg-card/95 p-3 text-caption shadow-elevated backdrop-blur-sm"
            style={{
              left: Math.min(Math.max(hoverInfo.x + 12, 8), (wrapperRef.current?.clientWidth ?? 400) - 232),
              top: Math.min(Math.max(hoverInfo.y - 12, 8), height - 180),
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-foreground">{formatDate(unixSecondsToIso(hoverInfo.time))}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                  hoverInfo.kind === "historical" ? "bg-foreground-tertiary/15 text-foreground-secondary" : "bg-warning/15 text-warning"
                )}
              >
                {hoverInfo.kind === "historical" ? t("chart.historical") : t("chart.forecast")}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-foreground-secondary">
              <span>O {formatNumber(hoverInfo.open)}</span>
              <span>H {formatNumber(hoverInfo.high)}</span>
              <span>L {formatNumber(hoverInfo.low)}</span>
              <span>C {formatNumber(hoverInfo.close)}</span>
            </div>
            <div className="text-foreground-tertiary">{t("chart.scenario")}：{scenarioLabel}</div>
            {hoverInfo.nearbyLevel && (
              <div className="text-foreground-tertiary">
                {t("chart.near")} {locale === "zh-CN" ? hoverInfo.nearbyLevel.labelZh ?? hoverInfo.nearbyLevel.label : hoverInfo.nearbyLevel.label} ({formatNumber(hoverInfo.nearbyLevel.price)})
              </div>
            )}
            {hoverInfo.nearbyWindow && (
              <div className="text-foreground-tertiary">
                {hoverInfo.nearbyWindow.note ?? hoverInfo.nearbyWindow.label}
              </div>
            )}
          </div>
        )}
      </div>
    );
}
