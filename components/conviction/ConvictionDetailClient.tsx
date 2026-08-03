"use client";

import Link from "next/link";
import { useState } from "react";
import { PriceLevelsBlock } from "@/components/forecasts/PriceLevelsBlock";
import { ForecastEvidencePanel } from "@/components/forecasts/ForecastEvidencePanel";
import { VibeEvidencePanel } from "@/components/conviction/VibeEvidencePanel";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";
import { formatMarketCapDisplay } from "@/lib/data/conviction/format-market-cap";
import { buildForecastModuleEvidence } from "@/lib/methodology/evidence";
import { assetVenue } from "@/lib/presentation/asset-catalog";
import { formatDateChina, formatDateTimeChina } from "@/lib/utils/datetime";
import type { ConvictionDetailPayload, ConvictionPeriodSlot } from "@/lib/data/conviction/access";
import type {
  MemberStockDailyMemberView,
  MemberStockWeeklyMemberView,
} from "@/types/member-stock";

function ProbRow({ p }: { p: { up: number; flat: number; down: number } }) {
  return (
    <Text variant="caption" className="block text-white/45">
      上涨 {p.up}% · 震荡 {p.flat}% · 下跌 {p.down}%
    </Text>
  );
}

function DailyPanel({ title, forecast }: { title: string; forecast: MemberStockDailyMemberView }) {
  return (
    <Card padding="md" className="min-w-0 space-y-2 overflow-hidden border-white/[0.08] bg-[#0c0e12]">
      <Text variant="body" weight="semibold" className="text-white">
        {title}
      </Text>
      <Text variant="caption" className="block text-white/45">
        预测日期：{forecast.forecastDate}
      </Text>
      <Badge variant="outline">{forecast.direction}</Badge>
      <ProbRow p={forecast.probabilities} />
      <Text variant="body-sm" className="block break-words text-white/75">
        {forecast.headline}
      </Text>
      <Text variant="caption" className="block break-words text-white/55">
        盘中运行顺序：{forecast.expectedPath || forecast.pathDirection}
      </Text>
      <PriceLevelsBlock
        support={forecast.keySupport}
        resistance={forecast.keyResistance}
        invalidation={forecast.invalidation}
        confirmation={forecast.confirmation}
      />
      <ForecastEvidencePanel
        items={buildForecastModuleEvidence({
          directionLabel: forecast.direction,
          summary: forecast.headline,
          expectedPath: forecast.expectedPath ? [forecast.expectedPath] : undefined,
          probabilities: forecast.probabilities,
          supportLevels: forecast.keySupport,
          resistanceLevels: forecast.keyResistance,
          invalidation: forecast.invalidation,
          confirmation: forecast.confirmation,
        })}
      />
    </Card>
  );
}

function WeeklyPanel({ weekly }: { weekly: MemberStockWeeklyMemberView }) {
  return (
    <Card padding="md" className="min-w-0 space-y-2 overflow-hidden border-white/[0.08] bg-[#0c0e12]">
      <Text variant="body" weight="semibold" className="text-white">
        本周分析
      </Text>
      <Badge variant="outline">{weekly.overallDirection}</Badge>
      <ProbRow p={weekly.probabilities} />
      <Text variant="body-sm" className="block break-words text-white/75">
        {weekly.headline}
      </Text>
      <PriceLevelsBlock
        support={weekly.keySupport}
        resistance={weekly.keyResistance}
        invalidation={weekly.invalidation}
        confirmation={weekly.confirmation}
      />
    </Card>
  );
}

function Stars({ value }: { value: number }) {
  const safe = Math.max(1, Math.min(5, Math.round(value)));
  return (
    <span className="font-mono text-amber-300" aria-label={`${safe}星共识`}>
      {"★".repeat(safe)}
      <span className="text-white/15">{"★".repeat(5 - safe)}</span>
    </span>
  );
}

function PeriodPanel({ slot }: { slot: ConvictionPeriodSlot }) {
  if (!slot.forecast) {
    return (
      <Card padding="md" className="border-white/[0.08] bg-[#0c0e12]">
        <Text variant="body-sm" className="text-white/60">
          {slot.emptyZh}
        </Text>
      </Card>
    );
  }
  const f = slot.forecast;
  const ended = slot.freshnessStatus === "EXPIRED";
  const upcoming = slot.freshnessStatus === "UPCOMING";
  return (
    <Card padding="md" className="min-w-0 space-y-5 overflow-hidden border-white/[0.08] bg-[#0c0e12]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Text variant="body" weight="semibold" className="text-white">
              {slot.labelZh}分析
            </Text>
            <Badge variant="outline">{f.direction}</Badge>
            <Badge variant="outline">风险 {f.riskLevel}</Badge>
            {ended ? <Badge variant="outline">历史周期 · 已结束</Badge> : null}{upcoming ? <Badge variant="outline">即将开始</Badge> : null}
          </div>
          <Text variant="caption" className="block text-white/45">
            周期：{f.periodStart} 至 {f.periodEnd}
          </Text>
        </div>
        {f.consensusStars ? (
          <div className="rounded-lg border border-amber-400/15 bg-amber-400/[0.04] px-3 py-2 text-right">
            <p className="text-caption text-white/40">方法共识</p>
            <Stars value={f.consensusStars} />
          </div>
        ) : null}
      </div>

      <section className="space-y-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <p className="font-mono text-caption uppercase tracking-[0.14em] text-white/40">综合判断</p>
        <ProbRow
          p={{
            up: f.upProbability,
            flat: f.sidewaysProbability,
            down: f.downProbability,
          }}
        />
        <Text variant="body-sm" className="block break-words leading-relaxed text-white/80">
          {f.summary}
        </Text>
        {f.consensusLabel ? (
          <Text variant="caption" className="block text-amber-200/75">
            共识说明：{f.consensusLabel}
          </Text>
        ) : null}
      </section>

      <section className="space-y-2">
        <p className="font-mono text-caption uppercase tracking-[0.14em] text-white/40">运行路径</p>
        <Text variant="body-sm" className="block break-words leading-relaxed text-white/70">
          {f.expectedPath}
        </Text>
      </section>

      {f.benchmarkEvidence ? (
        <section className="space-y-2 rounded-lg border border-sky-400/12 bg-sky-400/[0.025] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-caption uppercase tracking-[0.14em] text-sky-200/70">与大盘比较</p>
            <Badge variant="outline">{f.benchmarkEvidence.relation}</Badge>
          </div>
          <p className="text-body-sm text-white/70">
            {f.benchmarkEvidence.benchmarkNameZh}（{f.benchmarkEvidence.benchmarkSymbol}）：{f.benchmarkEvidence.benchmarkDirection}
          </p>
          <p className="text-caption leading-relaxed text-white/50">{f.benchmarkEvidence.summary}</p>
        </section>
      ) : null}

      {f.keyDates?.length ? (
        <section className="space-y-3 rounded-lg border border-amber-400/15 bg-amber-400/[0.03] p-4">
          <div>
            <p className="font-mono text-caption uppercase tracking-[0.14em] text-amber-200/70">关键日期</p>
            <p className="mt-1 text-caption text-white/40">仅展示有老师原始规则或正式卦象依据的日期。</p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {f.keyDates.map((item, index) => (
              <div key={`${item.date ?? item.branchRule ?? index}-${item.label}`} className="rounded-lg border border-white/[0.07] bg-black/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-body-sm font-semibold text-amber-200">
                    {item.date ?? item.branchRule ?? "干支日期待确认"}
                    {item.ganzhi ? ` · ${item.ganzhi}` : ""}
                  </p>
                  <Badge variant="outline">{item.type}</Badge>
                </div>
                <p className="mt-1 text-caption text-white/70">{item.label}</p>
                <p className="mt-1 text-caption text-white/40">来源：{item.source}{item.confidence ? ` · 置信度${item.confidence}%` : ""}</p>
                {item.note ? <p className="mt-1 text-caption leading-relaxed text-white/50">{item.note}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {f.methodViews?.length ? (
        <section className="space-y-2">
          <p className="font-mono text-caption uppercase tracking-[0.14em] text-white/40">多方法观点</p>
          <div className="grid gap-2 md:grid-cols-2">
            {f.methodViews.map((view) => (
              <div key={view.id} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-body-sm font-medium text-white/80">{view.label}</p>
                  <span className="text-caption text-white/40">权重 {view.weight}%</span>
                </div>
                <p className="mt-1 text-caption text-primary">{view.direction}</p>
                <p className="mt-1 text-caption leading-relaxed text-white/55">{view.summary}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <p className="font-mono text-caption uppercase tracking-[0.14em] text-white/40">六爻依据</p>
        <Text variant="body-sm" className="block text-white/75">
          {f.ichingEvidence.primaryHexagram}
          {f.ichingEvidence.changingHexagram ? ` → ${f.ichingEvidence.changingHexagram}` : ""}
        </Text>
        <Text variant="caption" className="block break-words leading-relaxed text-white/50">
          {f.ichingEvidence.notes}
        </Text>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <section className="space-y-2 rounded-lg border border-white/[0.06] p-3">
          <p className="font-mono text-caption uppercase tracking-[0.14em] text-white/40">催化因素</p>
          <ul className="space-y-1 text-caption text-white/60">
            {f.catalysts.length ? f.catalysts.map((item) => <li key={item}>· {item}</li>) : <li>· 暂无独立催化信号</li>}
          </ul>
        </section>
        <section className="space-y-2 rounded-lg border border-white/[0.06] p-3">
          <p className="font-mono text-caption uppercase tracking-[0.14em] text-white/40">主要风险</p>
          <ul className="space-y-1 text-caption text-white/60">
            {f.risks.length ? f.risks.map((item) => <li key={item}>· {item}</li>) : <li>· 暂无独立风险信号</li>}
          </ul>
        </section>
      </div>
    </Card>
  );
}

function LongTermArchive({ periods }: { periods: ConvictionPeriodSlot[] }) {
  const items = periods.filter((slot) => slot.forecast?.archiveSummary);
  if (!items.length) return null;
  return (
    <details className="rounded-xl border border-white/[0.08] bg-[#0c0e12] p-4">
      <summary className="cursor-pointer list-none text-body-sm font-medium text-white/80">
        总趋势资料库
        <span className="ml-2 text-caption font-normal text-white/40">长期材料仅作大方向背景</span>
      </summary>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {items.map((slot) => {
          const f = slot.forecast!;
          return (
            <div key={f.id} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-body-sm font-medium text-white/80">{slot.labelZh}</p>
                <Badge variant="outline">{f.direction}</Badge>
              </div>
              <p className="mt-2 text-caption leading-relaxed text-white/55">{f.archiveSummary}</p>
              <p className="mt-2 text-caption text-white/35">
                {f.ichingEvidence.primaryHexagram}
                {f.ichingEvidence.changingHexagram ? ` → ${f.ichingEvidence.changingHexagram}` : ""}
              </p>
            </div>
          );
        })}
      </div>
    </details>
  );
}

export function ConvictionDetailClient({ payload }: { payload: ConvictionDetailPayload }) {
  const a = payload.public;
  const mcap = formatMarketCapDisplay(a);
  const title = `${a.nameZh}研究档案`;
  const unlockHref = payload.isAuthenticated
    ? "/pricing"
    : `/login?next=${encodeURIComponent(a.detailHref)}`;
  const isStaticPeriodAsset = [
    "cxmt",
    "asteroid",
    "mu",
    "hype",
    "eth",
    "googl",
    "msft",
    "tencent",
    "kingsoft-office",
  ].includes(a.slug);
  const isAsteroid = a.slug === "asteroid";
  const tabs = payload.periodSlots;
  const visibleTypes = new Set(tabs.map((item) => item.type));
  const archivePeriods = payload.forecast?.periods?.filter((item) => !visibleTypes.has(item.type)) ?? [];
  const [tab, setTab] = useState(tabs[0]?.type ?? "WEEK");

  return (
    <div className="min-h-screen bg-[#07080a] text-white">
      <div className="mx-auto w-full max-w-[1240px] space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div>
          <Link
            href="/featured-stocks"
            className="text-caption text-white/45 underline-offset-4 hover:text-white/70 hover:underline"
          >
            ← 返回重点关注
          </Link>
          <Heading as="h1" size="h2" className="mt-3 text-white">
            {isAsteroid ? "Asteroid（太空狗）" : title}
          </Heading>
          <p className="mt-2 font-mono text-body-sm text-white/50">
            {isAsteroid
              ? `ASTEROID · ${assetVenue("ASTEROID")}`
              : `${a.nameEn}${a.aliasZh && a.aliasZh !== a.nameZh ? ` · ${a.aliasZh}` : ""} · ${a.symbol} · ${assetVenue(a.symbol)}`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline">{a.assetType === "STOCK" ? "股票" : a.assetType === "CRYPTO" ? "加密资产" : a.assetType === "ETF" ? "ETF" : a.assetType === "INDEX" ? "指数" : "商品"}</Badge>
            <Badge variant="outline">MOOX评级：{a.rating}</Badge>
            <Badge variant="outline">风险等级：{a.riskLevel}</Badge>
            <Badge variant="outline">{a.researchStatusZh}</Badge>
          </div>
          <p className="mt-2 text-caption text-white/40">
            最近更新：{formatDateChina(a.researchUpdatedAt)}
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="font-mono text-caption uppercase tracking-[0.16em] text-white/40">基本面介绍</h2>
          <p className="text-body-sm leading-relaxed text-white/75">{a.summaryZh}</p>
          {mcap ? (
            <div className="space-y-1 text-body-sm text-white/65">
              <p>市值：{mcap.labelZh}</p>
              {mcap.updatedAt ? (
                <p className="text-caption text-white/45">
                  市值更新时间：{formatDateTimeChina(mcap.updatedAt)}
                </p>
              ) : null}
            </div>
          ) : null}
          {a.contractAddress ? (
            <p className="break-all text-body-sm text-white/65">
              合约地址：<span className="font-mono text-caption">{a.contractAddress}</span>
            </p>
          ) : a.contractPendingAdminConfirm ? (
            <p className="text-caption text-white/50">合约信息尚未公开。</p>
          ) : null}
          {a.network ? (
            <p className="text-body-sm text-white/65">所属链：{a.network}</p>
          ) : null}
          
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-caption uppercase tracking-[0.16em] text-white/40">为什么关注</h2>
          <ul className="space-y-2">
            {a.thesisZh.map((line) => (
              <li key={line} className="text-body-sm text-white/75">
                · {line}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-caption uppercase tracking-[0.16em] text-white/40">催化剂</h2>
          <div className="flex flex-wrap gap-2">
            {a.catalystsZh.map((c) => (
              <Badge key={c} variant="outline" className="border-white/12 text-white/70">
                {c}
              </Badge>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-caption uppercase tracking-[0.16em] text-white/40">主要风险</h2>
          <ul className="space-y-1.5">
            {a.risksZh.map((r) => (
              <li key={r} className="text-body-sm text-white/65">
                · {r}
              </li>
            ))}
          </ul>
        </section>

        {payload.deviceAccessRequired ? (
          <Card padding="md" className="border-amber-400/20 bg-amber-400/[0.05]">
            <Text variant="body-sm" className="text-amber-100">
              当前付费账号需要确认本设备后才能显示完整研究。<Link className="ml-1 underline" href="/account#account-security">管理登录设备</Link>
            </Text>
          </Card>
        ) : null}

        {payload.mode === "fullAccess" && payload.vibeEvidence ? (
          <VibeEvidencePanel evidence={payload.vibeEvidence} />
        ) : null}

        {payload.freshness.needsUpdate ? (
          <Card padding="md" className="border-red-400/20 bg-red-400/[0.04]">
            <Text variant="body-sm" weight="semibold" className="text-red-100">当前周期研究待更新</Text>
            <Text variant="caption" className="mt-1 block text-red-100/65">{payload.freshness.label}。页面不再把过期内容标记为当前报告。</Text>
          </Card>
        ) : null}

        <section className="space-y-3">
          <h2 className="font-mono text-caption uppercase tracking-[0.16em] text-white/40">会员预测周期</h2>
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t.type}
                type="button"
                onClick={() => setTab(t.type)}
                className={`rounded-md px-3 py-1.5 text-body-sm ${
                  tab === t.type
                    ? "bg-white text-black"
                    : "border border-white/15 text-white/70 hover:bg-white/5"
                }`}
              >
                {t.labelZh}
                {payload.mode === "publicOnly" && t.hasResearch ? (
                  <span className="ml-1 text-caption text-white/40">·已更新</span>
                ) : null}
              </button>
            ))}
          </div>
        </section>

        {payload.mode === "publicOnly" ? (
          <section className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent p-5">
            <h2 className="text-h3 text-white">会员专享预测</h2>
            <p className="mt-2 text-body-sm text-white/55">
              本周分析、月度分析、六爻依据与总趋势资料库仅对有效会员开放。
            </p>
            <ul className="mt-4 space-y-2 text-body-sm text-white/60">
              {payload.locks.map((lock) => (
                <li
                  key={lock.key}
                  className="flex items-center justify-between gap-3 border-b border-white/[0.05] py-2 last:border-0"
                >
                  <span>{lock.labelZh}</span>
                  <span className="font-mono text-caption text-white/35">研究记录</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild>
                <Link href={unlockHref}>解锁完整预测</Link>
              </Button>
              <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/5">
                <Link href="/pricing">会员价格</Link>
              </Button>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <h2 className="font-mono text-caption uppercase tracking-[0.16em] text-white/40">会员专享预测</h2>
            {payload.isAdmin ? (
              <p className="text-caption text-emerald-300/80">完整研究已开放</p>
            ) : null}

            {isStaticPeriodAsset && payload.forecast?.periods ? (
              <>
                <PeriodPanel
                  slot={
                    payload.forecast.periods.find((p) => p.type === tab) ?? {
                      type: tab,
                      labelZh: tabs.find((t) => t.type === tab)?.labelZh ?? tab,
                      emptyZh: tabs.find((t) => t.type === tab)?.emptyZh ?? "该周期预测尚未发布",
                      forecast: null,
                      freshnessStatus: "MISSING",
                    }
                  }
                />
                <LongTermArchive periods={archivePeriods} />
              </>
            ) : (
              <>
                {tab === "TODAY" ? (
                  payload.forecast?.today ? (
                    <DailyPanel title="今日预测" forecast={payload.forecast.today} />
                  ) : (
                    <Card padding="md" className="border-white/[0.08] bg-[#0c0e12]">
                      <Text variant="body-sm" className="text-white/60">
                        今日分析尚未发布
                      </Text>
                    </Card>
                  )
                ) : null}
                {tab === "TOMORROW" ? (
                  payload.forecast?.tomorrow ? (
                    <DailyPanel title="下一交易日预测" forecast={payload.forecast.tomorrow} />
                  ) : (
                    <Card padding="md" className="border-white/[0.08] bg-[#0c0e12]">
                      <Text variant="body-sm" className="text-white/60">
                        下一交易日分析尚未发布
                      </Text>
                    </Card>
                  )
                ) : null}
                {tab === "WEEK" ? (
                  payload.forecast?.weekly ? (
                    <WeeklyPanel weekly={payload.forecast.weekly} />
                  ) : (
                    <Card padding="md" className="border-white/[0.08] bg-[#0c0e12]">
                      <Text variant="body-sm" className="text-white/60">
                        该周期预测尚未发布
                      </Text>
                    </Card>
                  )
                ) : null}
              </>
            )}

            <section className="space-y-3">
              <h3 className="font-mono text-caption uppercase tracking-[0.16em] text-white/40">历史验证</h3>
              {payload.forecast?.history?.length ? (
                payload.forecast.history.map((r) => (
                  <Card key={r.forecastId} padding="md" className="border-white/[0.08] bg-[#0c0e12]">
                    <div className="flex flex-wrap items-center gap-2">
                      <Text variant="body-sm" weight="semibold" className="text-white">
                        {r.forecastDate}
                      </Text>
                      <Badge variant="outline">{r.predictedDirection}</Badge>
                      <Badge variant="outline">{r.verdictLabel}</Badge>
                    </div>
                  </Card>
                ))
              ) : isStaticPeriodAsset && payload.forecast?.periods?.length ? (
                <div className="space-y-3">
                  <Card padding="md" className="border-white/[0.08] bg-[#0c0e12]">
                    <Text variant="body-sm" weight="semibold" className="text-white">
                      周期研究：当前 {payload.forecast.periods.filter((item) => item.forecast && item.freshnessStatus === "CURRENT").length} 条 · 历史 {payload.forecast.periods.filter((item) => item.forecast && item.freshnessStatus === "EXPIRED").length} 条
                    </Text>
                    <Text variant="caption" className="mt-1 block text-white/45">
                      周期结束并取得真实行情后才进入命中率；不会为了页面好看提前填写“命中”。
                    </Text>
                  </Card>
                  <div className="grid gap-2 md:grid-cols-2">
                    {payload.forecast.periods
                      .filter((item) => item.forecast)
                      .slice(0, 4)
                      .map((item) => (
                        <Card key={`sample-${item.forecast!.id}`} padding="md" className="border-white/[0.08] bg-[#0c0e12]">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Text variant="body-sm" weight="semibold" className="text-white">
                              {item.labelZh} · {item.forecast!.direction}
                            </Text>
                            <Badge variant="outline">
                              {item.forecast!.validationStatus === "UNVERIFIED"
                                ? "待验证"
                                : item.forecast!.validationStatus}
                            </Badge>
                          </div>
                          <Text variant="caption" className="mt-1 block text-white/45">
                            {item.forecast!.periodStart} 至 {item.forecast!.periodEnd}
                          </Text>
                        </Card>
                      ))}
                  </div>
                </div>
              ) : (
                <Text variant="body-sm" className="text-white/55">
                  正式验证从2026年8月1日新基准开始积累；当前暂无完成周期的真实样本。
                </Text>
              )}
            </section>
          </section>
        )}
      </div>
    </div>
  );
}
