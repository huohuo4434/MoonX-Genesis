import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangleIcon, ArrowRightIcon } from "@/components/icons";
import {
  AssetIntelligenceCard,
  CrossAssetConsensusSection,
  LongRangeTimeline,
  MoonXDataStatusPanel,
} from "@/components/research";
import { ConsensusOverviewSection } from "@/components/sections";
import { Badge, Button, Heading, Section, Text } from "@/components/ui";
import { getMemberUserContext } from "@/lib/access/member-preview";
import {
  getCrossAssetConsensus,
  getRiskDisclaimer,
  getSnapshotMetadata,
  listAssetIntelligenceSnapshots,
  listNasdaqLongRangeTimeline,
} from "@/lib/data/intelligence-snapshot";
import { loadMoonXResearchAsync } from "@/lib/moonx/load-research";
import { routes } from "@/lib/navigation";
import { formatLocalizedDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "情报快照 | MoonX",
  description: "MoonX 精选研究快照 — 公开方向与摘要；完整详情需会员权限。",
};

export default async function IntelligenceSnapshotPage() {
  const [user, snapshot, assets, consensus, timeline, riskDisclaimer, moonx] = await Promise.all([
    getMemberUserContext(),
    getSnapshotMetadata(),
    listAssetIntelligenceSnapshots(),
    getCrossAssetConsensus(),
    listNasdaqLongRangeTimeline(),
    getRiskDisclaimer(),
    loadMoonXResearchAsync(),
  ]);
  const isMember = user.isMember;
  const snapshotDateLabel = formatLocalizedDate(snapshot.snapshotDate, "zh-CN");

  return (
    <main>
      <Section spacing="lg">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning">{snapshot.statusLabel}</Badge>
            <Badge variant="outline">精选研究快照 — 非实时市场数据</Badge>
            <Badge variant="neutral" className="font-mono">
              快照：{snapshotDateLabel}
            </Badge>
          </div>

          {process.env.NODE_ENV !== "production" && (
            <MoonXDataStatusPanel
              version={moonx.version}
              lastUpdated={moonx.lastUpdated}
              assetCount={moonx.meta.assetCount}
              historySnapshotCount={moonx.meta.historySnapshotCount}
              validationStatus={moonx.meta.validationStatus}
              sourceFile={moonx.meta.sourceFile}
            />
          )}

          <Heading as="h1" size="display" className="max-w-3xl text-h1 lg:text-display">
            MoonX 情报快照
          </Heading>

          <Text variant="body-sm" color="tertiary" className="max-w-2xl">
            {snapshot.dataType} — {snapshot.dataSourceDisclosure}
          </Text>

          {!isMember && (
            <Text variant="body-sm" color="secondary" className="max-w-2xl rounded-md border border-primary/20 bg-primary/5 p-4">
              公开页仅展示综合方向与摘要。完整目标价、支撑压力、情景路径与详细证据为会员权益。
            </Text>
          )}

          <div className="flex flex-wrap gap-3">
            <Link href={routes.research} className="inline-flex items-center gap-1.5 text-body-sm text-foreground-secondary hover:text-primary focus-ring">
              研究框架库
              <ArrowRightIcon size={14} />
            </Link>
            <Link href={routes.verification} className="inline-flex items-center gap-1.5 text-body-sm text-foreground-secondary hover:text-primary focus-ring">
              历史验证
              <ArrowRightIcon size={14} />
            </Link>
          </div>

          <div className="mt-2 flex flex-col gap-2 rounded-lg border border-border/[0.08] bg-surface/60 p-lg">
            <Text variant="label" color="secondary" className="uppercase tracking-wide">
              MoonX 综合结论
            </Text>
            {snapshot.mainConclusion.map((paragraph) => (
              <Text key={paragraph} variant="body-sm" color="secondary">
                {paragraph}
              </Text>
            ))}
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-danger/20 bg-danger/5 p-lg">
            <AlertTriangleIcon size={18} className="mt-0.5 shrink-0 text-danger" />
            <Text variant="body-sm" color="secondary">
              {riskDisclaimer}
            </Text>
          </div>
        </div>
      </Section>

      <Section spacing="lg" className="border-t border-border/[0.06]">
        <div className="mb-10 flex flex-col gap-3">
          <Text variant="label" color="secondary" className="uppercase tracking-wide">
            资产概览
          </Text>
          <Heading as="h2" size="h2" className="max-w-2xl">
            MoonX 每日情报概览
          </Heading>
        </div>
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => (
            <AssetIntelligenceCard
              key={asset.id}
              asset={asset}
              verificationStatusLabel={snapshot.statusLabel}
              publicTeaser={!isMember}
            />
          ))}
        </div>
        {!isMember && (
          <div className="mt-6">
            <Button asChild variant="primary">
              <Link href={routes.pricing}>解锁完整情报与明日预测</Link>
            </Button>
          </div>
        )}
      </Section>

      {isMember ? (
        <>
          <Section id="moonx-scenario-charts" spacing="lg" className="border-t border-border/[0.06]">
            <Text variant="body-sm" color="secondary" className="mb-4">
              情景图表与完整路径为会员内容（当前预览模式）。
            </Text>
          </Section>
          <ConsensusOverviewSection />
        </>
      ) : null}

      <Section spacing="lg" className="border-t border-border/[0.06]">
        <CrossAssetConsensusSection consensus={consensus} />
      </Section>

      <Section spacing="lg" className="border-t border-border/[0.06]">
        <LongRangeTimeline periods={timeline} />
      </Section>
    </main>
  );
}
