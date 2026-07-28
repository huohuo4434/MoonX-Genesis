"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Text } from "@/components/ui";

type WaveRow = {
  id: string;
  marketName: string;
  marketCode: string;
  direction: string;
  summary: string;
  status: string;
  publishedAt: string;
  supportLevels?: number[];
  rewardRisk?: number | null;
};

const DIRECTIONS = [
  "UP",
  "DOWN",
  "SIDEWAYS",
  "UP_AFTER_PULLBACK",
  "DOWN_AFTER_REBOUND",
  "REBOUND",
  "PULLBACK",
] as const;

const STATUSES = ["HIT", "PARTIAL", "FAILED", "EXPIRED"] as const;

function parseLevels(raw: string): number[] {
  return raw
    .split(/[,/，、\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

export function AdminWavePanel() {
  const router = useRouter();
  const [rows, setRows] = useState<WaveRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [analystSlug, setAnalystSlug] = useState("wave-theory-academy");
  const [analystName, setAnalystName] = useState("波浪理论学习");
  const [marketCode, setMarketCode] = useState("");
  const [marketName, setMarketName] = useState("");
  const [timeframe, setTimeframe] = useState("1D");
  const [publishedAt, setPublishedAt] = useState(new Date().toISOString().slice(0, 16));
  const [validUntil, setValidUntil] = useState("");
  const [direction, setDirection] = useState<(typeof DIRECTIONS)[number]>("UP_AFTER_PULLBACK");
  const [summary, setSummary] = useState("");
  const [waveLabel, setWaveLabel] = useState("");
  const [supportRaw, setSupportRaw] = useState("");
  const [resistanceRaw, setResistanceRaw] = useState("");
  const [targetRaw, setTargetRaw] = useState("");
  const [pathRaw, setPathRaw] = useState("");
  const [rawText, setRawText] = useState("");

  async function refresh() {
    const res = await fetch("/api/admin/wave?limit=40", { cache: "no-store" });
    const json = (await res.json()) as { ok?: boolean; data?: WaveRow[]; error?: string };
    if (res.ok && Array.isArray(json.data)) setRows(json.data);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function submitCreate() {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/wave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        analystSlug,
        analystName,
        marketCode: marketCode.trim(),
        marketName: marketName.trim(),
        timeframe,
        publishedAt: new Date(publishedAt).toISOString(),
        validUntil: validUntil ? new Date(validUntil).toISOString() : null,
        direction,
        summary: summary.trim(),
        waveLabel: waveLabel.trim() || null,
        supportLevels: parseLevels(supportRaw),
        resistanceLevels: parseLevels(resistanceRaw),
        targetLevels: parseLevels(targetRaw),
        expectedPath: pathRaw
          .split(/[→>,，、]/)
          .map((s) => s.trim())
          .filter(Boolean),
        rawText: rawText.trim() || null,
      }),
    });
    const json = (await res.json()) as { error?: unknown };
    setLoading(false);
    if (!res.ok) {
      setMessage(typeof json.error === "string" ? json.error : "录入失败");
      return;
    }
    setMessage("已保存波浪观点");
    setSummary("");
    setMarketCode("");
    setMarketName("");
    await refresh();
    router.refresh();
  }

  async function validate(predictionId: string, status: (typeof STATUSES)[number]) {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/wave/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ predictionId, status }),
    });
    setLoading(false);
    if (!res.ok) {
      setMessage("验证失败");
      return;
    }
    setMessage(`已标记为 ${status}`);
    await refresh();
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card padding="md" className="space-y-3">
        <Text variant="body-sm" weight="semibold">
          录入波浪观点
        </Text>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-caption text-foreground-tertiary">
            分析师 slug
            <input
              value={analystSlug}
              onChange={(e) => setAnalystSlug(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 text-body-sm"
            />
          </label>
          <label className="text-caption text-foreground-tertiary">
            分析师名称
            <input
              value={analystName}
              onChange={(e) => setAnalystName(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 text-body-sm"
            />
          </label>
          <label className="text-caption text-foreground-tertiary">
            市场代码
            <input
              value={marketCode}
              onChange={(e) => setMarketCode(e.target.value)}
              placeholder="XAUUSD"
              className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 text-body-sm"
            />
          </label>
          <label className="text-caption text-foreground-tertiary">
            市场名称
            <input
              value={marketName}
              onChange={(e) => setMarketName(e.target.value)}
              placeholder="黄金"
              className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 text-body-sm"
            />
          </label>
          <label className="text-caption text-foreground-tertiary">
            周期
            <input
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 text-body-sm"
            />
          </label>
          <label className="text-caption text-foreground-tertiary">
            方向
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as (typeof DIRECTIONS)[number])}
              className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 text-body-sm"
            >
              {DIRECTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="text-caption text-foreground-tertiary">
            发布时间
            <input
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 text-body-sm"
            />
          </label>
          <label className="text-caption text-foreground-tertiary">
            有效至（可选）
            <input
              type="datetime-local"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 text-body-sm"
            />
          </label>
        </div>
        <label className="block text-caption text-foreground-tertiary">
          摘要
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-body-sm"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-caption text-foreground-tertiary">
            浪型标签
            <input
              value={waveLabel}
              onChange={(e) => setWaveLabel(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 text-body-sm"
            />
          </label>
          <label className="text-caption text-foreground-tertiary">
            预期路径（用 → 分隔）
            <input
              value={pathRaw}
              onChange={(e) => setPathRaw(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 text-body-sm"
            />
          </label>
          <label className="text-caption text-foreground-tertiary">
            支撑（逗号分隔）
            <input
              value={supportRaw}
              onChange={(e) => setSupportRaw(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 text-body-sm"
            />
          </label>
          <label className="text-caption text-foreground-tertiary">
            压力（逗号分隔）
            <input
              value={resistanceRaw}
              onChange={(e) => setResistanceRaw(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 text-body-sm"
            />
          </label>
          <label className="text-caption text-foreground-tertiary">
            目标（逗号分隔）
            <input
              value={targetRaw}
              onChange={(e) => setTargetRaw(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 text-body-sm"
            />
          </label>
          <label className="text-caption text-foreground-tertiary">
            原文备注
            <input
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 text-body-sm"
            />
          </label>
        </div>
        <Button type="button" variant="primary" disabled={loading} onClick={() => void submitCreate()}>
          保存观点
        </Button>
        {message ? (
          <Text variant="caption" color="secondary">
            {message}
          </Text>
        ) : null}
      </Card>

      <div className="space-y-3">
        <Text variant="body-sm" weight="semibold">
          已录入观点 / 验证
        </Text>
        {rows.map((row) => (
          <Card key={row.id} padding="md" className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Text variant="body" weight="semibold">
                {row.marketName} · {row.marketCode}
              </Text>
              <Badge variant="outline">{row.direction}</Badge>
              <Badge variant="outline">{row.status}</Badge>
            </div>
            <Text variant="body-sm" color="secondary">
              {row.summary}
            </Text>
            <Text variant="caption" color="tertiary">
              发布 {row.publishedAt}
              {Array.isArray(row.supportLevels) && row.supportLevels.length
                ? ` · 支撑 ${row.supportLevels.join(" / ")}`
                : ""}
            </Text>
            {row.status === "PENDING" ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {STATUSES.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => void validate(row.id, s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            ) : null}
          </Card>
        ))}
        {rows.length === 0 ? (
          <Text variant="body-sm" color="secondary">
            暂无波浪记录。可先运行 `npm run seed:wave` 导入四条初始数据。
          </Text>
        ) : null}
      </div>
    </div>
  );
}
