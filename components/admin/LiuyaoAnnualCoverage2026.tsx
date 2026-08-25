import Link from "next/link";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";
import {
  BINGWU_2026_CONFIRMED_ANNUAL_READINGS,
  BINGWU_2026_SUPPLEMENTAL_READINGS,
  LIUYAO_2026_ANNUAL_COVERAGE_SUMMARY,
  LIUYAO_2026_CORE_ANNUAL_GAPS,
  LIUYAO_2026_LATER_ANNUAL_GAPS,
  LIUYAO_2026_TONIGHT_PRIORITY,
  LIUYAO_ANNUAL_COVERAGE_VERSION,
  USER_2026_CONFIRMED_ANNUAL_READINGS,
  type AnnualCoverageRecord,
} from "@/lib/research/liuyao-annual-coverage-2026";

type Props = { compact?: boolean };

export function LiuyaoAnnualCoverage2026({ compact = false }: Props) {
  if (compact) {
    return (
      <Card padding="md" className="mt-4 border border-amber-300/20 bg-amber-300/[0.045]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Text variant="body-sm" weight="semibold">2026年卦覆盖：老师基准 {LIUYAO_2026_ANNUAL_COVERAGE_SUMMARY.confirmedTeacherAnnuals} 张 · 新补 {LIUYAO_2026_ANNUAL_COVERAGE_SUMMARY.confirmedUserAnnuals} 张</Text>
          <Badge variant={LIUYAO_2026_ANNUAL_COVERAGE_SUMMARY.laterGaps ? "warning" : "success"}>重点资产还缺 {LIUYAO_2026_ANNUAL_COVERAGE_SUMMARY.laterGaps} 张</Badge>
        </div>
        <Text variant="caption" color="secondary" className="mt-2 block">
          当前只需补：{LIUYAO_2026_TONIGHT_PRIORITY.map((item) => item.assetName).join("、") || "无"}。8月25日新补年卦已进入未来年度层；1—8月不回填命中统计。
        </Text>
        <Button asChild size="sm" className="mt-3 w-fit">
          <Link href="/admin/asset-research">查看并补录年度卦</Link>
        </Button>
      </Card>
    );
  }

  const summaryTiles: readonly {
    label: string;
    count: number;
    variant: "success" | "info" | "warning" | "neutral";
  }[] = [
    { label: "老师年度基准", count: LIUYAO_2026_ANNUAL_COVERAGE_SUMMARY.confirmedTeacherAnnuals, variant: "success" },
    { label: "8/25新补年卦", count: LIUYAO_2026_ANNUAL_COVERAGE_SUMMARY.confirmedUserAnnuals, variant: "info" },
    { label: "年度专题", count: LIUYAO_2026_ANNUAL_COVERAGE_SUMMARY.supplementalTopics, variant: "neutral" },
    { label: "重点资产缺口", count: LIUYAO_2026_ANNUAL_COVERAGE_SUMMARY.coreGaps + LIUYAO_2026_ANNUAL_COVERAGE_SUMMARY.laterGaps, variant: "warning" },
  ];

  return (
    <Card padding="lg" className="border border-amber-300/15 bg-amber-300/[0.03]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Heading as="h2" size="h3">2026年卦覆盖盘点</Heading>
          <Text variant="body-sm" color="secondary" className="mt-2 block max-w-3xl leading-relaxed">
            资料盘点基线为2026-08-25。只把明确问全年走势的原盘计为年度基准；半年、三个月、事件卦和大盘背景均单独保留，不允许替代具体资产年卦。
          </Text>
        </div>
        <Badge variant="outline">{LIUYAO_ANNUAL_COVERAGE_VERSION}</Badge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summaryTiles.map((tile) => (
          <div key={tile.label} className="rounded-xl border border-white/[0.08] bg-black/15 p-4">
            <Badge variant={tile.variant}>{tile.label}</Badge>
            <Text variant="body" weight="semibold" className="mt-2 block">{tile.count} 张</Text>
          </div>
        ))}
      </div>

      <CoverageGroup title="已有老师年度基准" badge="可用" badgeVariant="success" rows={BINGWU_2026_CONFIRMED_ANNUAL_READINGS} />
      <CoverageGroup title="8月25日新补独立年卦" badge="已进入未来正式层" badgeVariant="info" rows={USER_2026_CONFIRMED_ANNUAL_READINGS} />
      <CoverageGroup title="年度专题（不能冒充年卦）" badge="辅助" badgeVariant="info" rows={BINGWU_2026_SUPPLEMENTAL_READINGS} />
      {LIUYAO_2026_CORE_ANNUAL_GAPS.length ? <CoverageGroup title="核心独立年卦缺口" badge="优先补" badgeVariant="warning" rows={LIUYAO_2026_CORE_ANNUAL_GAPS} /> : null}
      <CoverageGroup title="仍缺独立年卦" badge="待补" badgeVariant="warning" rows={LIUYAO_2026_LATER_ANNUAL_GAPS} />

      <Text variant="caption" color="tertiary" className="mt-5 block leading-relaxed">
        原盘、问题、起卦时间、时区与SHA256均已留作内部溯源；会员端不显示含个人资料的截图。8月25日前不回填预测、不纳入这批年卦的命中统计；9—12月年度候选已锁定，后续由独立月卦、周卦逐层校准。
      </Text>
    </Card>
  );
}

function CoverageGroup({
  title,
  badge,
  badgeVariant,
  rows,
}: {
  title: string;
  badge: string;
  badgeVariant: "success" | "info" | "warning" | "neutral";
  rows: readonly AnnualCoverageRecord[];
}) {
  return (
    <div className="mt-5">
      <div className="flex items-center gap-2">
        <Text variant="body-sm" weight="semibold">{title}</Text>
        <Badge variant={badgeVariant}>{badge}</Badge>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {rows.map((row) => (
          <div key={row.assetId} className="rounded-xl border border-white/[0.08] bg-black/15 p-4">
            <Text variant="body-sm" weight="semibold">{row.assetName}</Text>
            <Text variant="caption" color="secondary" className="mt-1 block leading-relaxed">{row.roleZh}</Text>
            {row.sourceFile ? <Text variant="caption" className="mt-2 block font-mono text-cyan-100">原盘：{row.sourceFile}</Text> : null}
            {row.sourceDigest ? <Text variant="caption" className="mt-1 block break-all font-mono text-white/35">SHA256：{row.sourceDigest}</Text> : null}
            {row.doesNotReplace?.length ? (
              <Text variant="caption" className="mt-2 block text-amber-200">不能替代：{row.doesNotReplace.join("、")}</Text>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
