import { Badge, Card, Heading, Text } from "@/components/ui";
import { assetDisplayName, assetDisplaySymbol, assetVenue } from "@/lib/presentation/asset-catalog";
import { cleanMemberCopy, directionLabel, signalStatusLabel, timeframeLabel } from "@/lib/presentation/public-copy";
import type { TradeSignalRecord, TradeSignalStarStat } from "@/types/trading-signal";

function stars(level: number) {
  return `${"★".repeat(level)}${"☆".repeat(5 - level)}`;
}

function waitingReason(signal: TradeSignalRecord): string | null {
  if (signal.status !== "ARMED") return null;
  if (signal.entryLow == null || signal.entryHigh == null) {
    return "正在等待自动行情取得有效价格。取得后会生成入场区、止损和分批目标；没有有效价格前不会模拟入场。";
  }
  return "计划价位已经生成，正在等待价格进入入场区并满足确认条件。";
}

export function MemberTradingSignals({ signals, stats }: { signals: TradeSignalRecord[]; stats: TradeSignalStarStat[] }) {
  const visible = signals.filter((signal) => signal.apiVisible && !["DRAFT", "CANCELLED", "CLOSED"].includes(signal.status));
  const usefulStats = stats.filter((stat) => stat.sampleCount > 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Heading size="h2">AI交易信号</Heading>
          <Text variant="body-sm" color="secondary" className="mt-2 block">只展示已发布的模拟计划。入场、止损和止盈在计划生成后保留原始记录，不根据结果倒改。</Text>
        </div>
        <a href="https://t.me/jackuwin" target="_blank" rel="noreferrer" className="rounded-lg border border-primary/30 bg-primary/[0.06] px-4 py-3 text-sm transition hover:border-primary/60">
          <span className="block text-white/55">有问题可联系电报客服</span><span className="mt-1 block font-semibold text-primary">@jackuwin</span>
        </a>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {visible.map((signal) => {
          const wait = waitingReason(signal);
          const symbol = assetDisplaySymbol(signal.symbol);
          const name = assetDisplayName(signal.symbol, signal.assetName);
          return (
            <Card key={signal.id} padding="lg" className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Text variant="body" weight="semibold">{name} <span className="text-foreground-tertiary">{symbol}</span></Text>
                  <Text variant="caption" color="tertiary" className="mt-1 block">{assetVenue(signal.symbol)} · {timeframeLabel(signal.timeframe)} · {signalStatusLabel(signal.status)}</Text>
                </div>
                <Badge variant="outline">{stars(signal.starLevel)} {signal.consensusScore}</Badge>
              </div>

              <div className="grid gap-2 text-sm md:grid-cols-2">
                <div>方向：{directionLabel(signal.direction)}</div>
                <div>入场区：{signal.entryLow ?? "等待价格"}{signal.entryLow != null ? `—${signal.entryHigh ?? signal.entryLow}` : ""}</div>
                <div>触发价：{signal.triggerPrice ?? "按计划条件确认"}</div>
                <div>止损：{signal.stopLoss ?? "待价格生成"}（{signal.stopConfirmTimeframe === "1D" ? "日线收盘确认" : signal.stopConfirmTimeframe}）</div>
                <div className="md:col-span-2">目标：{[signal.target1, signal.target2, signal.target3].filter(Boolean).join(" / ") || "待价格生成"}</div>
              </div>

              {cleanMemberCopy(signal.executionPlan) ? <Text variant="body-sm" color="secondary">{cleanMemberCopy(signal.executionPlan)}</Text> : null}
              {wait ? <div className="rounded-md border border-amber-400/20 bg-amber-400/[0.035] p-3 text-sm text-amber-100/80"><div className="font-medium">当前进度</div><div className="mt-1">{wait}</div></div> : null}
              <div className="rounded-md border border-white/10 p-3 text-sm"><div className="font-medium">失效与退出条件</div><div className="mt-1 text-white/60">{cleanMemberCopy(signal.invalidation) || "计划生成后显示"}</div></div>
            </Card>
          );
        })}
      </div>

      {!visible.length ? <Card padding="lg"><Text variant="body-sm" color="secondary">当前没有已发布的交易计划。</Text></Card> : null}

      {usefulStats.length ? (
        <div><Heading size="h3" className="mb-3">同星级历史表现</Heading><div className="grid gap-3 md:grid-cols-5">{usefulStats.map((stat) => <Card key={stat.starLevel} padding="md"><Text variant="body" weight="semibold">{stars(stat.starLevel)}</Text><Text variant="caption" color="tertiary" className="mt-2 block">样本 {stat.sampleCount}</Text><Text variant="body-sm" className="mt-1 block">{stat.winRate == null ? "样本积累中" : `胜率 ${stat.winRate}%`}</Text></Card>)}</div></div>
      ) : (
        <Card padding="md"><Text variant="body-sm" color="secondary">历史交易样本形成后，这里再展示同星级表现；当前不显示无意义的零样本卡片。</Text></Card>
      )}
    </div>
  );
}
