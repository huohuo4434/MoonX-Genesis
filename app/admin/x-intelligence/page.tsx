import { AdminNav } from "@/components/admin/AdminNav";
import { Badge, Card, Heading, Text } from "@/components/ui";
import { getXIntelligenceSnapshot } from "@/lib/trading-signals/x-intelligence-summary";
import { formatDateTimeChina } from "@/lib/utils/datetime";
import { buildXIntelligenceAutoWeight } from "@/lib/trading-signals/x-intelligence-overlay";
import type {
  XIntelligenceDirection,
  XIntelligenceMomentum,
  XIntelligenceStage,
} from "@/lib/trading-signals/x-intelligence-core";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function statusVariant(status: string): "success" | "warning" | "danger" | "outline" {
  if (status === "HEALTHY") return "success";
  if (status === "STALE" || status === "NO_DATA") return "warning";
  if (status === "ERROR" || status === "NOT_CONFIGURED") return "danger";
  return "outline";
}

function statusLabel(status: string): string {
  if (status === "HEALTHY") return "运行正常";
  if (status === "STALE") return "心跳过期";
  if (status === "ERROR") return "最近一轮异常";
  if (status === "NOT_CONFIGURED") return "尚未配置";
  return "等待首次心跳";
}

function directionLabel(direction: XIntelligenceDirection): string {
  if (direction === "LONG") return "偏多";
  if (direction === "SHORT") return "偏空";
  return "中性";
}

function momentumLabel(momentum: XIntelligenceMomentum): string {
  if (momentum === "NEW") return "新出现";
  if (momentum === "ACCELERATING") return "热度加速";
  if (momentum === "COOLING") return "热度降温";
  return "热度平稳";
}

function stageLabel(stage: XIntelligenceStage): string {
  if (stage === "EARLY_WATCH") return "早期观察";
  if (stage === "CONFIRMATION") return "确认阶段";
  if (stage === "OVERHEATED") return "可能过热";
  return "信息观察";
}

export default async function AdminXIntelligencePage() {
  const snapshot = await getXIntelligenceSnapshot({ force: true });
  const { collector, aggregate } = snapshot;

  return (
    <main className="mx-auto w-full max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <AdminNav current="/admin/x-intelligence" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Text variant="caption" color="tertiary" className="font-mono uppercase tracking-[0.18em]">
            MOOX X INTELLIGENCE · PRIVATE OPERATIONS
          </Text>
          <Heading as="h1" size="h2" className="mt-2">X情报中枢</Heading>
          <Text variant="body-sm" color="secondary" className="mt-2 max-w-4xl leading-relaxed">
            查看本地采集器是否正常、最近24小时捕捉到多少有效线索，以及系统为每个资产自动计算的X情报动态权重。采集、评分和权重计算均自动运行，不需要人工点按钮。后台不展示账号密码、Cookie，也不会把具体来源身份暴露给会员。
          </Text>
        </div>
        <Badge variant={statusVariant(collector.status)}>{statusLabel(collector.status)}</Badge>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card padding="md">
          <Text variant="caption" color="tertiary">最近心跳</Text>
          <Text variant="body" weight="semibold" className="mt-2 block">
            {formatDateTimeChina(collector.lastCheckedAt)}
          </Text>
          <Text variant="caption" color="secondary" className="mt-2 block leading-relaxed">
            {collector.message}
          </Text>
        </Card>
        <Card padding="md">
          <Text variant="caption" color="tertiary">本轮账号读取</Text>
          <Text variant="body" weight="semibold" className="mt-2 block">
            {collector.accountsSucceeded} / {collector.accountsAttempted || "—"}
          </Text>
          <Text variant="caption" color="secondary" className="mt-2 block">
            错误 {collector.errorCount} · 拒绝 {collector.rejectedPosts}
          </Text>
        </Card>
        <Card padding="md">
          <Text variant="caption" color="tertiary">24小时有效线索</Text>
          <Text variant="body" weight="semibold" className="mt-2 block">
            {aggregate.parsedPosts24h} 条
          </Text>
          <Text variant="caption" color="secondary" className="mt-2 block">
            覆盖 {aggregate.symbols24h} 个币种
          </Text>
        </Card>
        <Card padding="md">
          <Text variant="caption" color="tertiary">24小时方向分布</Text>
          <Text variant="body" weight="semibold" className="mt-2 block">
            多 {aggregate.longSignals24h} · 空 {aggregate.shortSignals24h} · 中性 {aggregate.neutralSignals24h}
          </Text>
          <Text variant="caption" color="secondary" className="mt-2 block">
            7天累计有效 {aggregate.parsedPosts7d} 条
          </Text>
        </Card>
      </div>

      <Card padding="lg" className="mt-6 border border-amber-400/20 bg-amber-400/[0.04]">
        <Heading as="h2" size="h3">安全边界</Heading>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <Text variant="body-sm" color="secondary">· X登录凭据只保存在本机Windows DPAPI加密文件中。</Text>
          <Text variant="body-sm" color="secondary">· 网站只接收公开帖子与结构化结果，不接收Cookie。</Text>
          <Text variant="body-sm" color="secondary">· 会员前台不显示账号、作者、链接或合作暗示。</Text>
          <Text variant="body-sm" color="secondary">· X线索自动进入下一次日度预测生成，但最高只占辅助权重，不能单独触发实盘订单。</Text>
          <Text variant="body-sm" color="secondary">· 已锁定历史预测不会被X数据事后覆盖；新数据只影响后续新生成版本。</Text>
        </div>
      </Card>

      <div className="mt-6 flex items-center justify-between gap-4">
        <div>
          <Heading as="h2" size="h3">币种热度与方向</Heading>
          <Text variant="body-sm" color="secondary" className="mt-1">
            排序综合考虑24小时提及次数、近6小时增速、解析置信度和阶段。样本少时只作观察。
          </Text>
        </div>
        <Badge variant="outline">生成于 {formatDateTimeChina(aggregate.generatedAt)}</Badge>
      </div>

      {aggregate.summaries.length === 0 ? (
        <Card padding="lg" className="mt-4 border border-dashed border-white/10">
          <Heading as="h3" size="h3">暂时没有可聚合数据</Heading>
          <Text variant="body-sm" color="secondary" className="mt-2">
            完成Vercel密钥配置、本地Cookie配置并运行一次采集器后，这里会显示真实统计。
          </Text>
        </Card>
      ) : (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {aggregate.summaries.slice(0, 20).map((item) => {
            const autoWeight = buildXIntelligenceAutoWeight(item);
            return (
            <Card key={item.symbol} padding="md" className="border border-white/[0.08] bg-gradient-to-br from-white/[0.035] to-transparent">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="neutral">{item.symbol.replace(/USDT$/, "")}</Badge>
                  <Badge variant={item.direction === "LONG" ? "success" : item.direction === "SHORT" ? "danger" : "outline"}>
                    {directionLabel(item.direction)} {item.directionScore > 0 ? "+" : ""}{item.directionScore}
                  </Badge>
                  <Badge variant={item.risk === "HIGH" ? "danger" : item.risk === "MEDIUM" ? "warning" : "outline"}>
                    {stageLabel(item.dominantStage)}
                  </Badge>
                  {autoWeight ? <Badge variant="outline">自动权重 {autoWeight.weightPct}%</Badge> : null}
                </div>
                <Text variant="caption" color="tertiary">{momentumLabel(item.momentum)}</Text>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-white/10 p-2">
                  <Text variant="caption" color="tertiary" className="block">近6小时</Text>
                  <Text variant="body-sm" weight="semibold" className="mt-1 block">{item.mentions6h}</Text>
                </div>
                <div className="rounded-lg border border-white/10 p-2">
                  <Text variant="caption" color="tertiary" className="block">近24小时</Text>
                  <Text variant="body-sm" weight="semibold" className="mt-1 block">{item.mentions24h}</Text>
                </div>
                <div className="rounded-lg border border-white/10 p-2">
                  <Text variant="caption" color="tertiary" className="block">7天累计</Text>
                  <Text variant="body-sm" weight="semibold" className="mt-1 block">{item.mentions7d}</Text>
                </div>
              </div>

              <Text variant="caption" color="secondary" className="mt-3 block">
                24小时方向样本：偏多 {item.longCount24h} · 偏空 {item.shortCount24h} · 中性 {item.neutralCount24h} · 平均解析置信度 {item.averageConfidence}%
              </Text>
              <Text variant="caption" color="secondary" className="mt-2 block">
                独立信号源 {item.uniqueSources24h} 组 · 方向一致度 {Math.round(item.agreementRatio24h * 100)}%
                {autoWeight ? ` · 对上涨概率修订 ${autoWeight.probabilityShiftPct > 0 ? "+" : ""}${autoWeight.probabilityShiftPct} 个百分点` : ""}
              </Text>
              {item.keyLevels.length > 0 ? (
                <Text variant="caption" color="secondary" className="mt-2 block">
                  识别位置：{item.keyLevels.join(" / ")}
                </Text>
              ) : null}
              {item.timeWindows.length > 0 ? (
                <Text variant="caption" color="secondary" className="mt-2 block">
                  时间窗口：{item.timeWindows.join(" / ")}
                </Text>
              ) : null}
              <Text variant="caption" className="mt-3 block text-white/40">
                最近记录：{formatDateTimeChina(item.newestPostedAt)} · 当前统计样本 {item.sampleSize}
              </Text>
            </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
