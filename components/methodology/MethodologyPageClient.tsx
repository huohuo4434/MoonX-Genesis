"use client";

import Link from "next/link";
import { Badge, Card, Heading, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { MethodologyModule } from "@/lib/methodology/types";
import { OFFICIAL_DIRECTION_VALUES } from "@/lib/forecasts/formal-direction";

const ROLES_ZH = [
  ["六爻（核心）", "锁定周度／阶段方向"],
  ["奇门遁甲", "校准时间窗口，不反向改方向"],
  ["技术分析", "给支撑、压力、入场与止损"],
  ["消息面与AI", "可等待、减仓或否决，不直接触发交易"],
] as const;

const ROLES_EN = [
  ["Liu Yao (core)", "Locks the weekly or stage direction"],
  ["Qimen timing", "Refines timing without reversing direction"],
  ["Technical analysis", "Defines levels, entry and invalidation"],
  ["News and AI", "May wait, resize or block; never triggers alone"],
] as const;

const OUTPUTS_ZH = ["正式方向", "周期路径", "概率", "共识星级", "支撑压力", "执行状态", "风险"];
const OUTPUTS_EN = ["Direction", "Path", "Probability", "Consensus", "Levels", "Execution", "Risk"];

export function MethodologyPageClient({ modules }: { modules: MethodologyModule[] }) {
  const { locale } = useLocale();
  const zh = locale.startsWith("zh");
  const roles = zh ? ROLES_ZH : ROLES_EN;
  const enabled = modules.filter((module) => module.enabled);

  return (
    <div className="mx-auto w-full max-w-container space-y-8 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <header className="max-w-4xl space-y-3">
        <Badge variant="outline">{zh ? "MOOX预测方法" : "MOOX methodology"}</Badge>
        <Heading as="h1" size="h2">{zh ? "玄学定方向，缠论等位置，AI守纪律。" : "Metaphysics sets direction; Chan finds location; AI enforces discipline."}</Heading>
        <Text variant="body" color="secondary" className="block max-w-3xl">
          {zh ? "老师已锁定的周卦／阶段卦优先。六爻负责正式方向；奇门、技术、消息和AI只能校时、找位置或控制风险。" : "Locked teacher weekly or stage readings come first. Liu Yao owns direction; Qimen, technicals, news and AI refine timing, location and risk."}
        </Text>
      </header>

      <section className="grid gap-3 md:grid-cols-2">
        {roles.map(([name, role], index) => (
          <Card key={name} padding="md">
            <div className="flex items-start gap-3">
              <Badge variant={index === 0 ? "default" : "outline"}>{index + 1}</Badge>
              <div><Text variant="body" weight="semibold">{name}</Text><Text variant="body-sm" color="secondary" className="mt-1 block">{role}</Text></div>
            </div>
          </Card>
        ))}
      </section>

      <Card padding="lg" className="space-y-4 border-amber-400/25 bg-amber-400/[0.04]">
        <Heading as="h2" size="h3">{zh ? "日分析与最终预测输出" : "Daily analysis and final output"}</Heading>
        <Text variant="body-sm" color="secondary">
          {zh ? "不单独要求日卦。日分析从当前周卦／阶段卦按天干地支、市场日历和奇门时点拆分；证据不足就显示等待，不补卦、不编点位。" : "No separate daily hexagram is required. Daily views derive from the active weekly or stage record, calendar and Qimen timing; missing evidence means wait."}
        </Text>
        <div className="flex flex-wrap gap-2">{OFFICIAL_DIRECTION_VALUES.map((direction) => <Badge key={direction} variant="outline">{direction}</Badge>)}</div>
        <div className="flex flex-wrap gap-2">{(zh ? OUTPUTS_ZH : OUTPUTS_EN).map((item) => <Badge key={item} variant="outline">{item}</Badge>)}</div>
      </Card>

      {enabled.length ? (
        <section className="space-y-3">
          <Heading as="h2" size="h3">{zh ? "已启用研究模块" : "Enabled research modules"}</Heading>
          <div className="flex flex-wrap gap-2">{enabled.map((module) => <Badge key={module.id} variant="outline">{zh ? module.nameZh : module.nameEn}</Badge>)}</div>
        </section>
      ) : null}

      <p className="text-caption text-foreground-tertiary">{zh ? <>预测不是交易命令。查看 <Link href="/#moonx-view" className="text-primary hover:underline">今日研判</Link>。</> : "A forecast is not an order."}</p>
    </div>
  );
}
