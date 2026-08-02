"use client";

import { useState } from "react";
import { Badge, Button, Card, Text } from "@/components/ui";
import type { VibeConnectionStatus, VibeEvidenceSnapshot } from "@/types/vibe-evidence";

type Payload = {
  records?: VibeEvidenceSnapshot[];
  refreshed?: string[];
  connection?: VibeConnectionStatus | null;
  error?: string;
};

function timeText(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function scoreClass(score: number): string {
  if (score >= 18) return "text-emerald-300";
  if (score <= -18) return "text-red-300";
  return "text-amber-200";
}

export function VibeEvidenceAdminClient({
  initialRecords,
  initialConnection,
}: {
  initialRecords: VibeEvidenceSnapshot[];
  initialConnection: VibeConnectionStatus;
}) {
  const [records, setRecords] = useState(initialRecords);
  const [connection, setConnection] = useState(initialConnection);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function testConnection() {
    setLoading("test");
    setMessage("");
    try {
      const response = await fetch("/api/admin/vibe-evidence?test=1", { cache: "no-store" });
      const payload = (await response.json()) as Payload;
      if (!response.ok) throw new Error(payload.error || "连接测试失败");
      if (payload.records) setRecords(payload.records);
      if (payload.connection) setConnection(payload.connection);
      setMessage(payload.connection?.healthy ? "Vibe后端连接正常" : payload.connection?.error || "连接未就绪");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "连接测试失败");
    } finally {
      setLoading(null);
    }
  }

  async function refresh(assetId?: string) {
    setLoading(assetId || "all");
    setMessage("");
    try {
      const response = await fetch("/api/admin/vibe-evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh", assetId }),
      });
      const payload = (await response.json()) as Payload;
      if (!response.ok) throw new Error(payload.error || "刷新失败");
      if (payload.records) setRecords(payload.records);
      if (payload.connection) setConnection(payload.connection);
      setMessage(`已刷新 ${payload.refreshed?.length ?? 0} 个资产的Vibe证据`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "刷新失败");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-5">
      <Card padding="lg" className="space-y-4 border-cyan-400/15 bg-cyan-400/[0.025]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Text variant="body" weight="semibold">Vibe-Research连接</Text>
            <Text variant="body-sm" color="secondary" className="mt-1 block max-w-3xl">
              MoonX只读取客观数据端点，再计算证据分。Vibe不直接预测涨跌，不触发自动下单，也不会覆盖已锁定的六爻预测。
            </Text>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={Boolean(loading)} onClick={testConnection}>
              {loading === "test" ? "测试中…" : "测试连接"}
            </Button>
            <Button disabled={Boolean(loading)} onClick={() => refresh()}>
              {loading === "all" ? "刷新中…" : "刷新全部证据"}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-white/[0.07] p-3">
            <p className="text-caption text-white/40">配置状态</p>
            <p className="mt-1 text-body-sm text-white/80">{connection.configured ? "已配置" : "未配置"}</p>
          </div>
          <div className="rounded-lg border border-white/[0.07] p-3">
            <p className="text-caption text-white/40">连接状态</p>
            <p className={`mt-1 text-body-sm ${connection.healthy ? "text-emerald-300" : "text-amber-200"}`}>
              {connection.healthy ? "正常" : "使用内置快照"}
            </p>
          </div>
          <div className="rounded-lg border border-white/[0.07] p-3">
            <p className="text-caption text-white/40">API密钥</p>
            <p className="mt-1 text-body-sm text-white/80">{connection.apiKeyConfigured ? "已配置" : "未配置/后端未启用"}</p>
          </div>
          <div className="rounded-lg border border-white/[0.07] p-3">
            <p className="text-caption text-white/40">最近检查</p>
            <p className="mt-1 text-body-sm text-white/80">{timeText(connection.checkedAt)}</p>
          </div>
        </div>

        {!connection.configured ? (
          <div className="rounded-lg border border-amber-400/20 bg-amber-400/[0.04] p-3 text-body-sm text-amber-100/80">
            在Vercel环境变量中添加 VIBE_RESEARCH_BASE_URL；若Vibe后端设置了VR_API_KEY，再添加 VIBE_RESEARCH_API_KEY。未配置前页面继续使用内置证据快照，不会空白。
          </div>
        ) : null}
        {connection.error ? <Text variant="caption" className="block text-amber-200/70">{connection.error}</Text> : null}
        {message ? <Text variant="body-sm" className="block text-primary">{message}</Text> : null}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {records.map((record) => (
          <Card key={record.assetId} padding="md" className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Text variant="body" weight="semibold">{record.nameZh} <span className="text-white/40">{record.symbol}</span></Text>
                  <Badge variant="outline">{record.sourceMode === "VIBE_API" ? "Vibe API" : "内置快照"}</Badge>
                </div>
                <Text variant="caption" color="tertiary" className="mt-1 block">
                  更新 {timeText(record.updatedAt)} · 完整度 {record.completeness}% · 新鲜度 {record.freshness}%
                </Text>
              </div>
              <div className="text-right">
                <p className={`font-mono text-xl font-semibold ${scoreClass(record.effectiveScore)}`}>
                  {record.effectiveScore > 0 ? "+" : ""}{record.effectiveScore}
                </p>
                <p className="text-caption text-white/45">{record.stance}</p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-5">
              {record.dimensions.map((item) => (
                <div key={item.key} className="rounded-lg border border-white/[0.07] p-2">
                  <p className="text-caption text-white/45">{item.labelZh}</p>
                  <p className={`mt-1 font-mono text-caption ${item.available ? scoreClass(item.score) : "text-white/25"}`}>
                    {item.available ? `${item.score > 0 ? "+" : ""}${item.score}` : "缺失"}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-emerald-400/10 p-3">
                <p className="text-caption text-emerald-200/80">支持证据</p>
                <ul className="mt-2 space-y-1 text-caption text-white/55">
                  {record.supports.slice(0, 4).map((item) => <li key={item}>· {item}</li>)}
                </ul>
              </div>
              <div className="rounded-lg border border-red-400/10 p-3">
                <p className="text-caption text-red-200/80">风险证据</p>
                <ul className="mt-2 space-y-1 text-caption text-white/55">
                  {record.risks.slice(0, 4).map((item) => <li key={item}>· {item}</li>)}
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-caption text-white/35">{record.lastError ? `提示：${record.lastError}` : "最近刷新无错误"}</p>
              <Button size="sm" variant="outline" disabled={Boolean(loading)} onClick={() => refresh(record.assetId)}>
                {loading === record.assetId ? "刷新中…" : "刷新此资产"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
