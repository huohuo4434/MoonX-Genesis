import type { Metadata } from "next";
import Link from "next/link";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { PublicFeaturePreview } from "@/components/access/PublicFeaturePreview";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { assessAltcoinRadarPost } from "@/lib/trading-signals/altcoin-radar";
import {
  externalAnalystConfigurationSummary,
  getLatestExternalAnalystPosts,
} from "@/lib/trading-signals/external-analyst-signals";
import { formatDateTimeChina } from "@/lib/utils/datetime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const path = "/member/alpha-feed";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: path,
    titleZh: "山寨币资金雷达与KOL观察",
    titleEn: "Altcoin Rotation Radar",
    descriptionZh: "会员专享：跟踪btckik等外部分析源，提取首次提及、币种、方向、阶段和追高风险。",
    descriptionEn: "Member-only monitoring of external analysts, including first mentions, assets, direction, stage and chase risk.",
  });
}

function directionLabel(direction: "LONG" | "SHORT" | "NEUTRAL", en: boolean): string {
  if (direction === "LONG") return en ? "Bullish watch" : "偏多观察";
  if (direction === "SHORT") return en ? "Bearish watch" : "偏空观察";
  return en ? "Neutral / unclear" : "中性 / 不明确";
}

export default async function AlphaFeedPage() {
  const locale = await getRequestLocale();
  const en = locale === "en";
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED" || gate.status === "MEMBERSHIP_REQUIRED") {
    return (
      <main><Section spacing="lg"><PublicFeaturePreview
        eyebrow={en ? "Member radar · Public preview" : "会员资金雷达 · 公开预览"}
        title={en ? "Follow the process, not a blind call" : "跟踪他的节奏，而不是盲目跟单"}
        description={en ? "MOOX extracts the mentioned asset, direction, stage, levels and chase risk from selected external analysts. It is an observation layer, not an automatic buy instruction." : "MOOX从精选外部分析源中提取币种、方向、阶段、关键位置和追高风险。它是观察层，不是自动买入指令。"}
        solves={en ? ["See new mentions without manually refreshing X", "Separate early ideas from already-overheated moves", "Preserve the original post and time for later verification"] : ["不用反复刷新X也能看到新提及", "区分早期埋伏与已经过热的行情", "保留原帖和时间，便于事后验证"]}
        memberBenefits={en ? ["btckik altcoin rotation feed", "Asset and direction extraction", "Early/confirmation/overheated classification", "Original-source link and timestamp"] : ["btckik山寨币轮动观察", "币种与方向自动提取", "早期/确认/过热阶段分类", "原帖链接与发布时间留档"]}
        exampleTitle={en ? "Example assessment" : "示例判断"}
        exampleLines={en ? ["Stage: Early watch", "Action: Add to watch, do not chase", "Confirm: Volume + liquidity + price structure", "Risk: High volatility and low liquidity"] : ["阶段：早期观察", "动作：加入观察，不直接追单", "确认：成交量＋流动性＋价格结构", "风险：高波动与低流动性"]}
        nextPath={en ? `/en${path}` : path}
      /></Section></main>
    );
  }
  if (gate.status === "DEVICE_REQUIRED") {
    return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;
  }

  const posts = await getLatestExternalAnalystPosts({ source: "BTCKIK", limit: 40 });
  const configured = externalAnalystConfigurationSummary().some((row) => row.source === "BTCKIK");

  return (
    <main>
      <Section spacing="lg">
        <MemberDeviceHeartbeat />
        <div className="max-w-3xl">
          <Text variant="caption" color="tertiary" className="font-mono uppercase tracking-[0.18em]">MOOX SMART MONEY · KOL RADAR</Text>
          <Heading as="h1" size="h2" className="mt-2">{en ? "Altcoin Rotation Radar" : "山寨币资金雷达"}</Heading>
          <Text variant="body" color="secondary" className="mt-3 leading-relaxed">
            {en ? "The first monitored source is @btckik. MOOX records posts, extracts mentioned assets and classifies whether an idea looks early, confirmed or already overheated. No post becomes an automatic trade." : "第一位重点监测源为 @btckik。MOOX会记录原帖、提取币种，并判断它更接近早期观察、触发确认还是已经过热。任何帖子都不会直接变成自动交易。"}
          </Text>
        </div>

        <Card padding="md" className="border border-amber-500/20 bg-amber-500/[0.05]">
          <Text variant="body-sm" weight="semibold">{en ? "Execution rule" : "执行规则"}</Text>
          <Text variant="caption" color="tertiary" className="mt-1 block leading-relaxed">
            {en ? "Monitor → verify liquidity and price → define invalidation → consider a small position. Never buy only because a KOL mentioned a token." : "监控 → 核对流动性和价格 → 写明失效条件 → 才考虑小仓。绝不因为KOL提到一个币就直接买入。"}
          </Text>
        </Card>

        {!configured || posts.length === 0 ? (
          <Card padding="lg" className="border border-dashed border-white/10">
            <Heading as="h2" size="h3">{en ? "Waiting for the first synced post" : "等待首批同步帖子"}</Heading>
            <Text variant="body-sm" color="secondary" className="mt-2 leading-relaxed">
              {en ? "The monitor is registered. To fetch posts automatically, configure X_BEARER_TOKEN or MOOX_EXTERNAL_ANALYST_FEED_URL in Vercel, then let the 15-minute cron run." : "监测源已经登记。要自动读取帖子，请在Vercel配置 X_BEARER_TOKEN 或 MOOX_EXTERNAL_ANALYST_FEED_URL，随后由15分钟定时任务同步。"}
            </Text>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {posts.map((post) => {
              const assessment = assessAltcoinRadarPost(post);
              return (
                <Card key={`${post.source}-${post.postId}`} padding="md" className="flex h-full flex-col border border-white/[0.08] bg-gradient-to-br from-white/[0.035] to-transparent">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">@{post.username}</Badge>
                    <Badge variant={assessment.risk === "HIGH" ? "danger" : assessment.risk === "MEDIUM" ? "warning" : "outline"}>{en ? assessment.labelEn : assessment.labelZh}</Badge>
                    <Badge variant="outline">{directionLabel(post.direction, en)}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {post.symbols.length ? post.symbols.map((symbol) => <Badge key={symbol} variant="neutral">{symbol.replace(/USDT$/, "")}</Badge>) : <Badge variant="outline">{en ? "No clear ticker" : "未提取明确币种"}</Badge>}
                  </div>
                  <Text variant="body-sm" className="mt-3 block whitespace-pre-wrap leading-relaxed text-white/80">{post.summary}</Text>
                  <div className="mt-4 rounded-md border border-white/[0.07] bg-black/20 p-3">
                    <Text variant="caption" color="tertiary" className="block">{en ? "MOOX action" : "MOOX处理建议"}</Text>
                    <Text variant="body-sm" className="mt-1 block leading-relaxed">{en ? assessment.actionEn : assessment.actionZh}</Text>
                  </div>
                  <div className="mt-auto pt-4 text-caption text-white/40">
                    <p>{formatDateTimeChina(post.postedAt)} · {en ? "Parser confidence" : "解析置信度"} {post.confidence}%</p>
                    <Link href={post.postUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-cyan-300/80 underline underline-offset-4">{en ? "Open original post" : "打开原帖"}</Link>
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
