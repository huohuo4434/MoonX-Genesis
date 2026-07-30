"use client";

import Link from "next/link";
import { Badge, Card, Heading, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { ALLOWED_FORMAL_DIRECTIONS } from "@/lib/forecasts/formal-direction";
import type { MethodologyModule } from "@/lib/methodology/types";

const CORE_FOUR = [
  {
    id: "liuyao",
    titleZh: "六爻（核心）",
    titleEn: "Liu Yao (Core)",
    bodyZh: "主方向与路径的核心判断",
    bodyEn: "Primary direction & path",
    accent: "border-amber-500/40 bg-amber-500/10",
    ring: "ring-amber-400/30",
  },
  {
    id: "qimen",
    titleZh: "奇门遁甲（择时）",
    titleEn: "Qi Men (Timing)",
    bodyZh: "时间节奏与窗口选择",
    bodyEn: "Timing windows & rhythm",
    accent: "border-sky-500/35 bg-sky-500/10",
    ring: "ring-sky-400/25",
  },
  {
    id: "market_structure",
    titleZh: "技术分析（结构）",
    titleEn: "Technical (Structure)",
    bodyZh: "支撑、压力、路径与失效位",
    bodyEn: "Levels, path & invalidation",
    accent: "border-emerald-500/35 bg-emerald-500/10",
    ring: "ring-emerald-400/25",
  },
  {
    id: "macro_flows",
    titleZh: "消息面（催化）",
    titleEn: "News (Catalysts)",
    bodyZh: "事件验证、催化与风险扰动",
    bodyEn: "Events, catalysts & risks",
    accent: "border-violet-500/35 bg-violet-500/10",
    ring: "ring-violet-400/25",
  },
] as const;

const FLOW_ZH = [
  "周卦与六爻",
  "动爻与时间节奏",
  "奇门遁甲／万年历",
  "技术结构与关键价位",
  "消息面校验",
  "实际行情动态修正",
  "方向、概率和路径",
  "发布锁定",
  "结果验证",
];

const FLOW_EN = [
  "Weekly Liu Yao",
  "Moving lines & rhythm",
  "Qi Men / calendar",
  "Structure & levels",
  "News check",
  "Live progress revise",
  "Direction, odds & path",
  "Publish & lock",
  "Verify results",
];

const OUTPUTS_ZH = ["方向", "概率", "路径", "支撑", "压力", "失效位", "风险"];
const OUTPUTS_EN = ["Direction", "Odds", "Path", "Support", "Resistance", "Invalidation", "Risk"];

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
            ? "六爻负责一周核心方向与变化节奏；奇门与万年历研究时间窗口；技术分析确认价位；消息面校验催化与风险；实际行情判断是否提前、滞后或失效。"
            : "Liu Yao sets the weekly core; Qi Men/calendar time the window; technicals lock levels; news checks catalysts; live tape revises ahead/delay/invalidation."}
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
                  ["技术分析", "结构确认"],
                  ["消息面", "催化与风险校验"],
                  ["波浪分析", "辅助观察"],
                  ["AI／量化", "辅助参考"],
                ]
              : [
                  ["Liu Yao", "Core judgment"],
                  ["Qi Men", "Timing"],
                  ["Technical", "Structure"],
                  ["News", "Catalysts & risks"],
                  ["Wave", "Supporting"],
                  ["AI / Quant", "Supporting"],
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

      {/* Directions */}
      <section className="space-y-3 border-t border-border/[0.08] pt-10">
        <Heading as="h2" size="h3">
          {zh ? "正式方向用语" : "Formal direction labels"}
        </Heading>
        <div className="flex flex-wrap gap-2">
          {ALLOWED_FORMAL_DIRECTIONS.map((d) => (
            <Badge key={d} variant="outline">
              {d}
            </Badge>
          ))}
        </div>
      </section>

      <p className="text-caption text-foreground-tertiary">
        {zh ? (
          <>
            预测卡片底部可展开「预测依据」。也可直接从会员页返回{" "}
            <Link href="/forecasts/daily" className="text-primary underline-offset-2 hover:underline">
              今日观点
            </Link>
            。
          </>
        ) : (
          "Forecast cards include expandable “Forecast basis” linking back here."
        )}
      </p>
    </div>
  );
}
