"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  inferAnalystDirection,
  inferAnalystHorizon,
  normalizeConfidence,
  type AnalystDirection,
  type AnalystHorizon,
} from "@/lib/research/research-protocol";

export const MOOX_RESEARCH_PROTOCOL_V72092 = true;

type UnknownRecord = Record<string, unknown>;

type Row = {
  id: string;
  analyst: string;
  asset: string;
  direction: AnalystDirection;
  horizon: AnalystHorizon;
  summary: string;
  timeWindow: string;
  confidence?: number;
  positionHint: string;
  createdAt: string;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstString(record: UnknownRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function firstUnknown(record: UnknownRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (key in record) return record[key];
  }
  return undefined;
}

function collectRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];
  for (const key of ["opinions", "rows", "items", "data", "results"]) {
    const candidate = payload[key];
    if (Array.isArray(candidate)) return candidate;
    if (isRecord(candidate)) {
      for (const nested of ["opinions", "rows", "items", "results"]) {
        const nestedCandidate = candidate[nested];
        if (Array.isArray(nestedCandidate)) return nestedCandidate;
      }
    }
  }
  return [];
}

function extractPositionHint(text: string): string {
  const compact = text.replace(/\s+/g, " ");
  const patterns = [
    /(?:仓位|持仓)[：:]?\s*([^，。；;]{1,28})/i,
    /(100%\s*现金|全现金|空仓|满仓|半仓|轻仓|重仓)/i,
  ];
  for (const pattern of patterns) {
    const match = compact.match(pattern);
    if (match?.[1]) return match[1];
    if (match?.[0]) return match[0];
  }
  return "—";
}

function normalizeRow(value: unknown, index: number): Row | null {
  if (!isRecord(value)) return null;
  const analyst = firstString(value, ["analyst", "blogger", "sourceName", "author", "handle", "source"]);
  const asset = firstString(value, ["asset", "symbol", "market", "ticker", "assetCode"]);
  const summary = firstString(value, ["summary", "content", "opinion", "reason", "text", "evidence"]);
  const directionText = firstString(value, ["direction", "bias", "stance", "view", "signal"]);
  const timeWindow = firstString(value, ["timeWindow", "window", "horizon", "period", "timeframe"]);
  const createdAt = firstString(value, ["createdAt", "publishedAt", "postedAt", "updatedAt", "timestamp"]);
  const confidence = normalizeConfidence(firstUnknown(value, ["confidence", "probability", "score"]));

  if (!analyst && !asset && !summary) return null;

  return {
    id: firstString(value, ["id", "opinionId"]) || `${index}-${analyst}-${asset}-${createdAt}`,
    analyst: analyst || "未知分析师",
    asset: asset || "—",
    direction: inferAnalystDirection(`${directionText} ${summary}`),
    horizon: inferAnalystHorizon(timeWindow, summary),
    summary: summary || "—",
    timeWindow: timeWindow || "—",
    confidence,
    positionHint: extractPositionHint(summary),
    createdAt: createdAt || "—",
  };
}

const horizonLabel: Record<AnalystHorizon, string> = {
  SHORT: "短线",
  MEDIUM: "中期",
  LONG: "长期",
  UNSPECIFIED: "未分周期",
};

const directionLabel: Record<AnalystDirection, string> = {
  BULLISH: "看涨",
  BEARISH: "看跌",
  NEUTRAL: "中性",
  UNKNOWN: "未明确",
};

export function AnalystHorizonDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/x-opinions", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((payload) => {
        if (!active) return;
        const normalized = collectRows(payload)
          .map((row, index) => normalizeRow(row, index))
          .filter((row): row is Row => row !== null);
        setRows(normalized);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "读取失败");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => `${row.analyst} ${row.asset} ${row.summary}`.toLowerCase().includes(needle));
  }, [query, rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">外部分析师分周期视图</h1>
          <p className="mt-1 text-sm text-zinc-400">Stone等分析师按短线 / 中期 / 长期拆分；当前仓位与候选标的单独观察，不覆盖MOOX正式方向。</p>
        </div>
        <input
          className="min-w-56 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
          onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
          placeholder="筛选 Stone / GOOGL / BTC..."
          value={query}
        />
      </div>

      {loading ? <p className="text-sm text-zinc-500">正在读取现有X观点矩阵…</p> : null}
      {error ? <p className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">读取失败：{error}</p> : null}
      {!loading && !error && filtered.length === 0 ? <p className="text-sm text-zinc-500">当前没有可归一化的观点记录。</p> : null}

      <div className="grid gap-3 xl:grid-cols-2">
        {filtered.map((row) => (
          <article key={row.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-zinc-100">{row.analyst}</span>
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-zinc-400">{row.asset}</span>
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-zinc-400">{horizonLabel[row.horizon]}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-300">{row.summary}</p>
              </div>
              <span className="rounded-lg border border-white/10 px-2 py-1 text-xs text-zinc-300">{directionLabel[row.direction]}</span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-500 sm:grid-cols-4">
              <div><dt>时间窗口</dt><dd className="mt-1 text-zinc-300">{row.timeWindow}</dd></div>
              <div><dt>仓位线索</dt><dd className="mt-1 text-zinc-300">{row.positionHint}</dd></div>
              <div><dt>置信</dt><dd className="mt-1 text-zinc-300">{row.confidence === undefined ? "—" : `${row.confidence}%`}</dd></div>
              <div><dt>更新时间</dt><dd className="mt-1 text-zinc-300">{row.createdAt}</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
