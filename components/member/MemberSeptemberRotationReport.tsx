"use client";

import { Badge, Card, Heading, Text } from "@/components/ui";
import { MEMBER_SEPTEMBER_ROTATION_REPORT_20260826 as report } from "@/lib/data/member-september-rotation-report-20260826";
import { useLocale } from "@/lib/i18n/LocaleProvider";

function assetTone(tone: "positive" | "neutral" | "negative") {
  if (tone === "positive") return "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-200";
  if (tone === "negative") return "border-rose-400/25 bg-rose-400/[0.06] text-rose-200";
  return "border-amber-300/25 bg-amber-300/[0.06] text-amber-100";
}
function cellTone(value: string) {
  if (/强|高位候选|Strength|Strong|high zone/i.test(value)) return "text-emerald-200";
  if (/回调|退守|受限|风险|pullback|Defensive|Capped|risk/i.test(value)) return "text-rose-200";
  return "text-foreground-secondary";
}

export function MemberSeptemberRotationReport() {
  const { locale } = useLocale();
  const en = locale === "en";

  return (
    <section className="space-y-4" aria-labelledby="september-rotation-title">
      <Card padding="lg" data-conclusion-first="1" className="overflow-hidden border-violet-400/25 bg-gradient-to-br from-violet-500/[0.10] via-background to-cyan-500/[0.05]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">{en ? "September member briefing" : "9月会员月报"}</Badge>
            <Badge variant="outline">{en ? "Partial cross-horizon alignment" : "跨周期部分共振"}</Badge>
          </div>
          <Text variant="caption" color="tertiary">{en ? "Forward record · Aug 26" : "前瞻记录 · 8月26日"}</Text>
        </div>

        <Heading id="september-rotation-title" as="h2" size="h2" className="mt-5 max-w-5xl">
          {en ? report.titleEn : report.titleZh}
        </Heading>
        <Text variant="body" color="secondary" className="mt-3 block max-w-5xl leading-7">
          {en ? report.conclusionEn : report.conclusionZh}
        </Text>

        <div className="mt-5 rounded-xl border border-primary/25 bg-primary/[0.06] p-4" data-monthly-action-summary>
          <div className="text-sm font-semibold text-primary">{en ? "Trading plan first" : "做单建议｜先看这里"}</div>
          <ol className="mt-3 grid gap-3 text-sm leading-6 text-foreground-secondary lg:grid-cols-3">
            {(en ? report.executionEn : report.executionZh).map((item, index) => (
              <li key={item} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-semibold text-primary">{index + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {report.assets.map((asset) => (
            <div key={asset.symbol} className={`rounded-xl border p-4 ${assetTone(asset.tone)}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs opacity-70">{asset.symbol}</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{en ? asset.nameEn : asset.nameZh}</div>
                </div>
                <div className="rounded-full border border-current/25 px-2.5 py-1 text-xs font-semibold">
                  {en ? asset.directionEn : asset.directionZh}
                </div>
              </div>
              <div className="mt-4 text-xs opacity-75">{en ? asset.windowEn : asset.windowZh}</div>
              <p className="mt-1 text-sm leading-6 text-foreground-secondary">{en ? asset.conclusionEn : asset.conclusionZh}</p>
              <details className="mt-3 border-t border-white/10 pt-2 text-xs leading-5 text-foreground-tertiary">
                <summary className="min-h-8 cursor-pointer py-1 font-semibold text-foreground-secondary">{en ? "Confirmation / invalidation" : "展开确认与失效条件"}</summary>
                <div className="mt-1 space-y-2">
                  <p><span className="font-semibold text-foreground-secondary">{en ? "Confirm: " : "确认："}</span>{en ? asset.confirmationEn : asset.confirmationZh}</p>
                  <p><span className="font-semibold text-foreground-secondary">{en ? "Invalidate: " : "失效："}</span>{en ? asset.invalidationEn : asset.invalidationZh}</p>
                </div>
              </details>
            </div>
          ))}
        </div>
      </Card>

      <Card padding="lg" className="space-y-4">
        <div>
          <Heading as="h3" size="h3">{en ? "Four-phase rotation map" : "四阶段轮动表"}</Heading>
          <Text variant="body-sm" color="tertiary" className="mt-1 block">
            {en ? "Read horizontally by time and vertically by asset. This is relative strength, not guaranteed inverse correlation." : "横向看时间，纵向看资产；展示的是相对强弱，不代表每天严格反向。"}
          </Text>
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-[920px] w-full text-left text-sm">
            <thead className="bg-white/[0.04] text-xs text-foreground-tertiary">
              <tr>
                <th className="px-4 py-3 font-medium">{en ? "Window" : "时间窗"}</th>
                <th className="px-4 py-3 font-medium">SOXL · {en ? "Semis" : "半导体"}</th>
                <th className="px-4 py-3 font-medium">BTC · {en ? "Bitcoin" : "比特币"}</th>
                <th className="px-4 py-3 font-medium">ETH · {en ? "Ether" : "以太坊"}</th>
                <th className="px-4 py-3 font-medium">GOLD · {en ? "Gold" : "黄金"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {report.phases.map((phase) => {
                const soxl = en ? phase.soxlEn : phase.soxlZh;
                const btc = en ? phase.btcEn : phase.btcZh;
                const eth = en ? phase.ethEn : phase.ethZh;
                const gold = en ? phase.goldEn : phase.goldZh;
                return (
                  <tr key={phase.periodZh} className="bg-background/20">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-foreground">{en ? phase.periodEn : phase.periodZh}</td>
                    <td className={`px-4 py-3 ${cellTone(soxl)}`}>{soxl}</td>
                    <td className={`px-4 py-3 ${cellTone(btc)}`}>{btc}</td>
                    <td className={`px-4 py-3 ${cellTone(eth)}`}>{eth}</td>
                    <td className={`px-4 py-3 ${cellTone(gold)}`}>{gold}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card padding="md">
        <details>
          <summary className="min-h-9 cursor-pointer py-1 text-sm font-semibold text-foreground-secondary">
            {en ? "Why this is only partial resonance" : "展开：共振依据与边界"}
          </summary>
          <div className="mt-3 grid gap-3 border-t border-white/10 pt-3 lg:grid-cols-2">
            <Text variant="body-sm" color="secondary" className="block leading-6">{en ? report.resonanceEn : report.resonanceZh}</Text>
            <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.05] p-3 text-sm leading-6 text-amber-100/90">
              {en ? report.inferenceEn : report.inferenceZh}
            </div>
          </div>
        </details>
      </Card>
    </section>
  );
}

