"use client";

import { Badge, Card, Heading, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { BilingualText, WeeklyAlphaBar, WeeklyAlphaEntry, WeeklyAlphaIssue } from "@/types/weekly-alpha";
import type { PublicProjection } from "@/lib/presentation/public-attribution";

type PublicWeeklyAlphaEntry = PublicProjection<WeeklyAlphaEntry>;
type PublicWeeklyAlphaIssue = PublicProjection<WeeklyAlphaIssue>;

function t(value: BilingualText, en: boolean) {
  return en ? value.en : value.zh;
}

function levelForLocale(value: string, en: boolean): string {
  if (!en) return value;
  return value
    .replaceAll("点", " pts")
    .replace("（突破后回踩确认带）", " (post-breakout pullback confirmation zone)")
    .replace("（解锁后已观察承接区）", " (observed post-unlock demand zone)")
    .replace("（外部技术下一关键测试）", " (next external technical test)");
}


function hexagramForLocale(value: string, en: boolean): string {
  if (!en) return value;
  const map: Record<string, string> = {
    "天风姤": "Gou",
    "乾为天（六冲）": "Qian (Six Clash)",
    "离为火（六冲）": "Li (Six Clash)",
    "雷山小过（游魂）": "Xiao Guo (Wandering Soul)",
    "地风升": "Sheng",
    "地天泰（六合）": "Tai (Six Harmony)",
    "泽天夬": "Guai",
    "泽雷随（归魂）": "Sui (Returning Soul)",
    "天水讼（游魂）": "Song (Wandering Soul)",
    "火地晋（游魂）": "Jin (Wandering Soul)",
  };
  return map[value] ?? "Archived Liu Yao structure";
}

function ganzhiForLocale(value: string, en: boolean): string {
  if (!en) return value;
  const map: Record<string, string> = {
    "丙辰日": "Bing-Chen day",
    "丁巳日": "Ding-Si day",
    "戊午日": "Wu-Wu day",
    "己未日": "Ji-Wei day",
    "庚申日": "Geng-Shen day",
    "辛酉日": "Xin-You day",
    "壬戌日": "Ren-Xu day",
  };
  return map[value] ?? "Verified sexagenary day";
}

function directionClass(entry: PublicWeeklyAlphaEntry) {
  return entry.direction === "BULLISH"
    ? "border-red-400/25 bg-red-400/[0.04]"
    : "border-emerald-400/25 bg-emerald-400/[0.04]";
}

function CandleChart({ entry, en }: { entry: PublicWeeklyAlphaEntry; en: boolean }) {
  const bars = entry.technical.bars;
  if (entry.technical.status === "UNAVAILABLE") {
    return (
      <div className="rounded-lg border border-dashed border-border/70 p-4">
        <Text variant="body-sm" color="secondary">{t(entry.technical.snapshotLabel, en)}</Text>
        {entry.technical.note ? <Text variant="caption" color="tertiary" className="mt-1 block">{t(entry.technical.note, en)}</Text> : null}
      </div>
    );
  }
  if (!bars.length) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 p-4">
        <Text variant="body-sm" color="secondary">{t(entry.technical.snapshotLabel, en)}</Text>
        {entry.technical.note ? <Text variant="caption" color="tertiary" className="mt-1 block">{t(entry.technical.note, en)}</Text> : null}
      </div>
    );
  }

  const width = 760;
  const height = 280;
  const left = 18;
  const right = 74;
  const top = 18;
  const bottom = 34;
  const drawableW = width - left - right;
  const drawableH = height - top - bottom;
  const extra = [entry.technical.supportNumeric, entry.technical.resistanceNumeric].filter((v): v is number => Number.isFinite(v));
  const low = Math.min(...bars.map((bar) => bar.low), ...extra);
  const high = Math.max(...bars.map((bar) => bar.high), ...extra);
  const pad = Math.max((high - low) * 0.08, high * 0.002);
  const yMin = low - pad;
  const yMax = high + pad;
  const y = (value: number) => top + ((yMax - value) / Math.max(1e-9, yMax - yMin)) * drawableH;
  const step = drawableW / Math.max(1, bars.length);
  const candleW = Math.max(3, Math.min(10, step * 0.55));
  const price = (value: number) => entry.slug === "sp500"
    ? value.toLocaleString("en-US", { maximumFractionDigits: 1 })
    : value.toLocaleString("en-US", { maximumFractionDigits: value >= 1000 ? 0 : 2 });
  const pricePrefix = entry.slug === "sp500" ? "" : "$";
  const priceSuffix = entry.slug === "sp500" ? (en ? " pts" : "点") : "";
  const line = (value: number | undefined, color: string, label: string) => {
    if (!Number.isFinite(value)) return null;
    const yy = y(value!);
    return <g key={label}>
      <line x1={left} x2={width - right + 4} y1={yy} y2={yy} stroke={color} strokeWidth="1.2" strokeDasharray="6 5" opacity="0.9" />
      <text x={width - right + 8} y={yy + 4} fill={color} fontSize="11">{label} {pricePrefix}{price(value!)}{priceSuffix}</text>
    </g>;
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60 bg-background/40 p-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[680px] w-full" role="img" aria-label={en ? `${entry.symbol} real daily candlestick chart` : `${entry.symbol}真实日K线`}>
        {[0.25, 0.5, 0.75].map((ratio) => {
          const yy = top + drawableH * ratio;
          return <line key={ratio} x1={left} x2={width - right} y1={yy} y2={yy} stroke="currentColor" opacity="0.08" />;
        })}
        {line(entry.technical.supportNumeric, "#22c55e", "S1")}
        {line(entry.technical.resistanceNumeric, "#ef4444", "R1")}
        {bars.map((bar: WeeklyAlphaBar, index) => {
          const x = left + step * index + step / 2;
          const up = bar.close >= bar.open;
          const color = up ? "#ef4444" : "#22c55e";
          const bodyTop = y(Math.max(bar.open, bar.close));
          const bodyBottom = y(Math.min(bar.open, bar.close));
          const bodyH = Math.max(1.6, bodyBottom - bodyTop);
          return <g key={bar.date}>
            <line x1={x} x2={x} y1={y(bar.high)} y2={y(bar.low)} stroke={color} strokeWidth="1.2" />
            <rect x={x - candleW / 2} y={bodyTop} width={candleW} height={bodyH} fill={up ? color : "transparent"} stroke={color} strokeWidth="1.2" />
            {(index === 0 || index === bars.length - 1 || index % Math.max(1, Math.floor(bars.length / 5)) === 0) ? (
              <text x={x} y={height - 10} textAnchor="middle" fill="currentColor" opacity="0.55" fontSize="9">{bar.date.slice(5)}</text>
            ) : null}
          </g>;
        })}
      </svg>
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-1">
        <Text variant="caption" color="tertiary">{t(entry.technical.snapshotLabel, en)}</Text>
        <Text variant="caption" color="tertiary">{en ? "Red = up · Green = down · No future candles" : "红涨绿跌 · 仅真实历史K线 · 不画假未来K线"}</Text>
      </div>
    </div>
  );
}

function Stars({ count }: { count: number }) {
  return <span className="tracking-[0.12em] text-amber-400" aria-label={`${count} stars`}>{"★".repeat(count)}{"☆".repeat(5 - count)}</span>;
}

function EntryCard({ entry, en }: { entry: PublicWeeklyAlphaEntry; en: boolean }) {
  return (
    <Card padding="lg" className={`overflow-hidden border ${directionClass(entry)}`}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">#{entry.rank}</Badge>
              <Heading as="h3" size="h3">{t(entry.assetName, en)} <span className="font-mono text-body-sm font-normal text-foreground-tertiary">{entry.symbol}</span></Heading>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-body-sm">
              <span className="font-semibold text-red-400">↑ {t(entry.directionLabel, en)}</span>
              <Stars count={entry.stars} />
              <span className="text-foreground-secondary">{t(entry.resonanceLabel, en)}</span>
            </div>
          </div>
          <div className="rounded-lg border border-border/60 px-3 py-2 text-right">
            <div className="text-caption text-foreground-tertiary">{en ? "Primary / changed" : "本卦 / 变卦"}</div>
            <div className="mt-1 text-body-sm font-medium">{hexagramForLocale(entry.primaryHexagram, en)}{entry.changingHexagram ? ` → ${hexagramForLocale(entry.changingHexagram, en)}` : ""}</div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {entry.selectionReason.map((reason, index) => (
            <div key={index} className="rounded-lg border border-border/50 bg-background/50 p-3">
              <div className="text-caption font-semibold text-primary">{en ? `Selection reason ${index + 1}` : `入选理由 ${index + 1}`}</div>
              <div className="mt-1 text-body-sm text-foreground-secondary">{t(reason, en)}</div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/[0.035] p-4">
          <div className="text-caption font-semibold text-primary">{en ? "Weekly path" : "本周路径推演"}</div>
          <div className="mt-2 text-body-sm text-foreground-secondary">{t(entry.expectedPath, en)}</div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-border/60 p-4">
            <div className="text-body-sm font-semibold">{en ? "Yi's integrated interpretation" : "易老师综合解读"}</div>
            <ul className="mt-3 space-y-2 text-body-sm text-foreground-secondary">
              {entry.methodInterpretation.map((item, index) => <li key={index}>• {t(item, en)}</li>)}
            </ul>
          </div>
          <div className="rounded-lg border border-border/60 p-4">
            <div className="text-body-sm font-semibold">{en ? "Verified hexagram facts" : "卦象事实（只写已保留证据）"}</div>
            <ul className="mt-3 space-y-2 text-body-sm text-foreground-secondary">
              {entry.hexagramFacts.map((item, index) => <li key={index}>• {t(item, en)}</li>)}
            </ul>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <div className="text-body-sm font-semibold">{en ? "Real-candle execution layer" : "真实K线执行层"}</div>
              <div className="text-caption text-foreground-tertiary">{en ? "Levels can change execution; they cannot reverse the locked metaphysical direction." : "支撑压力只负责执行，不参与方向判断。"}</div>
            </div>
            <Badge variant="outline">{entry.technical.status === "READY" ? (en ? "Real OHLC" : "真实行情") : entry.technical.status === "STATIC_LOCKED" ? (en ? "Research-locked levels" : "研究锁定位") : (en ? "No fake data" : "不造假数据")}</Badge>
          </div>
          <CandleChart entry={entry} en={en} />
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.025] p-3">
              <div className="text-caption font-semibold text-emerald-400">{en ? "Support" : "支撑"}</div>
              <div className="mt-1 space-y-1 text-body-sm">{entry.technical.support.length ? entry.technical.support.map((level) => <div key={level}>{levelForLocale(level, en)}</div>) : <div>—</div>}</div>
            </div>
            <div className="rounded-lg border border-red-400/20 bg-red-400/[0.025] p-3">
              <div className="text-caption font-semibold text-red-400">{en ? "Resistance" : "压力"}</div>
              <div className="mt-1 space-y-1 text-body-sm">{entry.technical.resistance.length ? entry.technical.resistance.map((level) => <div key={level}>{levelForLocale(level, en)}</div>) : <div>—</div>}</div>
            </div>
          </div>
          <div className="mt-3 grid gap-2 text-body-sm text-foreground-secondary md:grid-cols-2">
            <div><span className="font-semibold text-foreground">{en ? "Confirmation" : "执行确认"}：</span>{t(entry.technical.confirmation, en)}</div>
            <div><span className="font-semibold text-foreground">{en ? "Invalidation" : "执行失效"}：</span>{t(entry.technical.invalidation, en)}</div>
          </div>
        </div>

        <details className="rounded-lg border border-border/60 p-4" open={entry.rank === 1}>
          <summary className="cursor-pointer text-body-sm font-semibold">{en ? "Daily path + verified calendar" : "周内逐日推演 + 已核万年历"}</summary>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {entry.dayPath.map((item) => (
              <div key={item.date} className="rounded-md border border-border/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-body-sm">{item.date}</span>
                  <Badge variant="outline">{ganzhiForLocale(item.ganzhi, en)}</Badge>
                </div>
                <div className="mt-2 text-body-sm font-semibold">{t(item.stage, en)}</div>
                <div className="mt-1 text-caption text-foreground-secondary">{t(item.path, en)}</div>
                <div className="mt-1 text-[11px] text-foreground-tertiary">{en ? "Weekly-structure decomposition, not an independent daily hexagram." : "周卦时序拆分，不冒充独立日卦。"}</div>
              </div>
            ))}
          </div>
        </details>

        <details className="rounded-lg border border-border/60 p-4">
          <summary className="cursor-pointer text-body-sm font-semibold">{en ? "Multi-horizon evidence and risks" : "多周期证据与风险"}</summary>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              {entry.multiCycle.map((item, index) => (
                <div key={index} className="rounded-md border border-border/50 p-3">
                  <div className="flex items-center justify-between gap-2"><span className="font-semibold">{t(item.horizon, en)}</span><Badge variant="default">{t(item.direction, en)}</Badge></div>
                  <div className="mt-1 text-caption text-foreground-secondary">{t(item.note, en)}</div>
                </div>
              ))}
            </div>
            <ul className="space-y-2 text-body-sm text-foreground-secondary">
              {entry.risks.map((risk, index) => <li key={index}>• {t(risk, en)}</li>)}
            </ul>
          </div>
        </details>
      </div>
    </Card>
  );
}

export function WeeklyAlphaFive({ issue }: { issue: PublicWeeklyAlphaIssue }) {
  const { locale } = useLocale();
  const en = locale === "en";
  return (
    <section className="mb-10">
      <div className="mb-5 overflow-hidden rounded-xl border border-amber-400/20 bg-gradient-to-br from-amber-400/[0.06] via-background to-primary/[0.04] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">{en ? "Member weekly report" : "会员核心周报"}</Badge>
              <Badge variant="outline">{issue.weekStart} → {issue.weekEnd}</Badge>
            </div>
            <Heading as="h2" size="h2" className="mt-3">{t(issue.title, en)}</Heading>
            <Text variant="body" color="secondary" className="mt-2 max-w-3xl block">{t(issue.subtitle, en)}</Text>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/60 p-3 text-body-sm">
            <div className="font-semibold text-emerald-400">✓ {en ? "Calendar publication gate passed" : "万年历发布闸门已通过"}</div>
            <div className="mt-1 text-caption text-foreground-tertiary">{t(issue.calendarSource, en)}</div>
            <div className="mt-1 text-caption text-foreground-tertiary">{en ? "Target month: Bing-Shen · Xun Kong: Zi/Chou" : "目标月建：丙申月 · 本周旬空：子丑"}</div>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {issue.entries.map((entry) => (
            <a key={entry.slug} href={`#weekly-alpha-${entry.rank}`} className="rounded-lg border border-border/60 bg-background/55 p-3 transition-colors hover:border-primary/30">
              <div className="flex items-center justify-between gap-2"><Badge variant="outline">#{entry.rank}</Badge><span className="font-mono text-caption text-foreground-tertiary">{entry.symbol}</span></div>
              <div className="mt-2 text-body-sm font-semibold">{t(entry.assetName, en)}</div>
              <div className="mt-1 text-caption text-red-400">↑ {t(entry.directionLabel, en)}</div>
              <div className="mt-1 text-xs"><Stars count={entry.stars} /></div>
            </a>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-border/50 bg-background/45 p-4">
          <div className="text-caption font-semibold text-primary">{en ? "Why these five" : "为什么是这5个"}</div>
          <div className="mt-1 text-body-sm text-foreground-secondary">{t(issue.selectionNote, en)}</div>
        </div>
      </div>

      {issue.riskNotes?.length ? (
        <div className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.035] p-4 sm:p-5">
          <div className="text-body-sm font-semibold text-emerald-300">{en ? "A-share extreme bearish risk notes · not Top 5" : "A股极强看跌风险备注 · 不占Top 5"}</div>
          <div className="mt-1 text-caption text-foreground-tertiary">{en ? "A-shares are not used as short ideas in this product. Bearish consensus is shown only for avoidance / risk reduction." : "A股不按本产品做空；即使看跌共识很强，也只用于回避/减仓提示，不作为可交易Top 5。"}</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {issue.riskNotes.map((item) => <div key={item.slug} className="rounded-lg border border-border/50 bg-background/45 p-3"><div className="flex items-center justify-between gap-2"><span className="font-semibold">{t(item.assetName, en)}</span><span className="font-mono text-caption text-foreground-tertiary">{item.symbol}</span></div><div className="mt-1 text-caption font-medium text-emerald-300">{t(item.label, en)}</div><div className="mt-1 text-caption text-foreground-secondary">{t(item.note, en)}</div></div>)}
          </div>
        </div>
      ) : null}

      <div className="mb-5 grid gap-3 lg:grid-cols-3">
        {issue.methodology.map((item, index) => (
          <div key={index} className="rounded-lg border border-border/60 p-3 text-body-sm text-foreground-secondary">{t(item, en)}</div>
        ))}
      </div>

      <div className="space-y-5">
        {issue.entries.map((entry) => <div id={`weekly-alpha-${entry.rank}`} key={entry.slug} className="scroll-mt-24"><EntryCard entry={entry} en={en} /></div>)}
      </div>
    </section>
  );
}
