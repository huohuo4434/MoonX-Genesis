"use client";

import { Badge, Card, Heading, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { MemberMarketBranchOutlook, MemberMarketBranchNode } from "@/types/member-market-branch";

const stateLabel: Record<MemberMarketBranchNode["state"], { zh: string; en: string; variant: "default" | "outline" }> = {
  WATCH: { zh: "观察", en: "Watch", variant: "outline" },
  RISK: { zh: "防风险", en: "Risk", variant: "outline" },
  CONFIRM: { zh: "等确认", en: "Confirm", variant: "default" },
  INVALID: { zh: "已失效", en: "Invalid", variant: "outline" },
};

export function MemberMarketBranchOutlookSection({ outlook }: { outlook: MemberMarketBranchOutlook }) {
  const { locale } = useLocale();
  const en = locale === "en";
  const text = <T extends { zh: string; en: string }>(value: T) => en ? value.en : value.zh;
  const asOf = new Intl.DateTimeFormat(en ? "en-US" : "zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Shanghai",
  }).format(new Date(outlook.asOf));

  return <section className="mb-10" aria-labelledby="member-market-branch-heading">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <Badge variant="default" className="mb-2">{en ? "Members · Rolling research" : "会员独享 · 滚动研究"}</Badge>
        <Heading as="h2" size="h3" id="member-market-branch-heading">{text(outlook.title)}</Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 block max-w-4xl">{text(outlook.subtitle)}</Text>
      </div>
      <Text variant="caption" color="tertiary">{en ? "As of" : "形成时间"}: {asOf}</Text>
    </div>

    <Card padding="md" className="mb-4 border-amber-400/25 bg-amber-400/[0.035]">
      <Text variant="body-sm" weight="semibold">{en ? "Integrity boundary" : "历史诚信边界"}</Text>
      <Text variant="body-sm" color="secondary" className="mt-1 block">{text(outlook.integrityNote)}</Text>
      <Text variant="body-sm" color="secondary" className="mt-2 block"><strong>{en ? "Execution rule: " : "执行规则："}</strong>{text(outlook.timingRule)}</Text>
    </Card>

    <div className="grid gap-4 lg:grid-cols-2">
      {outlook.assets.map((asset) => <Card key={asset.id} padding="lg" className="min-w-0 overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <Text variant="body" weight="semibold">{text(asset.assetName)} <span className="font-mono text-body-sm font-normal text-foreground-tertiary">{asset.symbol}</span></Text>
            <Text variant="caption" color="tertiary" className="mt-1 block">{text(asset.venue)}</Text>
          </div>
          <Badge variant="default">{text(asset.stanceLabel)}</Badge>
        </div>

        <div className="mt-4 space-y-3">
          <div><Text variant="caption" color="tertiary">{en ? "Base branch" : "基准分支"}</Text><Text variant="body-sm" className="mt-1 block">{text(asset.basePath)}</Text></div>
          <div><Text variant="caption" color="tertiary">{en ? "Decision rule" : "执行判断"}</Text><Text variant="body-sm" color="secondary" className="mt-1 block">{text(asset.decisionRule)}</Text></div>
          <div className="rounded-lg border border-rose-400/20 bg-rose-400/[0.025] p-3"><Text variant="caption" color="tertiary">{en ? "Invalidation / risk" : "失效与风险"}</Text><Text variant="body-sm" color="secondary" className="mt-1 block">{text(asset.invalidation)}</Text></div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">{asset.levels.map((level) => <Badge key={text(level)} variant="outline">{text(level)}</Badge>)}</div>

        <div className="mt-4 grid gap-2">{asset.nodes.map((node) => {
          const state = stateLabel[node.state];
          return <div key={`${asset.id}-${node.dateRange}-${node.state}`} className="rounded-lg border border-border/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-caption">{node.dateRange}</span><Badge variant={state.variant}>{en ? state.en : state.zh}</Badge></div>
            <Text variant="body-sm" weight="semibold" className="mt-2 block">{text(node.label)}</Text>
            <Text variant="caption" color="tertiary" className="mt-1 block">{text(node.condition)}</Text>
          </div>;
        })}</div>
      </Card>)}
    </div>
  </section>;
}
