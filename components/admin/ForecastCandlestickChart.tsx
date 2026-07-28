"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { Button, Card, Text } from "@/components/ui";
import type {
  LongTermChartScenarioId,
  LongTermChartViewMode,
  LongTermForecastChart,
} from "@/types/long-term-forecast-chart";

function toUtc(time: string): UTCTimestamp {
  return Math.floor(new Date(`${time.slice(0, 10)}T00:00:00Z`).getTime() / 1000) as UTCTimestamp;
}

const SCENARIO_LABELS: Record<LongTermChartScenarioId, string> = {
  base: "基准情景",
  bull: "偏强情景",
  bear: "偏弱情景",
};

const VIEW_LABELS: Record<LongTermChartViewMode, string> = {
  forecast_only: "只看预测",
  compare: "预测与实际对比",
  actual_only: "只看实际",
};

export function ForecastCandlestickChart({ chart }: { chart: LongTermForecastChart }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [scenarioId, setScenarioId] = useState<LongTermChartScenarioId>("base");
  const [viewMode, setViewMode] = useState<LongTermChartViewMode>("compare");
  const [hover, setHover] = useState<string | null>(null);
  const [activeMarker, setActiveMarker] = useState<string | null>(null);

  const scenario = useMemo(() => {
    if (scenarioId === "bull") return chart.bullScenario;
    if (scenarioId === "bear") return chart.bearScenario;
    return chart.baseScenario;
  }, [chart, scenarioId]);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    const height = isMobile ? 300 : 480;

    const api = createChart(el, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "rgba(148,163,184,0.12)" },
        horzLines: { color: "rgba(148,163,184,0.12)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
      width: el.clientWidth,
    });
    chartRef.current = api;

    const histSeries = api.addSeries(CandlestickSeries, {
      upColor: "#16a34a",
      downColor: "#dc2626",
      borderVisible: true,
      wickUpColor: "#16a34a",
      wickDownColor: "#dc2626",
    });

    const forecastSeries = api.addSeries(CandlestickSeries, {
      upColor: "rgba(59,130,246,0.25)",
      downColor: "rgba(249,115,22,0.25)",
      borderUpColor: "rgba(59,130,246,0.85)",
      borderDownColor: "rgba(249,115,22,0.85)",
      wickUpColor: "rgba(59,130,246,0.7)",
      wickDownColor: "rgba(249,115,22,0.7)",
      borderVisible: true,
    });

    const pendingSeries = api.addSeries(CandlestickSeries, {
      upColor: "rgba(148,163,184,0.12)",
      downColor: "rgba(148,163,184,0.12)",
      borderUpColor: "rgba(148,163,184,0.55)",
      borderDownColor: "rgba(148,163,184,0.55)",
      wickUpColor: "rgba(148,163,184,0.45)",
      wickDownColor: "rgba(148,163,184,0.45)",
      borderVisible: true,
    });

    const realizedSeries = api.addSeries(CandlestickSeries, {
      upColor: "#15803d",
      downColor: "#b91c1c",
      borderVisible: true,
      wickUpColor: "#15803d",
      wickDownColor: "#b91c1c",
    }) as ISeriesApi<"Candlestick">;

    const showHist = viewMode !== "actual_only";
    const showForecast = viewMode !== "actual_only";
    const showRealized = viewMode !== "forecast_only" && (chart.realizedCandles?.length ?? 0) > 0;

    if (showHist) {
      histSeries.setData(
        chart.actualCandles.map((c) => ({
          time: toUtc(c.time),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
    } else {
      histSeries.setData([]);
    }

    const confirmed = scenario.candles.filter((c) => !c.pendingReview);
    const pending = scenario.candles.filter((c) => c.pendingReview);

    if (showForecast) {
      forecastSeries.setData(
        confirmed.map((c) => ({
          time: toUtc(c.time),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
      pendingSeries.setData(
        pending.map((c) => ({
          time: toUtc(c.time),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
    } else {
      forecastSeries.setData([]);
      pendingSeries.setData([]);
    }

    if (showRealized) {
      realizedSeries.setData(
        (chart.realizedCandles ?? []).map((c) => ({
          time: toUtc(c.time),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
    } else {
      realizedSeries.setData([]);
    }

    const divider = toUtc(chart.forecastStart);
    histSeries.createPriceLine({
      price: chart.anchorPrice,
      color: "rgba(148,163,184,0.35)",
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: true,
      title: "锚定价",
    });
    if (scenario.invalidationLevel != null) {
      histSeries.createPriceLine({
        price: scenario.invalidationLevel,
        color: "rgba(239,68,68,0.55)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "失效",
      });
    }

    const markers: SeriesMarker<Time>[] = chart.markers.map((m) => ({
      time: toUtc(m.time),
      position: m.kind === "low_window" ? "belowBar" : "aboveBar",
      color:
        m.kind === "forecast_start"
          ? "#3b82f6"
          : m.kind === "pending_review"
            ? "#94a3b8"
            : m.kind === "invalidation"
              ? "#ef4444"
              : "#eab308",
      shape: m.kind === "forecast_start" ? "arrowUp" : "circle",
      text: m.label,
    }));
    createSeriesMarkers(forecastSeries, markers);

    api.timeScale().fitContent();

    api.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData.size) {
        setHover(null);
        return;
      }
      const raw =
        param.seriesData.get(forecastSeries) ||
        param.seriesData.get(pendingSeries) ||
        param.seriesData.get(realizedSeries) ||
        param.seriesData.get(histSeries);
      if (!raw || typeof raw !== "object" || !("open" in raw) || !("high" in raw)) {
        setHover(null);
        return;
      }
      const bar = raw as unknown as { open: number; high: number; low: number; close: number };
      const kind =
        param.seriesData.get(forecastSeries) || param.seriesData.get(pendingSeries)
          ? "预测"
          : param.seriesData.get(realizedSeries)
            ? "实际"
            : "历史";
      setHover(
        `${kind} O:${bar.open} H:${bar.high} L:${bar.low} C:${bar.close}`
      );
    });

    const onResize = () => {
      if (!containerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", onResize);

    // Visual divider: vertical line via whitespace marker annotation in UI banner.
    void divider;

    return () => {
      window.removeEventListener("resize", onResize);
      api.remove();
      chartRef.current = null;
    };
  }, [chart, scenario, viewMode]);

  const summary = chart.verificationSummary;

  return (
    <Card padding="lg" className="flex w-full max-w-full flex-col gap-3 overflow-hidden">
      <p className="text-body-sm font-medium text-amber-600">
        右侧为情景模拟预测，并非已经发生的真实行情。
      </p>
      {chart.priceMode === "relative" ? (
        <p className="text-caption text-foreground-tertiary">
          {chart.relativeIndexNote ?? "该图仅表达方向和节奏，不代表具体价格目标。"}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(SCENARIO_LABELS) as LongTermChartScenarioId[]).map((id) => (
          <Button
            key={id}
            size="sm"
            variant={scenarioId === id ? "primary" : "outline"}
            onClick={() => setScenarioId(id)}
          >
            {SCENARIO_LABELS[id]}（
            {id === "base"
              ? chart.baseScenario.probability
              : id === "bull"
                ? chart.bullScenario.probability
                : chart.bearScenario.probability}
            %）
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(VIEW_LABELS) as LongTermChartViewMode[]).map((id) => (
          <Button
            key={id}
            size="sm"
            variant={viewMode === id ? "primary" : "outline"}
            onClick={() => setViewMode(id)}
          >
            {VIEW_LABELS[id]}
          </Button>
        ))}
      </div>
      <p className="text-caption text-foreground-tertiary">
        区间：{chart.forecastStart} → {chart.forecastEnd} · 周期：{chart.interval} · 版本 V
        {chart.version}
        {chart.locked ? " · 已锁定" : ""} · 预测区间浅色标记 · 起点后为预测K线
      </p>
      <div ref={containerRef} className="w-full max-w-full overflow-hidden" />
      {hover ? <p className="font-mono text-caption text-foreground-secondary">{hover}</p> : null}
      <div className="flex flex-wrap gap-2">
        {chart.markers.map((m) => (
          <button
            key={m.id}
            type="button"
            className="rounded border border-border/[0.12] px-2 py-1 text-left text-caption text-foreground-secondary"
            onClick={() => setActiveMarker(activeMarker === m.id ? null : m.id)}
          >
            {m.label}
            {activeMarker === m.id && m.detail ? (
              <span className="mt-1 block text-foreground-tertiary">{m.detail}</span>
            ) : null}
          </button>
        ))}
      </div>
      {summary ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Text variant="caption" color="tertiary" className="block">
            总体方向：{summary.overallDirection}
          </Text>
          <Text variant="caption" color="tertiary" className="block">
            高点时间偏差：{summary.highTimeDeviation}
          </Text>
          <Text variant="caption" color="tertiary" className="block">
            低点时间偏差：{summary.lowTimeDeviation}
          </Text>
          <Text variant="caption" color="tertiary" className="block">
            周期末价格偏差：
            {summary.endPriceDeviationPct == null ? "待验证" : `${summary.endPriceDeviationPct}%`}
          </Text>
          <Text variant="caption" color="tertiary" className="block">
            目标区间：{summary.targetZone}
          </Text>
          <Text variant="caption" color="tertiary" className="block">
            路径顺序：{summary.pathOrder}
          </Text>
        </div>
      ) : null}
    </Card>
  );
}
