import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { LiuyaoAnnualCoverage2026 } from "@/components/admin/LiuyaoAnnualCoverage2026";
import { PromotionReadinessPanel } from "@/components/admin/PromotionReadinessPanel";
import { Badge, Button, Card, Heading, Section, Text } from "@/components/ui";
import { isActiveMember, isAdmin, listAllAuthUsers, requireAdminOrRedirect } from "@/lib/auth/permissions";
import { getPublicVerificationSnapshot } from "@/lib/accuracy/public-verification-snapshot";
import { isSandboxUser } from "@/lib/admin/sandbox-data";
import { buildAdminCycleGapSummary, summarizeConsultationQueue } from "@/lib/admin/admin-home-operations";
import { listAdminConsultations } from "@/lib/consultations/store";
import { getKnowledgeGrowthStats } from "@/lib/teacher-learning-center/store";
import { loadTodayForecastRows, loadTomorrowForecastRows } from "@/lib/prediction-access-server";
import { getConvictionWeeklyFreshnessOverview } from "@/lib/data/conviction/admin-weekly-freshness";
import { buildPromotionReadinessSummary } from "@/lib/admin/promotion-readiness";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminHomePage() {
  await requireAdminOrRedirect("/admin");
  const now = new Date();
  const [users, verificationSnapshot, tlcStats, todayRows, tomorrowRows, consultationQueue] = await Promise.all([
    listAllAuthUsers(),
    getPublicVerificationSnapshot(),
    getKnowledgeGrowthStats(),
    loadTodayForecastRows(now),
    loadTomorrowForecastRows(now),
    listAdminConsultations()
      .then((rows) => ({ available: true as const, summary: summarizeConsultationQueue(rows) }))
      .catch(() => ({ available: false as const, summary: null })),
  ]);
  const dailyStats = verificationSnapshot.daily.stats;
  const weeklyStats = verificationSnapshot.weekly.stats;
  const convictionFreshness = getConvictionWeeklyFreshnessOverview(now);
  const cycleGaps = buildAdminCycleGapSummary(now);
  const productionUsers = users.filter((u) => !isSandboxUser(u));
  const memberCount = productionUsers.filter((u) => isActiveMember(u) && !isAdmin(u)).length;
  const promotionReadiness = buildPromotionReadinessSummary({
    todayPublished: todayRows.length,
    tomorrowPublished: tomorrowRows.length,
    focusCurrent: convictionFreshness.current,
    focusTotal: convictionFreshness.total,
    focusAffectedAssets: convictionFreshness.affectedAssets,
    cycleGapCount: cycleGaps.taskCount,
    cycleGapBlockingCount: cycleGaps.blockingTaskCount,
    cycleGapActionCount: cycleGaps.actionTaskCount,
    cycleGapPreparationCount: cycleGaps.preparationTaskCount,
    consultationAvailable: consultationQueue.available,
    pendingConsultations: consultationQueue.available ? consultationQueue.summary.total : 0,
    failedConsultations: consultationQueue.available ? consultationQueue.summary.failed : 0,
  });

  const tiles = [
    { label: "有效会员", value: String(memberCount) },
    { label: "今日观点数", value: String(todayRows.length) },
    { label: "下一交易日观点数", value: String(tomorrowRows.length) },
    { label: "重点资产周度新鲜度", value: `${convictionFreshness.current}/${convictionFreshness.total}` },
    { label: "日度复盘样本", value: String(dailyStats.verifiedCount) },
    { label: "公开待验证", value: String(verificationSnapshot.pending.length + verificationSnapshot.weekly.stats.pending) },
    { label: "周度加权命中率", value: weeklyStats.weightedAccuracyPct == null ? "暂无样本" : `${weeklyStats.weightedAccuracyPct.toFixed(1)}%` },
    { label: "老师课程", value: `${tlcStats.lessonCount}节` },
    { label: "老师规则", value: `${tlcStats.ruleCount}条` },
    { label: "老师案例", value: `${tlcStats.caseCount}个` },
  ];

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin" />
        <Heading as="h1" size="h2">
          管理后台
        </Heading>

        <PromotionReadinessPanel summary={promotionReadiness} />

        <Card
          padding="md"
          className={`mt-4 border ${
            consultationQueue.available && consultationQueue.summary.total > 0
              ? "border-amber-500/40 bg-amber-500/10"
              : "border-border/[0.08]"
          }`}
        >
          <Text variant="body-sm" weight="semibold">
            {consultationQueue.available
              ? `会员问卦：${consultationQueue.summary.total}笔待处理`
              : "会员问卦：暂时无法读取"}
          </Text>
          {consultationQueue.available ? (
            <Text variant="caption" color="secondary" className="mt-1 block">
              六爻 {consultationQueue.summary.liuyao}笔 · 八字 {consultationQueue.summary.bazi}笔 ·
              待整理 {consultationQueue.summary.awaitingDraft}笔 · 待复核 {consultationQueue.summary.awaitingReview}笔 ·
              待补资料 {consultationQueue.summary.needsInfo}笔
              {consultationQueue.summary.failed > 0 ? ` · 异常 ${consultationQueue.summary.failed}笔` : ""}
            </Text>
          ) : (
            <Text variant="caption" color="secondary" className="mt-1 block">
              请进入问卦管理页检查数据库连接。
            </Text>
          )}
          <Button asChild size="sm" className="mt-3 w-fit">
            <Link href="/admin/consultations">查看会员问卦</Link>
          </Button>
        </Card>

        <Card
          padding="md"
          className={`mt-4 border ${
            cycleGaps.urgency === "BLOCKER"
              ? "border-red-500/40 bg-red-500/10"
              : cycleGaps.urgency === "ACTION"
                ? "border-amber-300/35 bg-amber-300/[0.08]"
                : cycleGaps.urgency === "PREPARATION"
                  ? "border-cyan-300/25 bg-cyan-300/[0.05]"
              : "border-emerald-400/30 bg-emerald-400/[0.06]"
          }`}
        >
          <Text variant="body-sm" weight="semibold">
            {cycleGaps.taskCount > 0
              ? cycleGaps.urgency === "BLOCKER"
                ? `卦象阻断：${cycleGaps.blockingTaskCount}项临近生效`
                : cycleGaps.urgency === "ACTION"
                  ? `卦象待办：${cycleGaps.actionTaskCount}项进入准备期`
                  : `卦象准备：${cycleGaps.preparationTaskCount}项尚有提前量`
              : "周期卦覆盖：已齐"}
          </Text>
          <Text variant="caption" color="secondary" className="mt-1 block">
            周卦检查：{cycleGaps.weeklyStart}—{cycleGaps.weeklyEnd} · 月卦检查：{cycleGaps.monthlyLabel}
          </Text>
          {cycleGaps.items.length > 0 ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {cycleGaps.items.map((item) => {
                const gaps = [
                  item.weeklyMissing ? `缺 ${cycleGaps.weeklyStart}—${cycleGaps.weeklyEnd} 周卦` : null,
                  item.monthlyState === "MISSING" ? `缺 ${cycleGaps.monthlyLabel} 月卦` : null,
                  item.monthlyState === "INCOMPLETE" ? `${cycleGaps.monthlyLabel} 独立月卦证据不完整` : null,
                ].filter(Boolean);
                return (
                  <div key={item.assetId} className="rounded-md border border-white/10 bg-black/10 p-3">
                    <Text variant="body-sm" weight="semibold">{item.assetName}</Text>
                    <Text variant="caption" color="secondary" className="mt-1 block">
                      {gaps.join("；")}
                    </Text>
                  </div>
                );
              })}
            </div>
          ) : (
            <Text variant="caption" color="secondary" className="mt-2 block">
              未来周卦和月卦已齐。
            </Text>
          )}
          <Button asChild size="sm" className="mt-3 w-fit">
            <Link href="/admin/weekly">
              {cycleGaps.taskCount > 0 ? "补充周卦" : "查看周度研究"}
            </Link>
          </Button>
        </Card>

        <LiuyaoAnnualCoverage2026 compact />

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((t) => (
            <Card key={t.label} padding="md">
              <Text variant="caption" color="tertiary">
                {t.label}
              </Text>
              <Text variant="body" weight="semibold" className="mt-1">
                {t.value}
              </Text>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {(
            [
              ["/admin/forecasts", "今日／明日观点"],
              ["/admin/forecast-control", "管理员走势总控"],
              ["/admin/support-resistance", "支撑压力录入"],
              ["/admin/stocks", "个股分析"],
              ["/admin/users", "用户与会员"],
              ["/admin/consultations", "会员问卦"],
              ["/admin/live-trading", "AI实盘控制"],
              ["/admin/security", "会员设备安全"],
              ["/admin/payments", "支付记录"],
              ["/admin/automation", "自动化状态"],
              ["/admin/settings", "设置"],
            ] as const
          ).map(([href, label]) => (
            <Link key={href} href={href}>
              <Badge variant="outline">{label}</Badge>
            </Link>
          ))}
        </div>
      </Section>
    </main>
  );
}
