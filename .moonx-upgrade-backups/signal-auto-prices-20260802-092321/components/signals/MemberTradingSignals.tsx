import { Badge, Card, Heading, Text } from "@/components/ui";
import type { TradeSignalRecord, TradeSignalStarStat } from "@/types/trading-signal";

function stars(level: number) {
  return `${"★".repeat(level)}${"☆".repeat(5 - level)}`;
}

export function MemberTradingSignals({ signals, stats }: { signals: TradeSignalRecord[]; stats: TradeSignalStarStat[] }) {
  const visible = signals.filter((signal) => signal.apiVisible && !["DRAFT", "CANCELLED", "CLOSED"].includes(signal.status));
  return <div className="space-y-8">
    <div><Heading size="h2">AI交易信号</Heading><Text variant="body-sm" color="secondary" className="mt-2 block">只展示已发布的模拟信号。入场、止损和止盈条件在发布后锁定，历史记录不会事后改写。</Text></div>
    <div className="grid gap-4 xl:grid-cols-2">{visible.map((signal) => <Card key={signal.id} padding="lg" className="space-y-4"><div className="flex items-start justify-between gap-3"><div><Text variant="body" weight="semibold">{signal.assetName} {signal.symbol}</Text><Text variant="caption" color="tertiary" className="mt-1 block">{signal.timeframe} · {signal.status}</Text></div><Badge variant="outline">{stars(signal.starLevel)} {signal.consensusScore}</Badge></div><div className="grid gap-2 text-sm md:grid-cols-2"><div>方向：{signal.direction}</div><div>入场：{signal.entryLow ?? "—"}—{signal.entryHigh ?? "—"}</div><div>触发：{signal.triggerPrice ?? "—"}</div><div>止损：{signal.stopLoss ?? "—"}（{signal.stopConfirmTimeframe}确认）</div><div className="md:col-span-2">目标：{[signal.target1,signal.target2,signal.target3].filter(Boolean).join(" / ") || "—"}</div></div><Text variant="body-sm" color="secondary">{signal.executionPlan}</Text><div className="rounded-md border border-white/10 p-3 text-sm"><div className="font-medium">判断失效后必须退出</div><div className="mt-1 text-white/60">{signal.invalidation || "未填写"}</div></div></Card>)}</div>
    {!visible.length ? <Card padding="lg"><Text variant="body-sm" color="secondary">暂无已经发布的交易信号。</Text></Card> : null}
    <div><Heading size="h3" className="mb-3">同星级历史表现</Heading><div className="grid gap-3 md:grid-cols-5">{stats.map((stat) => <Card key={stat.starLevel} padding="md"><Text variant="body" weight="semibold">{stars(stat.starLevel)}</Text><Text variant="caption" color="tertiary" className="mt-2 block">样本 {stat.sampleCount}</Text><Text variant="body-sm" className="mt-1 block">{stat.winRate == null ? "样本积累中" : `胜率 ${stat.winRate}%`}</Text></Card>)}</div></div>
  </div>;
}
