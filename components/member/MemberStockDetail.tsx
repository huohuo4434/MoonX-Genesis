"use client";

import Link from "next/link";
import { useState } from "react";
import { PriceLevelsBlock } from "@/components/forecasts/PriceLevelsBlock";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";
import { formatDateTimeChina } from "@/lib/utils/datetime";
import { mooxDirectionArrow, mooxDirectionLabelZh } from "@/lib/forecasts/moox-direction-doctrine";
import { getOctober2026AssetRisk } from "@/lib/research/october-2026-flash-crash-risk";
import type {
  MemberBenefitStock,
  MemberStockDailyMemberView,
  MemberStockWeeklyMemberView,
} from "@/types/member-stock";

function ProbRow({ p }: { p: { up: number; flat: number; down: number } }) {
  return (
    <Text variant="caption" color="tertiary" className="block">
      上涨 {p.up}% · 震荡 {p.flat}% · 下跌 {p.down}%
    </Text>
  );
}

function DailyPanel({
  title,
  forecast,
}: {
  title: string;
  forecast: MemberStockDailyMemberView;
}) {
  return (
    <Card padding="md" className="min-w-0 space-y-2 overflow-hidden">
      <Text variant="body" weight="semibold">
        {title}
      </Text>
      <Text variant="caption" color="tertiary" className="block">
        预测日期：{forecast.forecastDate}
      </Text>
      <Text variant="body-sm" weight="semibold" className="block">
        主要走势：{forecast.primaryDirection}
      </Text>
      <Text variant="body-sm" weight="semibold" className="block">
        收盘倾向：{forecast.closingBias}
      </Text>
      <Badge variant="outline">{mooxDirectionArrow(forecast.direction)} {mooxDirectionLabelZh(forecast.direction)}</Badge>
      <ProbRow p={forecast.probabilities} />
      <Text variant="body-sm" className="block break-words">
        {forecast.headline}
      </Text>
      <Text variant="caption" color="secondary" className="block break-words">
        盘中运行顺序：{forecast.expectedPath || forecast.pathDirection}
      </Text>
      <PriceLevelsBlock
        support={forecast.keySupport}
        resistance={forecast.keyResistance}
        invalidation={forecast.invalidation}
        confirmation={forecast.confirmation}
        priceSource={forecast.priceDataSourceLabel}
        snapshotAt={
          forecast.priceSnapshotAtLabel
            ? formatDateTimeChina(forecast.priceSnapshotAtLabel)
            : undefined
        }
      />
      {forecast.riskNote ? (
        <Text variant="caption" color="tertiary" className="block break-words">
          风险提示：{forecast.riskNote}
        </Text>
      ) : null}
      <Text variant="caption" color="tertiary" className="block">
        风险等级：{forecast.riskLevel} · 置信度：{forecast.confidence}% · 来源：
        {forecast.publicSourceLabel}
      </Text>
      <Text variant="caption" color="tertiary" className="block">
        发布时间：{formatDateTimeChina(forecast.publishedAt)}
      </Text>
      <Text variant="caption" color="tertiary" className="block">
        验证状态：
        {forecast.accuracyEligible
          ? forecast.verificationStatus === "pending"
            ? "待验证"
            : forecast.verificationStatus
          : "不计入准确率"}
      </Text>
    </Card>
  );
}

function WeeklyPanel({ weekly }: { weekly: MemberStockWeeklyMemberView }) {
  return (
    <Card padding="md" className="min-w-0 space-y-2 overflow-hidden">
      <Text variant="body" weight="semibold">
        本周分析
      </Text>
      <Text variant="caption" color="tertiary" className="block">
        分析周期：{weekly.weekStart} 至 {weekly.weekEnd}
      </Text>
      <Text variant="body-sm" weight="semibold" className="block">
        周内路径：{weekly.pathDirection || weekly.primaryDirection}
      </Text>
      <Text variant="body-sm" weight="semibold" className="block">
        周末倾向：{weekly.closingBias}
      </Text>
      <Badge variant="outline">{mooxDirectionArrow(weekly.overallDirection)} {mooxDirectionLabelZh(weekly.overallDirection)}</Badge>
      <ProbRow p={weekly.probabilities} />
      <Text variant="body-sm" className="block break-words">
        {weekly.headline}
      </Text>
      <Text variant="caption" color="secondary" className="block break-words">
        周内运行顺序：{weekly.weeklyPath}
      </Text>
      {weekly.strongWindow ? (
        <Text variant="caption" color="tertiary" className="block break-words">
          较强时间窗口：{weekly.strongWindow}
        </Text>
      ) : null}
      {weekly.weakWindow ? (
        <Text variant="caption" color="tertiary" className="block break-words">
          较弱时间窗口：{weekly.weakWindow}
        </Text>
      ) : null}
      <PriceLevelsBlock
        support={weekly.keySupport}
        resistance={weekly.keyResistance}
        invalidation={weekly.invalidation}
        confirmation={weekly.confirmation}
        priceSource={weekly.priceDataSourceLabel}
        snapshotAt={
          weekly.priceSnapshotAtLabel
            ? formatDateTimeChina(weekly.priceSnapshotAtLabel)
            : undefined
        }
      />
      {weekly.riskNote ? (
        <Text variant="caption" color="tertiary" className="block break-words">
          风险提示：{weekly.riskNote}
        </Text>
      ) : null}
      <Text variant="caption" color="tertiary" className="block">
        风险等级：{weekly.riskLevel} · 置信度：{weekly.confidence}% · 来源：
        {weekly.publicSourceLabel}
      </Text>
      <Text variant="caption" color="tertiary" className="block">
        发布时间：{formatDateTimeChina(weekly.publishedAt)}
      </Text>
    </Card>
  );
}

export function MemberStockLockedView({
  name,
  symbol,
  marketLabel,
  tags,
  hasToday,
  hasTomorrow,
  hasWeekly,
}: {
  name: string;
  symbol: string;
  marketLabel: string;
  tags: string[];
  hasToday: boolean;
  hasTomorrow: boolean;
  hasWeekly: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-container space-y-4 px-4 py-8 sm:px-6 lg:px-8">
      <Heading as="h1" size="h2">
        {name}
      </Heading>
      <Text variant="caption" color="tertiary" className="block font-mono">
        股票代码：{symbol}
      </Text>
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <Badge key={t} variant="outline">
            {t}
          </Badge>
        ))}
        <Badge variant="outline">{marketLabel}</Badge>
      </div>
      <Card padding="md" className="space-y-2">
        <Text variant="body-sm" weight="semibold">
          分析已经上线
        </Text>
        {hasToday ? (
          <Text variant="caption" color="tertiary" className="block">
            今日预测已生成 · 会员锁定
          </Text>
        ) : null}
        {hasTomorrow ? (
          <Text variant="caption" color="tertiary" className="block">
            长鑫科技明日预测已生成 · 会员锁定
          </Text>
        ) : null}
        {hasWeekly ? (
          <Text variant="caption" color="tertiary" className="block">
            本周分析已生成 · 会员锁定
          </Text>
        ) : null}
        <Button asChild size="sm" className="mt-2 w-fit">
          <Link href="/pricing">购买会员</Link>
        </Button>
      </Card>
    </div>
  );
}

export function MemberStockDetailView({
  stock,
  today,
  tomorrow,
  weekly,
  updatedAt,
  riskLevel,
  ipoHighVolWarning,
  isAdmin,
  sourceIds,
}: {
  stock: MemberBenefitStock;
  today: MemberStockDailyMemberView | null;
  tomorrow: MemberStockDailyMemberView | null;
  weekly: MemberStockWeeklyMemberView | null;
  updatedAt: string | null;
  riskLevel: string | null;
  ipoHighVolWarning: boolean;
  isAdmin: boolean;
  sourceIds?: string[];
}) {
  const tabs = [
    today ? { key: "today" as const, label: "今日" } : null,
    tomorrow ? { key: "tomorrow" as const, label: "明日" } : null,
    weekly ? { key: "weekly" as const, label: "本周" } : null,
    { key: "history" as const, label: "验证" },
  ].filter(Boolean) as Array<{ key: "today" | "tomorrow" | "weekly" | "history"; label: string }>;

  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>(tabs[0]?.key ?? "today");
  const riskReference = new Date(updatedAt || today?.publishedAt || weekly?.publishedAt || "2026-08-20T00:00:00+08:00");
  const octoberAssetRisk = getOctober2026AssetRisk(stock.symbol, riskReference, stock.market);

  return (
    <div className="mx-auto w-full max-w-container space-y-4 px-4 py-8 sm:px-6 lg:px-8">
      <div className="min-w-0 space-y-2">
        <Heading as="h1" size="h2" className="break-words">
          {stock.name}
        </Heading>
        <Text variant="caption" color="tertiary" className="block font-mono">
          {stock.symbol}
        </Text>
        {today ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{mooxDirectionArrow(today.direction)} {mooxDirectionLabelZh(today.direction)}</Badge>
          </div>
        ) : null}
        {today ? (
          <Text variant="body-sm" className="block break-words">
            {today.headline}
          </Text>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {stock.tags.map((t) => (
            <Badge key={t} variant="outline">
              {t}
            </Badge>
          ))}
        </div>
        <Text variant="caption" color="tertiary" className="block">
          市场：{stock.marketLabel}
          {riskLevel ? ` · 当前风险等级：${riskLevel}` : ""}
        </Text>
        {updatedAt ? (
          <Text variant="caption" color="tertiary" className="block">
            最后更新：{formatDateTimeChina(updatedAt)}
          </Text>
        ) : null}
      </div>

      {octoberAssetRisk.state !== "INACTIVE" ? (
        <Card padding="md" className="border border-amber-300/20 bg-amber-300/[0.04]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Text variant="body-sm" weight="semibold" className="text-amber-100">10月闪崩风险先验 · {octoberAssetRisk.stateLabelZh}</Text>
              <Text variant="caption" color="secondary" className="mt-1 block break-words">{octoberAssetRisk.sensitivityLabelZh}。{octoberAssetRisk.noteZh}</Text>
            </div>
            <Badge variant="outline">{octoberAssetRisk.windowLabelZh}</Badge>
          </div>
          <Text variant="caption" color="tertiary" className="mt-2 block">中周期风险先验只调整仓位、杠杆和追涨纪律，不反向修改该个股已经锁定的正式方向。</Text>
        </Card>
      ) : null}

      {ipoHighVolWarning ? (
        <Card padding="md" className="border border-warning/30 bg-warning/5">
          <Text variant="body-sm" className="break-words">
            长鑫科技处于上市初期，股价波动可能明显高于普通股票。上市后前5个交易日不设涨跌幅限制，请严格控制风险。
          </Text>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-border/[0.08] pb-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-md px-3 py-1.5 text-body-sm ${
              tab === t.key ? "bg-primary text-primary-foreground" : "text-foreground-secondary hover:bg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {tab === "today" && today ? <DailyPanel title="今日预测" forecast={today} /> : null}
        {tab === "tomorrow" && tomorrow ? (
          <DailyPanel title="明日预测" forecast={tomorrow} />
        ) : null}
        {tab === "weekly" && weekly ? <WeeklyPanel weekly={weekly} /> : null}
        {tab === "history" ? (
          <Card padding="md">
            <Text variant="body-sm" weight="semibold">
              历史验证
            </Text>
            <Text variant="caption" color="tertiary" className="mt-2 block">
              准确率从模块正式上线后的提前发布预测开始统计。
            </Text>
            <Button asChild size="sm" variant="outline" className="mt-3 w-fit">
              <Link href={`/member/stocks/${stock.stockId}/history`}>查看历史验证</Link>
            </Button>
          </Card>
        ) : null}
      </div>

      {isAdmin && sourceIds?.length ? (
        <Card padding="md">
          <Text variant="caption" color="tertiary" className="block">
            管理员资料：{sourceIds.join(" · ")}
          </Text>
          <Button asChild size="sm" variant="outline" className="mt-2 w-fit">
            <Link href={`/admin/stocks/${stock.stockId}`}>后台编辑</Link>
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
