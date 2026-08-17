"use client";

import Link from "next/link";
import { Badge, Card, Heading, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { MethodologyModule } from "@/lib/methodology/types";
import {
  MOOX_AI_PERMISSIONS,
  MOOX_DAILY_ANALYSIS_POLICY,
  MOOX_LOCK_POLICY,
  MOOX_METRIC_SEPARATION,
  MOOX_PREDICTION_LAYERS,
  MOOX_TOP5_POLICY,
} from "@/lib/forecasts/prediction-governance";
import { OFFICIAL_DIRECTION_VALUES } from "@/lib/forecasts/formal-direction";

const CORE_COMPATIBILITY_LABELS_ZH = ["六爻（核心）", "奇门遁甲", "技术分析", "消息面"] as const;
const OUTPUTS_ZH = ["正式方向", "周内路径", "共识星级", "概率", "支撑压力", "执行状态", "风险"];
const OUTPUTS_EN = ["Official direction", "Weekly path", "Consensus stars", "Probability", "Levels", "Execution status", "Risk"];

export function MethodologyPageClient({ modules }: { modules: MethodologyModule[] }) {
  const { locale } = useLocale();
  const zh = locale.startsWith("zh");
  const byId = new Map(modules.map((module) => [module.id, module]));

  return (
    <div className="mx-auto w-full max-w-container space-y-10 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <header className="space-y-4">
        <Badge variant="outline">{zh ? "预测治理 V1" : "Forecast governance V1"}</Badge>
        <Heading as="h1" size="h2" className="max-w-4xl">
          {zh ? "玄学定方向，缠论等位置，AI守纪律。" : "Metaphysics sets direction; Chan finds location; AI enforces discipline."}
        </Heading>
        <Text variant="body" color="secondary" className="block max-w-3xl">
          {zh
            ? "MOOX不是把所有方法扔进一个模型互相投票。大周期定义环境，当前周卦锁定短中期方向，奇门拆时间窗口，缠论与技术只判断位置，AI只管理信息、仓位和风险；量化系统只有在方向、位置和风险同时通过时才执行。"
            : "MOOX does not let every method vote on direction. Higher horizons define context, the active weekly Liu Yao record locks direction, Qimen refines timing, Chan and technical analysis find location, and AI controls information, sizing and risk."}
        </Text>
      </header>

      <Card padding="lg" className="border-amber-400/25 bg-amber-400/[0.04]">
        <Text variant="body" weight="semibold">{zh ? "方向权只属于已锁定周卦／阶段卦" : "Direction authority belongs to the locked weekly/stage reading"}</Text>
        <Text variant="body-sm" color="secondary" className="mt-2 block">
          {zh ? "奇门、缠论、K线、消息、宏观、AI和量化都不能反向修改正式方向。它们可以要求等待、降低仓位或否决执行，但不能把看涨改成看跌。" : "Qimen, Chan, candles, news, macro, AI and quant cannot reverse the official call. They may require waiting, reduce size or block execution."}
        </Text>
      </Card>

      <section className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(zh ? CORE_COMPATIBILITY_LABELS_ZH : ["Liu Yao (core)", "Qimen timing", "Technical analysis", "News and risk"]).map((label) => <Badge key={label} variant="outline">{label}</Badge>)}
        </div>
        <Heading as="h2" size="h3">{zh ? "六层决策权限" : "Six-layer decision authority"}</Heading>
        <div className="grid gap-3 lg:grid-cols-2">
          {MOOX_PREDICTION_LAYERS.map((layer) => (
            <Card key={layer.id} padding="md" className={layer.maySetOfficialDirection ? "border-amber-400/30" : ""}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Text variant="body" weight="semibold">{layer.order}. {zh ? layer.nameZh : layer.nameEn}</Text>
                  <Text variant="body-sm" color="secondary" className="mt-2 block">{zh ? layer.authorityZh : layer.authorityEn}</Text>
                </div>
                <Badge variant={layer.maySetOfficialDirection ? "default" : "outline"}>{layer.maySetOfficialDirection ? (zh ? "方向权" : "Direction") : (zh ? "无改向权" : "No flip")}</Badge>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4 border-t border-border/[0.08] pt-10">
        <Heading as="h2" size="h3">{zh ? "日分析规则" : "Daily-analysis rule"}</Heading>
        <Card padding="lg" className="space-y-3">
          <Text variant="body" weight="semibold">{zh ? "不单独要求日卦" : "No separate daily hexagram is required"}</Text>
          <Text variant="body-sm" color="secondary">{zh ? MOOX_DAILY_ANALYSIS_POLICY.ruleZh : MOOX_DAILY_ANALYSIS_POLICY.ruleEn}</Text>
          <div className="flex flex-wrap gap-2">{(zh ? ["周卦拆日", "阶段卦可继承", "股票只算交易日", "加密按7×24", "无技术确认＝等待"] : ["Weekly-derived daily", "Stage inheritance", "Trading days for stocks", "7×24 crypto", "No confirmation = wait"]).map((label) => <Badge key={label} variant="outline">{label}</Badge>)}</div>
        </Card>
      </section>

      <section className="space-y-4 border-t border-border/[0.08] pt-10">
        <Heading as="h2" size="h3">{zh ? "正式方向只用7种人话" : "Seven plain official directions"}</Heading>
        <div className="flex flex-wrap gap-2">{OFFICIAL_DIRECTION_VALUES.map((direction) => <Badge key={direction} variant="outline">{direction}</Badge>)}</div>
        <Text variant="body-sm" color="secondary">{zh ? "整固、盘整、横盘统一显示为“震荡”；探底回升统一显示为“先跌后涨”；冲高回落统一显示为“先涨后跌”。偏强、偏弱、等待确认和休市分别属于强弱、执行或日历状态，不再冒充方向。" : "Legacy phrases are normalized into seven labels. Strength, risk, waiting and closed-market states are not directions."}</Text>
      </section>

      <section className="space-y-4 border-t border-border/[0.08] pt-10">
        <Heading as="h2" size="h3">{zh ? "AI只有三种权力" : "AI has only three permissions"}</Heading>
        <div className="grid gap-3 md:grid-cols-3">
          {(zh
            ? [[MOOX_AI_PERMISSIONS[0], "提醒事件、流动性与异常风险"], [MOOX_AI_PERMISSIONS[1], "降低仓位或延迟到更好位置"], [MOOX_AI_PERMISSIONS[2], "风险不合格时否决本次交易"]]
            : [[MOOX_AI_PERMISSIONS[0], "Flag event, liquidity and anomaly risk"], [MOOX_AI_PERMISSIONS[1], "Reduce size or wait for a better location"], [MOOX_AI_PERMISSIONS[2], "Block a trade when risk fails"]]
          ).map(([code, text]) => <Card key={code} padding="md"><Text variant="body-sm" weight="semibold">{text}</Text></Card>)}
        </div>
        <Text variant="caption" color="tertiary">{zh ? "禁止项：AI不得修改已锁定方向。" : "Forbidden: AI may not edit the locked direction."}</Text>
      </section>

      <section className="space-y-4 border-t border-border/[0.08] pt-10">
        <Heading as="h2" size="h3">{zh ? "前5与A股规则" : "Top-5 and A-share rule"}</Heading>
        <Card padding="lg"><Text variant="body-sm" color="secondary">{zh ? MOOX_TOP5_POLICY.ruleZh : MOOX_TOP5_POLICY.ruleEn}</Text></Card>
      </section>

      <section className="space-y-4 border-t border-border/[0.08] pt-10">
        <Heading as="h2" size="h3">{zh ? "五个指标不能混为一谈" : "Five metrics are separate"}</Heading>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(MOOX_METRIC_SEPARATION).map(([key, value]) => <Card key={key} padding="md"><Text variant="body-sm" weight="semibold">{value}</Text></Card>)}</div>
      </section>

      <section className="space-y-4 border-t border-border/[0.08] pt-10">
        <Heading as="h2" size="h3">{zh ? "发布锁定与验证" : "Publish lock and verification"}</Heading>
        <Card padding="lg"><Text variant="body-sm" color="secondary">{zh ? MOOX_LOCK_POLICY.ruleZh : MOOX_LOCK_POLICY.ruleEn}</Text></Card>
      </section>

      <section className="space-y-4 border-t border-border/[0.08] pt-10">
        <Heading as="h2" size="h3">{zh ? "最终预测输出" : "Final forecast output"}</Heading>
        <div className="flex flex-wrap gap-2">{(zh ? OUTPUTS_ZH : OUTPUTS_EN).map((label) => <Badge key={label} variant="outline">{label}</Badge>)}</div>
      </section>

      <section className="space-y-4 border-t border-border/[0.08] pt-10">
        <Heading as="h2" size="h3">{zh ? "当前启用的研究模块" : "Enabled research modules"}</Heading>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <Card key={module.id} padding="md">
              <Text variant="body-sm" weight="semibold">{zh ? module.nameZh : module.nameEn}</Text>
              <Text variant="caption" color="tertiary" className="mt-1 block">{zh ? module.weightRangeZh : module.weightRangeEn}</Text>
              <Text variant="body-sm" color="secondary" className="mt-2 block">{zh ? module.summaryZh : module.summaryEn}</Text>
              {byId.get(module.id)?.enabled ? <Badge variant="outline" className="mt-3">{zh ? "已启用" : "Enabled"}</Badge> : null}
            </Card>
          ))}
        </div>
      </section>

      <p className="text-caption text-foreground-tertiary">{zh ? <>预测不是交易命令。返回 <Link href="/#moonx-view" className="text-primary underline-offset-2 hover:underline">今日研判</Link> 查看方向和执行状态。</> : "A forecast is not an order. Direction and execution status remain separate."}</p>
    </div>
  );
}
