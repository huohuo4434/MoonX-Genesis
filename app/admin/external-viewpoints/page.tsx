import { AdminNav } from "@/components/admin/AdminNav";
import { Card, Heading, Text, Badge } from "@/components/ui";
import { externalViewpoints20260801 } from "@/lib/data/external-viewpoints-20260801";
import { externalViewpointsFollowup20260801 } from "@/lib/data/external-viewpoints-followup-20260801";
import { EXTERNAL_ANALYST_VIEWPOINTS_20260828 } from "@/lib/data/external-analyst-viewpoints-20260828";
import { teacher02Liuyao20260802Records } from "@/lib/data/teacher02-liuyao-20260802";
import { ANALYST_FUSION_SHADOW_VARIANTS } from "@/lib/research/analyst-fusion-shadow-core";
import { EXTERNAL_ANALYST_ROLE_REGISTRY } from "@/lib/research/external-analyst-role-registry";
import { assessExternalViewpointCard } from "@/lib/research/external-viewpoint-card-core";
import { listResearchRecords } from "@/lib/data/research-records";
import { policyForTags } from "@/lib/research/external-source-policy";
import {
  TEACHER02_REV322_EXECUTION_STEPS,
  TEACHER02_REV322_LIMITATIONS,
  TEACHER02_REV322_PREFLIGHT,
  TEACHER02_REV322_RULES,
  TEACHER02_REV322_SOURCE_META,
} from "@/lib/research/teacher02-rev322";
import {
  buildTeacherSourceBlend,
  summarizeTeacher02Verification,
  TEACHER_SOURCE_WEIGHT_PROFILES,
} from "@/lib/research/teacher-source-weights";

export const dynamic = "force-dynamic";

function alignmentText(value: "aligned" | "partial" | "conflict") {
  if (value === "aligned") return "方向一致";
  if (value === "conflict") return "方向分歧";
  return "部分一致";
}

function roleText(role: string) {
  if (role === "MACRO_REGIME") return "宏观环境";
  if (role === "TECHNICAL_LEVELS") return "结构与点位";
  if (role === "CONTRARIAN_REVIEW") return "反方复核";
  return "叙事与情绪";
}

export default async function AdminExternalViewpointsPage() {
  const allRecords = await listResearchRecords();
  const verification = summarizeTeacher02Verification(allRecords);
  const teacherBlendRows = TEACHER_SOURCE_WEIGHT_PROFILES.map((profile) => ({
    profile,
    blend: buildTeacherSourceBlend({
      assetId: profile.assetId,
      asOfDate: "2026-08-03",
      records: allRecords,
    }),
  }));
  const archivedViewpoints = [...teacher02Liuyao20260802Records, ...externalViewpoints20260801, ...externalViewpointsFollowup20260801];
  const analystCards = EXTERNAL_ANALYST_VIEWPOINTS_20260828.map((card) => ({
    card,
    assessment: assessExternalViewpointCard(card),
  }));

  return (
    <main className="mx-auto w-full max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <AdminNav current="/admin/external-viewpoints" />
      <Heading as="h1" size="h2" className="mb-2">
        外部研究源与辅助导师
      </Heading>
      <Text variant="body-sm" color="secondary" className="mb-6 max-w-4xl">
        外部材料只在明确发布时间、有效区间和验证条件齐全时参与研究。辅助导师02属于六爻模块内部的路径补充源：不覆盖已经锁定的正式预测，也不能单独触发自动交易。
      </Text>

      <Card padding="lg" className="mb-6 space-y-5 border-amber-400/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Heading as="h2" size="h3">
              辅助导师02专项权重
            </Heading>
            <Text variant="body-sm" color="secondary" className="mt-1 max-w-3xl">
              老师01继续决定金融六亲与主方向；老师02补充周内路径和关键日；MoonX扩展规则只做时间、交易日与技术确认校准，不单独改变方向。
            </Text>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">正式样本 {verification.completedSamples}</Badge>
            <Badge variant="outline">待验证 {verification.pendingSamples}</Badge>
            <Badge variant="outline">
              黄金专项 {verification.goldCompletedSamples}
            </Badge>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {teacherBlendRows.map(({ profile, blend }) => (
            <div key={profile.assetId} className="rounded-xl border border-white/10 bg-black/15 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Text variant="body" weight="semibold">
                    {profile.label} · {profile.symbol}
                  </Text>
                  <Text variant="caption" color="tertiary" className="mt-1 block">
                    {profile.note}
                  </Text>
                </div>
                <Badge variant="outline">{blend ? alignmentText(blend.alignment) : "等待有效区间"}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-white/10 p-2">
                  <Text variant="caption" color="tertiary" className="block">老师01</Text>
                  <Text variant="body-sm" weight="semibold" className="mt-1 block">{blend?.teacher01EffectiveWeightPct ?? profile.teacher01WeightPct}%</Text>
                </div>
                <div className="rounded-lg border border-white/10 p-2">
                  <Text variant="caption" color="tertiary" className="block">老师02</Text>
                  <Text variant="body-sm" weight="semibold" className="mt-1 block">{blend?.teacher02EffectiveWeightPct ?? profile.teacher02WeightPct}%</Text>
                </div>
                <div className="rounded-lg border border-white/10 p-2">
                  <Text variant="caption" color="tertiary" className="block">路径校准</Text>
                  <Text variant="body-sm" weight="semibold" className="mt-1 block">{profile.moonxExtensionWeightPct}%</Text>
                </div>
              </div>
              {blend ? (
                <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <Text variant="caption" className="block text-white/70">
                    主体系：{blend.teacher01Direction} · 辅助源：{blend.teacher02Direction} · 融合方向：{blend.lean === "UP" ? "偏多" : blend.lean === "DOWN" ? "偏空" : "震荡"}
                  </Text>
                  <Text variant="caption" color="tertiary" className="mt-2 block">
                    {blend.publicSummary}
                  </Text>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <Text variant="caption" className="block text-amber-200/80">
          权重保护：老师02不能单独开仓；已发布版本不倒改；至少累计10个黄金正式样本后，才允许按真实命中率重新评估黄金35%的专项权重。
        </Text>
      </Card>

      <Card padding="lg" className="mb-6 space-y-5 border-violet-400/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Heading as="h2" size="h3">博主职责与权限边界</Heading>
            <Text variant="body-sm" color="secondary" className="mt-1 max-w-4xl">
              博主不是第二套正式方向。不同来源只承担固定职责：宏观判断环境，技术来源提供确认与失效点，反方来源检查过度解读，叙事来源整理事件。所有材料先进入影子验证。
            </Text>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">内部研究</Badge>
            <Badge variant="outline">不单独下单</Badge>
            <Badge variant="outline">不改锁定方向</Badge>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {EXTERNAL_ANALYST_ROLE_REGISTRY.map((source) => (
            <div key={source.id} className="rounded-xl border border-white/10 bg-black/15 p-4">
              <Text variant="body-sm" weight="semibold">{source.internalName}</Text>
              <Text variant="caption" className="mt-1 block text-violet-200">{roleText(source.role)}</Text>
              <Text variant="caption" color="tertiary" className="mt-3 block leading-relaxed">{source.strengths}</Text>
              <Text variant="caption" className="mt-2 block text-amber-100/65">边界：{source.limits}</Text>
              <Text variant="caption" className="mt-3 block text-white/40">可影响：{source.allowedEffects.join(" / ")}</Text>
            </div>
          ))}
        </div>
      </Card>

      <Card padding="lg" className="mb-6 space-y-5 border-emerald-400/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Heading as="h2" size="h3">2026-08-28 前瞻观点卡</Heading>
            <Text variant="body-sm" color="secondary" className="mt-1 max-w-4xl">
              8月27日至28日材料只从8月31日之后开始记前瞻样本，不拿已经发生的行情倒填命中。点位必须同时保留确认与失效条件；缺条件的内容只做笔记。
            </Text>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">共 {analystCards.length} 张</Badge>
            <Badge variant="outline">可前瞻计分 {analystCards.filter(({ assessment }) => assessment.forwardScoreEligible).length}</Badge>
            <Badge variant="outline">笔记 {analystCards.filter(({ card }) => card.status === "NOTE_ONLY").length}</Badge>
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {analystCards.map(({ card, assessment }) => (
            <div key={card.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Text variant="body-sm" weight="semibold">{card.asset} · {card.symbol}</Text>
                  <Text variant="caption" color="tertiary" className="mt-1 block">
                    {roleText(card.role)} · {card.applicableStart} 至 {card.applicableEnd}
                  </Text>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">{card.bias}</Badge>
                  <Badge variant="outline">{assessment.forwardScoreEligible ? "前瞻锁定" : card.status === "NOTE_ONLY" ? "仅笔记" : "待处理"}</Badge>
                </div>
              </div>
              <Text variant="body-sm" className="mt-3 block leading-relaxed text-white/75">{card.thesis}</Text>
              <Text variant="caption" color="tertiary" className="mt-2 block">路径：{card.path}</Text>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <div className="rounded-lg border border-emerald-400/15 bg-emerald-400/[0.03] p-3">
                  <Text variant="caption" weight="semibold" className="text-emerald-200">确认</Text>
                  <Text variant="caption" color="tertiary" className="mt-1 block">{card.confirmation}</Text>
                </div>
                <div className="rounded-lg border border-rose-400/15 bg-rose-400/[0.03] p-3">
                  <Text variant="caption" weight="semibold" className="text-rose-200">失效</Text>
                  <Text variant="caption" color="tertiary" className="mt-1 block">{card.invalidation}</Text>
                </div>
              </div>
              {(card.supports.length || card.resistances.length || card.targets.length) ? (
                <Text variant="caption" className="mt-3 block text-white/45">
                  支撑 {card.supports.join(" / ") || "—"} · 压力 {card.resistances.join(" / ") || "—"} · 目标 {card.targets.join(" / ") || "—"}
                </Text>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      <Card padding="lg" className="mb-6 space-y-5 border-sky-400/20">
        <div>
          <Heading as="h2" size="h3">四组影子对照</Heading>
          <Text variant="body-sm" color="secondary" className="mt-1 max-w-4xl">
            同一资产、周期和市场环境同时冻结四份版本，周期结束后统一复盘。少于10个样本只观察；10至19个只能影响风险；至少20个且比基准提高8个百分点、同时不扩大不利波动，才可申请进入确认层；至少30个并覆盖两种市场环境后才讨论权重。
          </Text>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {ANALYST_FUSION_SHADOW_VARIANTS.map((variant) => (
            <div key={variant.id} className="rounded-xl border border-white/10 bg-black/15 p-4">
              <Text variant="body-sm" weight="semibold">{variant.label}</Text>
              <Text variant="caption" color="tertiary" className="mt-2 block leading-relaxed">{variant.description}</Text>
              <Text variant="caption" className="mt-3 block text-sky-200/70">RESEARCH_ONLY · 不触发交易</Text>
            </div>
          ))}
        </div>
      </Card>


      <Card padding="lg" className="mb-6 space-y-5 border-sky-400/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Heading as="h2" size="h3">
              辅助导师02规则版本
            </Heading>
            <Text variant="body-sm" color="secondary" className="mt-1 max-w-3xl">
              当前启用 {TEACHER02_REV322_SOURCE_META.version} 可见规则。它来自公开视频逐秒画面整理，不冒充原始Word全文；高置信度规则用于时间轴校准，中置信度规则只做路径提示。
            </Text>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">证据窗口 {TEACHER02_REV322_SOURCE_META.evidenceWindow}</Badge>
            <Badge variant="outline">原始记录锁定</Badge>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <Text variant="body" weight="semibold">执行顺序</Text>
            <div className="mt-3 space-y-2">
              {TEACHER02_REV322_EXECUTION_STEPS.map((step, index) => (
                <Text key={step} variant="body-sm" color="secondary" className="block">
                  {index + 1}. {step}
                </Text>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <Text variant="body" weight="semibold">预测前八项检查</Text>
            <div className="mt-3 space-y-2">
              {TEACHER02_REV322_PREFLIGHT.map((item) => (
                <Text key={item} variant="body-sm" color="secondary" className="block">
                  · {item}
                </Text>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {TEACHER02_REV322_RULES.map((rule) => (
            <div key={rule.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-start justify-between gap-3">
                <Text variant="body-sm" weight="semibold">{rule.title}</Text>
                <Badge variant="outline">
                  {rule.confidence === "HIGH" ? "高置信" : rule.confidence === "MEDIUM" ? "路径参考" : "待补全"}
                </Badge>
              </div>
              <Text variant="caption" color="tertiary" className="mt-2 block leading-relaxed">
                {rule.summary}
              </Text>
              <Text variant="caption" className="mt-2 block text-white/40">
                自动使用：{rule.automaticUse ? "是" : "否"}
              </Text>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-4">
          <Text variant="body-sm" weight="semibold" className="text-amber-200">
            未完整恢复的边界
          </Text>
          <div className="mt-2 space-y-1">
            {TEACHER02_REV322_LIMITATIONS.map((item) => (
              <Text key={item} variant="caption" className="block text-amber-100/70">
                · {item}
              </Text>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {archivedViewpoints.map((record) => {
          const policy = policyForTags(record.tags);
          const isTeacher02 = record.tags.includes("source:teacher02");
          return (
            <Card key={record.id} padding="lg" className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Text variant="body" weight="semibold">
                    {record.assetName.zhCN} · {record.symbol ?? record.assetId}
                  </Text>
                  <Text variant="caption" color="tertiary" className="mt-1 block">
                    {record.title.zhCN}
                  </Text>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isTeacher02 ? <Badge variant="outline">辅助导师02</Badge> : null}
                  <Badge variant="outline">基础权重 {policy.baseWeight}%</Badge>
                  <Badge variant="outline">上限 {policy.maxWeight}%</Badge>
                </div>
              </div>
              <Text variant="body-sm" className="block leading-relaxed text-white/75">
                {record.summary.zhCN}
              </Text>
              {record.turningWindows?.length ? (
                <div className="rounded-lg border border-white/10 bg-black/15 p-3">
                  <Text variant="caption" weight="semibold" className="block text-white/75">
                    关键窗口
                  </Text>
                  <div className="mt-2 space-y-1">
                    {record.turningWindows.map((window) => (
                      <Text key={window.id} variant="caption" color="tertiary" className="block">
                        {window.date ?? `${window.start ?? ""} 至 ${window.end ?? ""}`} · {window.label.zhCN}
                      </Text>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="rounded-lg border border-white/10 bg-black/15 p-3">
                <Text variant="caption" className="block text-amber-200">
                  采用规则：{policy.rule}
                </Text>
                <Text variant="caption" className="mt-2 block text-white/45">
                  有效期：{record.forecastStart ?? record.publishedAt} 至 {record.forecastEnd ?? record.expiresAt?.slice(0, 10) ?? "长期归档"}
                  {" · "}
                  自动进入全局共识：{policy.automaticConsensus ? "是" : "否"}
                  {" · "}
                  单独触发交易：否
                </Text>
              </div>
              <Text variant="caption" className="block text-white/35">
                内部来源：{record.internalSourceRef ?? "用户上传材料"}
              </Text>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
