"use client";

import Link from "next/link";
import { Badge, Card, Heading, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { MethodologyModule } from "@/lib/methodology/types";

const CORE_FOUR = [
  {
    id: "liuyao",
    titleZh: "六爻（核心）",
    titleEn: "Liu Yao — Directional Thesis",
    bodyZh: "主方向与路径的核心判断",
    bodyEn: "Primary direction and expected path",
    accent: "border-amber-500/40 bg-amber-500/10",
    ring: "ring-amber-400/30",
  },
  {
    id: "qimen",
    titleZh: "奇门遁甲（择时）",
    titleEn: "Qimen Dunjia — Timing Windows",
    bodyZh: "时间节奏与窗口选择",
    bodyEn: "Timing windows and market rhythm",
    accent: "border-sky-500/35 bg-sky-500/10",
    ring: "ring-sky-400/25",
  },
  {
    id: "market_structure",
    titleZh: "技术分析（结构）",
    titleEn: "Technical Structure — Levels Only",
    bodyZh: "只负责支撑、压力、入场与风控点位",
    bodyEn: "Support, resistance, entry and risk-control levels only",
    accent: "border-emerald-500/35 bg-emerald-500/10",
    ring: "ring-emerald-400/25",
  },
  {
    id: "macro_flows",
    titleZh: "消息面（催化）",
    titleEn: "Catalyst Monitoring — Events & Risk",
    bodyZh: "事件验证、催化与风险扰动",
    bodyEn: "Events, catalysts and risk monitoring",
    accent: "border-violet-500/35 bg-violet-500/10",
    ring: "ring-violet-400/25",
  },
] as const;

const FLOW_ZH = [
  "周卦与六爻",
  "动爻与时间节奏",
  "奇门遁甲／万年历",
  "多周期卦象共振定方向",
  "技术结构只找点位",
  "消息面只做背景校验",
  "唯一方向、路径和点位",
  "发布锁定",
  "结果验证",
];

const FLOW_EN = [
  "Liu Yao directional thesis",
  "Qimen timing windows",
  "Multi-horizon metaphysical resonance",
  "Technical levels only",
  "Catalyst and risk monitoring",
  "One official direction and path",
  "Publish and lock",
  "Public verification",
];

const OUTPUTS_ZH = ["唯一方向", "共振强度", "运行路径", "支撑", "压力", "风控位", "风险"];
const OUTPUTS_EN = ["Official direction", "Resonance", "Expected path", "Support", "Resistance", "Risk-control level", "Risk"];

function Arrow() {
  return (
    <span
      className="hidden shrink-0 self-center text-foreground-tertiary lg:inline"
      aria-hidden
    >
      →
    </span>
  );
}

function ArrowDown() {
  return (
    <span className="mx-auto block text-center text-foreground-tertiary lg:hidden" aria-hidden>
      ↓
    </span>
  );
}

export function MethodologyPageClient({ modules }: { modules: MethodologyModule[] }) {
  const { locale } = useLocale();
  const zh = locale.startsWith("zh");
  const flow = zh ? FLOW_ZH : FLOW_EN;
  const outputs = zh ? OUTPUTS_ZH : OUTPUTS_EN;
  const byId = new Map(modules.map((m) => [m.id, m]));

  return (
    <div className="mx-auto w-full max-w-container space-y-10 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      {/* Hero */}
      <header className="space-y-4">
        <Badge variant="outline">{zh ? "预测方法" : "Methodology"}</Badge>
        <Heading as="h1" size="h2" className="max-w-3xl">
          {zh ? "MOOX 的预测是怎么来的？" : "How are MOOX forecasts made?"}
        </Heading>
        <Text variant="body" color="secondary" className="block max-w-2xl">
          {zh
            ? "MOOX的规则只有一条主线：玄学定方向，技术找点位。周卦、月卦和更大周期同向时形成共振，直接给唯一看涨或看跌结论；只有卦象真正冲突才写方向不明确。奇门负责时间窗口，技术分析只负责支撑、压力、入场和风控，不得反向修改玄学方向。"
            : "MOOX uses metaphysical research to set one official direction. Alignment across weekly, monthly and larger-horizon readings creates resonance. Qimen is for timing; technical analysis is strictly for levels and execution, never for flipping the metaphysical call."}
        </Text>
      </header>

      {/* 4-core diagram */}
      <section className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CORE_FOUR.map((c) => (
            <div
              key={c.id}
              className={`rounded-2xl border p-5 ring-1 ${c.accent} ${c.ring}`}
            >
              <p className="text-body font-semibold">{zh ? c.titleZh : c.titleEn}</p>
              <p className="mt-2 text-body-sm text-foreground-secondary">
                {zh ? c.bodyZh : c.bodyEn}
              </p>
              {byId.get(c.id)?.enabled ? (
                <p className="mt-3 text-caption text-foreground-tertiary">
                  {zh ? "当前已启用" : "Enabled"}
                </p>
              ) : null}
            </div>
          ))}
        </div>
        <div className="flex justify-center">
          <span className="text-foreground-tertiary" aria-hidden>
            ↓
          </span>
        </div>
        <Card padding="lg" className="mx-auto max-w-3xl space-y-4 text-center">
          <Text variant="body" weight="semibold">
            {zh ? "最终预测输出" : "Final forecast output"}
          </Text>
          <div className="flex flex-wrap justify-center gap-2">
            {outputs.map((o) => (
              <Badge key={o} variant="outline">
                {o}
              </Badge>
            ))}
          </div>
        </Card>
      </section>

      {/* Flow */}
      <section className="space-y-4 border-t border-border/[0.08] pt-10">
        <Heading as="h2" size="h3">
          {zh ? "研究到发布流程图" : "Research → publish flow"}
        </Heading>
        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-stretch lg:gap-2">
          {flow.map((step, i) => (
            <div key={step} className="flex flex-col gap-2 lg:contents">
              <div className="min-w-0 flex-1 rounded-xl border border-border/[0.1] bg-card px-3 py-3 text-center text-body-sm font-medium">
                {step}
              </div>
              {i < flow.length - 1 ? (
                <>
                  <Arrow />
                  <ArrowDown />
                </>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* Priority */}
      <section className="space-y-4 border-t border-border/[0.08] pt-10">
        <Heading as="h2" size="h3">
          {zh ? "MOOX核心研究优先级" : "Research priority"}
        </Heading>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(
            zh
              ? [
                  ["六爻", "核心主判断"],
                  ["奇门遁甲", "重要择时"],
                  ["技术分析", "只找点位"],
                  ["消息面", "催化与风险校验"],
                  ["波浪分析", "辅助观察"],
                  ["AI／量化", "辅助参考"],
                ]
              : [
                  ["Liu Yao", "Directional thesis"],
                  ["Qimen Dunjia", "Timing windows"],
                  ["Technical structure", "Levels only"],
                  ["Catalyst monitoring", "Events and risk"],
                  ["Cross-method assessment", "Final scenario"],
                  ["AI / Quant", "Supporting evidence"],
                ]
          ).map(([name, role]) => (
            <div
              key={name ?? role}
              className="flex items-center justify-between rounded-lg border border-border/[0.08] px-4 py-3"
            >
              <span className="text-body-sm font-medium">{name}</span>
              <Badge variant={String(name).includes("六爻") || name === "Liu Yao" ? "default" : "outline"}>
                {role}
              </Badge>
            </div>
          ))}
        </div>
      </section>

      {/* Key-person BaZi corroboration */}
      <section className="space-y-4 border-t border-border/[0.08] pt-10">
        <Heading as="h2" size="h3">
          {zh ? "关键人物八字旁证" : "Key-person BaZi corroboration"}
        </Heading>
        <Card padding="lg" className="space-y-3">
          <Text variant="body" weight="semibold">
            {zh ? "只做中长期旁证，不抢资产自身卦象的方向权。" : "Long-horizon corroboration only; it never overrides the asset reading."}
          </Text>
          <Text variant="body-sm" color="secondary">
            {zh
              ? "仅用于与资产高度绑定的创始人、CEO、控股股东或核心持有人。出生资料必须可追溯；时辰不确定就降低权重并保留候选盘；还要先用公开可核实的重大事业事件回验。通过后只进入月度、季度、年度背景，默认约5%，最高10%，不进入日度方向投票。"
              : "Used only for people tightly bound to an asset, such as founders, CEOs, controlling shareholders or major strategic holders. Birth data must be traceable; uncertain birth time lowers the weight and keeps alternate charts. Historical career events are backtested first. The signal is then limited to monthly, quarterly and yearly context, normally 5% and capped at 10%."}
          </Text>
          <div className="flex flex-wrap gap-2">
            {(zh
              ? ["出生资料可追溯", "历史事件回验", "月度以上", "默认5%", "最高10%", "不得覆盖资产卦象"]
              : ["Traceable birth data", "Historical backtest", "Monthly+ only", "Default 5%", "Max 10%", "Never overrides asset reading"]
            ).map((label) => <Badge key={label} variant="outline">{label}</Badge>)}
          </div>
        </Card>
      </section>

      {/* Directions */}
      <section className="space-y-3 border-t border-border/[0.08] pt-10">
        <Heading as="h2" size="h3">
          {zh ? "正式方向用语" : "Formal direction labels"}
        </Heading>
        <div className="flex flex-wrap gap-2">
          {(zh ? ["↑ 看涨", "↓ 看跌", "↔ 方向不明确"] : ["↑ Bullish", "↓ Bearish", "↔ Unclear"]).map((label) => (
            <Badge key={label} variant="outline">{label}</Badge>
          ))}
        </div>
        <Text variant="caption" color="tertiary">
          {zh ? "先涨后跌、先跌后涨、冲高回落等词只描述运行路径，不再充当正式方向。正式方向永远只保留上面三种。" : "Path labels such as rally-then-fall describe sequence only. The official call is always one of the three labels above."}
        </Text>
      </section>

      <p className="text-caption text-foreground-tertiary">
        {zh ? (
          <>
            预测卡片底部可展开「预测依据」。也可直接从会员页返回{" "}
            <Link href={locale === "en" ? "/en/#moonx-view" : "/#moonx-view"} className="text-primary underline-offset-2 hover:underline">
              今日研判
            </Link>
            。
          </>
        ) : (
          "Forecast cards lead with one metaphysical direction. Technical levels remain execution references only."
        )}
      </p>
    </div>
  );
}
