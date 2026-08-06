import type { Metadata } from "next";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { PublicFeaturePreview } from "@/components/access/PublicFeaturePreview";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { assessAltcoinRadarPost } from "@/lib/trading-signals/altcoin-radar";
import { getLatestExternalAnalystPosts } from "@/lib/trading-signals/external-analyst-signals";
import { formatDateTimeChina } from "@/lib/utils/datetime";
import type { ExternalAnalystParsedPost } from "@/types/external-analyst";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const path = "/member/alpha-feed";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: path,
    titleZh: "山寨币资金雷达",
    titleEn: "Altcoin Rotation Radar",
    descriptionZh: "会员专享：聚合公开市场资金线索，识别币种、方向、阶段、关键位置和追高风险。",
    descriptionEn: "Member-only aggregation of public market signals, including assets, direction, stage, key levels and chase risk.",
  });
}

function directionLabel(direction: "LONG" | "SHORT" | "NEUTRAL", en: boolean): string {
  if (direction === "LONG") return en ? "Bullish watch" : "偏多观察";
  if (direction === "SHORT") return en ? "Bearish watch" : "偏空观察";
  return en ? "Neutral / unclear" : "中性 / 不明确";
}

function compactLevels(post: ExternalAnalystParsedPost, en: boolean): string | null {
  const levels = Array.from(new Set([
    ...post.supportLevels,
    ...post.resistanceLevels,
    ...post.targetLevels,
    ...post.invalidationLevels,
    ...post.keyLevels,
  ])).filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b).slice(0, 6);
  if (!levels.length) return null;
  return `${en ? "Key levels" : "关键位置"}: ${levels.join(" / ")}`;
}

function radarSummary(post: ExternalAnalystParsedPost, en: boolean): string {
  const assetCount = post.symbols.length;
  const direction = directionLabel(post.direction, en);
  if (en) {
    return assetCount
      ? `The radar captured ${assetCount} asset${assetCount === 1 ? "" : "s"}. Current classification: ${direction}. Wait for liquidity, volume and price structure confirmation before acting.`
      : "No clear asset ticker was extracted. Keep this item in observation status and do not convert it into a trade.";
  }
  return assetCount
    ? `雷达捕捉到${assetCount}个明确币种，当前归类为“${direction}”。执行前仍需核对流动性、成交量和价格结构。`
    : "暂未提取到明确币种，本条仅保留观察，不转化为交易。";
}

export default async function AlphaFeedPage() {
  const locale = await getRequestLocale();
  const en = locale === "en";
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED" || gate.status === "MEMBERSHIP_REQUIRED") {
    return (
      <main><Section spacing="lg"><PublicFeaturePreview
        eyebrow={en ? "Member smart-money radar · Public preview" : "会员资金雷达 · 公开预览"}
        title={en ? "Track capital rotation, not a blind call" : "捕捉资金节奏，不盲目追单"}
        description={en ? "MOOX aggregates public market signals and extracts assets, direction, stage, key levels and chase risk. It is an observation layer, not an automatic buy instruction." : "MOOX聚合公开市场信息与资金线索，提取币种、方向、阶段、关键位置和追高风险。它是观察层，不是自动买入指令。"}
        solves={en ? ["Reduce repeated manual scanning", "Separate early ideas from overheated moves", "Keep a timestamped record for later verification"] : ["减少反复手动刷信息", "区分早期机会与已经过热的行情", "保留雷达时间，便于事后验证"]}
        memberBenefits={en ? ["Altcoin rotation radar", "Asset and direction extraction", "Early/confirmation/overheated classification", "Key levels and risk notes"] : ["山寨币轮动雷达", "币种与方向自动提取", "早期/确认/过热阶段分类", "关键位置与风险提示"]}
        exampleTitle={en ? "Example assessment" : "示例判断"}
        exampleLines={en ? ["Stage: Early watch", "Action: Add to watch, do not chase", "Confirm: Volume + liquidity + price structure", "Risk: High volatility and low liquidity"] : ["阶段：早期观察", "动作：加入观察，不直接追单", "确认：成交量＋流动性＋价格结构", "风险：高波动与低流动性"]}
        nextPath={en ? `/en${path}` : path}
      /></Section></main>
    );
  }
  if (gate.status === "DEVICE_REQUIRED") {
    return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;
  }

  // Data-source identities stay server-side. The member interface only displays MOOX's secondary analysis.
  const posts = await getLatestExternalAnalystPosts({ source: "BTCKIK", limit: 40 });

  return (
    <main>
      <Section spacing="lg">
        <MemberDeviceHeartbeat />
        <div className="max-w-3xl">
          <Text variant="caption" color="tertiary" className="font-mono uppercase tracking-[0.18em]">MOOX SMART MONEY · NARRATIVE RADAR</Text>
          <Heading as="h1" size="h2" className="mt-2">{en ? "Altcoin Rotation Radar" : "山寨币资金雷达"}</Heading>
          <Text variant="body" color="secondary" className="mt-3 leading-relaxed">
            {en ? "MOOX aggregates public market signals, extracts mentioned assets and classifies whether an idea looks early, confirmed or already overheated. The interface displays only MOOX's secondary analysis; no item becomes an automatic trade." : "MOOX聚合公开市场资金线索，提取币种，并判断它更接近早期观察、触发确认还是已经过热。前台只展示MOOX二次分析结果，任何线索都不会直接变成自动交易。"}
          </Text>
        </div>

        <Card padding="md" className="border border-amber-500/20 bg-amber-500/[0.05]">
          <Text variant="body-sm" weight="semibold">{en ? "Execution rule" : "执行规则"}</Text>
          <Text variant="caption" color="tertiary" className="mt-1 block leading-relaxed">
            {en ? "Observe → verify liquidity and price → define invalidation → consider a small position. Never buy only because a single market clue mentions an asset." : "观察 → 核对流动性和价格 → 写明失效条件 → 才考虑小仓。绝不因为单一市场线索出现某个币就直接买入。"}
          </Text>
        </Card>

        {posts.length === 0 ? (
          <Card padding="lg" className="border border-dashed border-white/10">
            <Heading as="h2" size="h3">{en ? "Waiting for the first radar data" : "等待首批雷达数据"}</Heading>
            <Text variant="body-sm" color="secondary" className="mt-2 leading-relaxed">
              {en ? "No valid item is ready for display yet. Data will appear automatically after the background sync and MOOX screening are complete." : "目前尚无达到展示标准的有效线索。后台同步和MOOX筛选完成后会自动显示，会员无需进行任何配置。"}
            </Text>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {posts.map((post) => {
              const assessment = assessAltcoinRadarPost(post);
              const levels = compactLevels(post, en);
              return (
                <Card key={`${post.source}-${post.postId}`} padding="md" className="flex h-full flex-col border border-white/[0.08] bg-gradient-to-br from-white/[0.035] to-transparent">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={assessment.risk === "HIGH" ? "danger" : assessment.risk === "MEDIUM" ? "warning" : "outline"}>{en ? assessment.labelEn : assessment.labelZh}</Badge>
                    <Badge variant="outline">{directionLabel(post.direction, en)}</Badge>
                    <Badge variant={assessment.risk === "HIGH" ? "danger" : assessment.risk === "MEDIUM" ? "warning" : "outline"}>{en ? `${assessment.risk} risk` : `${assessment.risk === "HIGH" ? "高" : assessment.risk === "MEDIUM" ? "中" : "低"}风险`}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {post.symbols.length ? post.symbols.map((symbol) => <Badge key={symbol} variant="neutral">{symbol.replace(/USDT$/, "")}</Badge>) : <Badge variant="outline">{en ? "No clear ticker" : "未提取明确币种"}</Badge>}
                  </div>
                  <Text variant="body-sm" className="mt-3 block leading-relaxed text-white/80">{radarSummary(post, en)}</Text>
                  {(levels || post.timeWindows.length > 0) && (
                    <div className="mt-3 rounded-md border border-white/[0.07] bg-black/20 p-3">
                      {levels && <Text variant="caption" color="secondary" className="block leading-relaxed">{levels}</Text>}
                      {post.timeWindows.length > 0 && <Text variant="caption" color="secondary" className="mt-1 block leading-relaxed">{en ? "Time window" : "时间窗口"}: {post.timeWindows.slice(0, 4).join(" / ")}</Text>}
                    </div>
                  )}
                  <div className="mt-3 rounded-md border border-white/[0.07] bg-black/20 p-3">
                    <Text variant="caption" color="tertiary" className="block">{en ? "MOOX action" : "MOOX处理建议"}</Text>
                    <Text variant="body-sm" className="mt-1 block leading-relaxed">{en ? assessment.actionEn : assessment.actionZh}</Text>
                  </div>
                  <div className="mt-auto pt-4 text-caption text-white/40">
                    <p>{en ? "Radar time" : "雷达记录时间"}: {formatDateTimeChina(post.postedAt)} · {en ? "Analysis confidence" : "解析置信度"} {post.confidence}%</p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Section>
    </main>
  );
}
