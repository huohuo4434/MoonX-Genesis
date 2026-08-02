import { Badge, Card, Heading, Text } from "@/components/ui";
import type { TradeSignalRecord, TradeSignalStarStat } from "@/types/trading-signal";

function stars(level: number) {
  return `${"★".repeat(level)}${"☆".repeat(5 - level)}`;
}

function statusText(status: TradeSignalRecord["status"]): string {
  const labels: Record<TradeSignalRecord["status"], string> = {
    DRAFT: "草稿",
    PUBLISHED: "已发布",
    ARMED: "等待行情/触发",
    TRIGGERED: "已触发",
    ACTIVE: "模拟持仓中",
    TAKE_PROFIT: "分批止盈中",
    STOPPED: "已止损",
    CANCELLED: "已取消",
    CLOSED: "已结束",
  };
  return labels[status];
}

function normalizedSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/[-_/\s]/g, "").replace(/USDT$/, "");
}

function automaticPriceSource(symbol: string): string | null {
  const normalized = normalizedSymbol(symbol);
  if (["BTC", "ETH", "HYPE"].includes(normalized)) return "Bitget / Hyperliquid自动行情";
  if (normalized === "ASTEROID") return "DexScreener链上行情";
  if (["MU", "WTI", "688825"].includes(normalized)) return "Yahoo自动行情";
  return null;
}

function waitingReason(signal: TradeSignalRecord): string | null {
  if (signal.status !== "ARMED") return null;
  const source = automaticPriceSource(signal.symbol);
  if (signal.entryLow == null || signal.entryHigh == null) {
    return source
      ? `正在等待服务器取得首个有效价格；取得后会自动生成入场、止损与1R/2R/3R目标。行情来源：${source}。`
      : "该品种尚未配置自动行情，需要管理员输入一次真实价格。";
  }
  return "计划已经完整，等待价格进入入场区或达到触发条件。";
}

export function MemberTradingSignals({
  signals,
  stats,
}: {
  signals: TradeSignalRecord[];
  stats: TradeSignalStarStat[];
}) {
  const visible = signals.filter(
    (signal) => signal.apiVisible && !["DRAFT", "CANCELLED", "CLOSED"].includes(signal.status)
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Heading size="h2">AI交易信号</Heading>
          <Text variant="body-sm" color="secondary" className="mt-2 block">
            只展示已发布的模拟信号。入场、止损和止盈条件在发布后锁定，历史记录不会事后改写。
          </Text>
        </div>
        <a
          href="https://t.me/jackuwin"
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-primary/30 bg-primary/[0.06] px-4 py-3 text-sm transition hover:border-primary/60 hover:bg-primary/[0.1]"
        >
          <span className="block text-white/55">有问题可联系电报客服</span>
          <span className="mt-1 block font-semibold text-primary">@jackuwin</span>
        </a>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {visible.map((signal) => {
          const wait = waitingReason(signal);
          return (
            <Card key={signal.id} padding="lg" className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Text variant="body" weight="semibold">
                    {signal.assetName} {signal.symbol}
                  </Text>
                  <Text variant="caption" color="tertiary" className="mt-1 block">
                    {signal.timeframe} · {statusText(signal.status)}
                  </Text>
                </div>
                <Badge variant="outline">
                  {stars(signal.starLevel)} {signal.consensusScore}
                </Badge>
              </div>

              <div className="grid gap-2 text-sm md:grid-cols-2">
                <div>方向：{signal.direction}</div>
                <div>入场：{signal.entryLow ?? "—"}—{signal.entryHigh ?? "—"}</div>
                <div>触发：{signal.triggerPrice ?? "—"}</div>
                <div>止损：{signal.stopLoss ?? "—"}（{signal.stopConfirmTimeframe}确认）</div>
                <div className="md:col-span-2">
                  目标：{[signal.target1, signal.target2, signal.target3].filter(Boolean).join(" / ") || "—"}
                </div>
              </div>

              <Text variant="body-sm" color="secondary">
                {signal.executionPlan}
              </Text>

              {wait ? (
                <div className="rounded-md border border-amber-400/20 bg-amber-400/[0.035] p-3 text-sm text-amber-100/85">
                  <div className="font-medium">为什么暂时没有完整价位</div>
                  <div className="mt-1 text-amber-100/65">{wait}</div>
                </div>
              ) : null}

              <div className="rounded-md border border-white/10 p-3 text-sm">
                <div className="font-medium">判断失效后必须退出</div>
                <div className="mt-1 text-white/60">{signal.invalidation || "未填写"}</div>
              </div>
            </Card>
          );
        })}
      </div>

      {!visible.length ? (
        <Card padding="lg">
          <Text variant="body-sm" color="secondary">暂无已经发布的交易信号。</Text>
        </Card>
      ) : null}

      <div>
        <Heading size="h3" className="mb-3">同星级历史表现</Heading>
        <div className="grid gap-3 md:grid-cols-5">
          {stats.map((stat) => (
            <Card key={stat.starLevel} padding="md">
              <Text variant="body" weight="semibold">{stars(stat.starLevel)}</Text>
              <Text variant="caption" color="tertiary" className="mt-2 block">样本 {stat.sampleCount}</Text>
              <Text variant="body-sm" className="mt-1 block">
                {stat.winRate == null ? "样本积累中" : `胜率 ${stat.winRate}%`}
              </Text>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
