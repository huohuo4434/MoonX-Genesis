// MOOX_MEMBER_DAILY_TERMINAL_V720114
import type { Metadata } from "next";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { PublicFeaturePreview } from "@/components/access/PublicFeaturePreview";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { PlainLanguageSummary } from "@/components/education/PlainLanguageSummary";
import { ConclusionFirstPanel, type ConclusionFirstFact, type ConclusionFirstTone } from "@/components/member/ConclusionFirstPanel";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { loadTodayForecastRows, loadTomorrowForecastRows } from "@/lib/prediction-access-server";
import { displayDirection, isHumanPublishedForecast } from "@/lib/data/daily-forecasts";
import { dailyAssetOrderIndex } from "@/lib/data/daily-asset-order";
import { formatDateChina, formatDateTimeChina } from "@/lib/utils/datetime";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import type { DailyForecast } from "@/types/daily-forecast";
import { buildDailyResearchReason } from "@/lib/forecasts/daily-display-reason";
import { buildMemberDailyTechnicalViews, type MemberDailyTechnicalView } from "@/lib/forecasts/member-daily-live-levels";
import { getOctober2026FlashCrashRisk } from "@/lib/research/october-2026-flash-crash-risk";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const path = "/member/daily";

async function within<T>(promise: Promise<T>, fallback: T, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } catch (error) {
    console.warn("[member-daily] optional dependency degraded", error);
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: path,
    titleZh: "会员日报 | MOOX Intelligence",
    titleEn: "Member Daily Report | MOOX Intelligence",
    descriptionZh: "五大市场今日与下一交易日方向、关键位、失效条件和简明结论。",
    descriptionEn: "Clear daily and next-session calls, key levels and invalidation across the five core markets.",
  });
}

function qimenDirectionLabel(forecast: DailyForecast): string {
  const evidence = forecast.qimenEvidence ?? "";
  const match = evidence.match(/(?:奇门独立观点|奇门主判)=([^；]+)/u);
  return match?.[1]?.trim() || "待核对";
}

function directionFamily(direction: string): "UP" | "DOWN" | "FLAT" | "PATH_UP" | "PATH_DOWN" | "UNKNOWN" {
  if (/先跌后涨|探底回升/u.test(direction)) return "PATH_UP";
  if (/先涨后跌|冲高回落/u.test(direction)) return "PATH_DOWN";
  if (/上涨|回升/u.test(direction)) return "UP";
  if (/下跌|回落/u.test(direction)) return "DOWN";
  if (/震荡/u.test(direction)) return "FLAT";
  return "UNKNOWN";
}

function relationLabel(forecast: DailyForecast): { label: string; className: string } {
  const relation = forecast.qimenAgreementLabel ?? "";
  if (/共振|同向/u.test(relation)) {
    return { label: "同向 · 信心增强", className: "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-100" };
  }
  if (/分歧|反向/u.test(relation)) {
    return { label: "分歧 · 谨慎", className: "border-amber-400/25 bg-amber-400/[0.08] text-amber-100" };
  }
  const officialFamily = directionFamily(displayDirection(forecast));
  const qimenFamily = directionFamily(qimenDirectionLabel(forecast));
  const comparable = officialFamily !== "UNKNOWN" && qimenFamily !== "UNKNOWN";
  const sameFamily = officialFamily === qimenFamily
    || (officialFamily === "UP" && qimenFamily === "UP")
    || (officialFamily === "DOWN" && qimenFamily === "DOWN");
  if (comparable && sameFamily) {
    return { label: "同向 · 信心增强", className: "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-100" };
  }
  if (comparable) {
    return { label: "分歧 · 谨慎", className: "border-amber-400/25 bg-amber-400/[0.08] text-amber-100" };
  }
  return { label: "暂无共振结论", className: "border-slate-400/20 bg-slate-400/[0.06] text-slate-200" };
}

function tone(direction: string): string {
  if (/上涨|回升/.test(direction)) return "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-100";
  if (/下跌|回落/.test(direction)) return "border-rose-400/25 bg-rose-400/[0.07] text-rose-100";
  return "border-sky-400/20 bg-sky-400/[0.05] text-sky-100";
}

function conclusionTone(direction: string): ConclusionFirstTone {
  const family = directionFamily(direction);
  if (family === "UP" || family === "PATH_UP") return "positive";
  if (family === "DOWN" || family === "PATH_DOWN") return "negative";
  if (family === "FLAT") return "neutral";
  return "muted";
}

function stars(forecast: DailyForecast): string {
  const value = Math.max(1, Math.min(5, forecast.consensusStars ?? Math.round((forecast.consensusScore ?? forecast.confidence ?? 0) / 20)));
  return `${"★".repeat(value)}${"☆".repeat(5 - value)}`;
}

function conciseEvidence(forecast: DailyForecast): string {
  return buildDailyResearchReason(forecast)
    .replaceAll("周卦/阶段卦派生：", "六爻：")
    .replaceAll("奇门独立验算：", "奇门：")
    .replace(/；网站正式观点：[^；]+$/u, "")
    .trim();
}

function ForecastBoard({
  title,
  forecasts,
  technicalViews,
  loadFailed,
  emptyMessage,
}: {
  title: string;
  forecasts: DailyForecast[];
  technicalViews: Record<string, MemberDailyTechnicalView>;
  loadFailed: boolean;
  emptyMessage: string;
}) {
  const rows = forecasts
    .filter(isHumanPublishedForecast)
    .sort((left, right) => dailyAssetOrderIndex(left.assetId) - dailyAssetOrderIndex(right.assetId));

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Heading as="h2" size="h3">{title}</Heading>
          <Text variant="caption" color="tertiary" className="mt-1 block">先看适用日期与走势含义，再核对确认条件、支撑 / 压力和风险边界。</Text>
        </div>
        {rows[0]?.forecastForDate ? <Badge variant="outline">{formatDateChina(rows[0].forecastForDate)}</Badge> : null}
      </div>

      {rows.length ? (
        <>
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {rows.map((forecast) => {
              const direction = displayDirection(forecast);
              return (
                <a key={forecast.id} href={`#daily-${forecast.id}`} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${tone(direction)}`}>
                  {forecast.symbol} · {direction}
                </a>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {rows.map((forecast) => {
              const direction = displayDirection(forecast);
              const relation = relationLabel(forecast);
              const technical = technicalViews[forecast.id] ?? { support: "—", resistance: "—", invalidation: "—", source: "UNAVAILABLE" as const };
              return (
                <article id={`daily-${forecast.id}`} key={forecast.id} className="scroll-mt-24 rounded-2xl border border-border/[0.1] bg-card/55 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><div className="font-semibold">{forecast.assetName}</div><div className="mt-1 font-mono text-xs text-foreground-tertiary">{forecast.symbol}</div></div>
                    <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${tone(direction)}`}>{direction}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs ${relation.className}`}>{relation.label}</span>
                    <span className="font-mono text-xs tracking-[0.12em] text-amber-200">{stars(forecast)}</span>
                    <span className={`rounded-full border px-2.5 py-1 text-xs ${tone(qimenDirectionLabel(forecast))}`}>奇门 {qimenDirectionLabel(forecast)}</span>
                  </div>
                  <div className="mt-4">
                    <PlainLanguageSummary
                      direction={direction}
                      period={`${forecast.forecastForDate} · ${forecast.targetSessionLabel || forecast.tradingSessionLabel}`}
                      confirmation={forecast.confirmation}
                      invalidation={forecast.invalidation}
                    />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl bg-black/15 p-3"><dt className="text-xs text-foreground-tertiary">支撑</dt><dd className="mt-1 font-medium">{technical.support}</dd></div>
                    <div className="rounded-xl bg-black/15 p-3"><dt className="text-xs text-foreground-tertiary">压力</dt><dd className="mt-1 font-medium">{technical.resistance}</dd></div>
                    <div className="col-span-2 rounded-xl bg-black/15 p-3"><dt className="text-xs text-foreground-tertiary">技术位置风险参考（不等于成交止损）</dt><dd className="mt-1 text-foreground-secondary">{technical.invalidation}</dd></div>
                  </dl>
                  <p className="mt-2 text-xs leading-5 text-foreground-tertiary">支撑是观察承接的位置，压力是观察受阻的位置，都不是碰到就买卖。星级表示方法共识，不代表盈利概率。更新：{formatDateTimeChina(forecast.updatedAt || forecast.publishedAt)}</p>
                  <details className="mt-3 rounded-xl border border-border/[0.08] px-3 py-2 text-sm text-foreground-secondary">
                    <summary className="cursor-pointer text-foreground">查看研判依据</summary>
                    <p className="mt-2 leading-6">{conciseEvidence(forecast) || "详细依据整理中。"}</p>
                  </details>
                </article>
              );
            })}
          </div>

        </>
      ) : (
        <Card padding="lg" className={loadFailed ? "border border-rose-400/20 bg-rose-400/[0.04]" : "border border-border/[0.08]"}>
          <Text variant="body-sm" weight="semibold">{loadFailed ? "数据读取暂时异常" : emptyMessage}</Text>
          <Text variant="caption" color="tertiary" className="mt-2 block">{loadFailed ? "系统没有把读取异常当成零条预测，请稍后刷新；已锁定历史内容不会被改写。" : "该状态不影响已经发布的其他周期内容。"}</Text>
        </Card>
      )}
    </section>
  );
}

function StatusCard({ label, value, note, toneClass }: { label: string; value: string; note: string; toneClass: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-xs text-foreground-tertiary">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
      <div className="mt-1 text-xs text-foreground-tertiary">{note}</div>
    </div>
  );
}

export default async function MemberDailyPage() {
  noStore();
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED" || gate.status === "MEMBERSHIP_REQUIRED") {
    const en = (await getRequestLocale()) === "en";
    return <main><Section spacing="lg"><PublicFeaturePreview
      eyebrow={en ? "Daily terminal · Public preview" : "每日市场终端 · 公开预览"}
      title={en ? "See the call, levels and invalidation on one screen" : "先看方向，再看位置与失效"}
      description={en ? "Read five core markets through their outlook, forecast period, confirmation and risk conditions for today and the next session." : "五大核心市场逐项看清：今日与下一交易日的走势、适用周期、确认条件和风险边界。"}
      solves={en ? ["Separate direction from timing", "Avoid stale or overly narrow levels", "Know exactly when a view is invalid"] : ["方向与时机分开看", "避免过期或过窄点位", "明确什么情况判定失效"]}
      memberBenefits={en ? ["Five-market today/next-session board", "Liu Yao and Qimen agreement alerts", "4H support, resistance and invalidation", "Versioned update timestamps"] : ["五大市场今日/下一交易日总览", "六爻与奇门同向/分歧提示", "4H支撑、压力与失效位", "每条观点独立更新时间"]}
      exampleTitle={en ? "BTC · Daily row example" : "BTC · 日报行示例"}
      exampleLines={en ? ["Official direction: rally then fade", "Methods: diverging · use caution", "4H support / resistance", "Invalidation: shown explicitly"] : ["正式方向：先涨后跌", "双法关系：分歧，降低信心", "4H支撑 / 压力", "失效条件：单独列明"]}
      nextPath={path}
      locale={en ? "en" : "zh"}
    /></Section></main>;
  }
  if (gate.status === "DEVICE_REQUIRED") return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;

  const now = new Date();
  // The member gate above already proves authorization. Load the two source-locked
  // batches once, in parallel, without repeating authentication or turning a slow
  // critical read into a false "0 published" result.
  const [todayResult, tomorrowResult] = await Promise.allSettled([
    loadTodayForecastRows(now),
    loadTomorrowForecastRows(now),
  ]);
  const todayLoadFailed = todayResult.status === "rejected";
  const tomorrowLoadFailed = tomorrowResult.status === "rejected";
  if (todayLoadFailed) console.error("[member-daily] today batch failed", todayResult.reason);
  if (tomorrowLoadFailed) console.error("[member-daily] tomorrow batch failed", tomorrowResult.reason);

  const todayRows = todayResult.status === "fulfilled" ? todayResult.value : [];
  const tomorrowRows = tomorrowResult.status === "fulfilled" ? tomorrowResult.value : [];
  const allRows = [...todayRows, ...tomorrowRows];
  const technicalViews = await within(buildMemberDailyTechnicalViews(allRows), {}, 1_200);
  const octoberFlashCrashRisk = getOctober2026FlashCrashRisk(now);
  const latest = allRows
    .map((row) => row.updatedAt || row.publishedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  const todayPublished = todayRows.filter(isHumanPublishedForecast).sort((left, right) => dailyAssetOrderIndex(left.assetId) - dailyAssetOrderIndex(right.assetId));
  const todayFacts: ConclusionFirstFact[] = todayPublished.map((forecast) => {
    const direction = displayDirection(forecast);
    return { label: forecast.symbol, value: direction, tone: conclusionTone(direction) };
  });

  return (
    <>
      <MemberDeviceHeartbeat />
      <main className="min-h-screen bg-[#07080b]">
        <Section spacing="lg">
          <div className="mx-auto w-full max-w-[1240px] space-y-8">
            <header className="rounded-3xl border border-violet-300/15 bg-[radial-gradient(circle_at_90%_0%,rgba(124,92,255,.16),transparent_32%),linear-gradient(145deg,#0f1220,#090a0e)] p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Badge variant="default">MOOX DAILY TERMINAL</Badge>
                  <Heading as="h1" size="h2" className="mt-4">每日市场终端</Heading>
                  <Text variant="body-sm" color="secondary" className="mt-2 block">每个市场一张卡：这段时间怎么看、现在等什么、什么情况停止跟随。</Text>
                </div>
                <div className="text-right text-xs text-foreground-tertiary">北京时间<br />{formatDateTimeChina(now.toISOString())}</div>
              </div>
              <ConclusionFirstPanel
                className="mt-5"
                title={todayPublished.length ? "今日最终结论" : "今日结论等待发布"}
                conclusion={todayPublished.length ? `今日已发布${todayPublished.length}个市场。先看下面的正式方向；同向共振只提高信心，分歧则降低信心，不让技术面反向改写方向。` : "当前没有可展示的正式今日结论；系统会继续重试，不用旧内容冒充今天。"}
                facts={todayFacts}
                actions={["先对日期：日报看当天交易时段，周报看一周，月报看整月；不能把月度看涨当成今天必涨。", "再对条件：先跌后涨不等于已经见底；先涨后跌不等于现在就做空。", "最后对风险：确认条件缺失或失效条件触发时先不跟随；已有订单仍按自己的止损和期限执行。"]}
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <StatusCard label="今日预测" value={todayLoadFailed ? "读取异常" : todayRows.length ? `已发布 ${todayRows.length} 条` : "等待发布"} note={todayRows[0]?.forecastForDate ? formatDateChina(todayRows[0].forecastForDate) : "系统会自动重试"} toneClass={todayLoadFailed ? "border-rose-400/20 bg-rose-400/[0.05]" : todayRows.length ? "border-emerald-400/20 bg-emerald-400/[0.05]" : "border-amber-400/20 bg-amber-400/[0.05]"} />
                <StatusCard label="下一交易日" value={tomorrowLoadFailed ? "读取异常" : tomorrowRows.length ? `已发布 ${tomorrowRows.length} 条` : "尚未发布"} note={tomorrowRows[0]?.forecastForDate ? formatDateChina(tomorrowRows[0].forecastForDate) : "不会覆盖今日内容"} toneClass={tomorrowLoadFailed ? "border-rose-400/20 bg-rose-400/[0.05]" : tomorrowRows.length ? "border-sky-400/20 bg-sky-400/[0.05]" : "border-border/[0.1] bg-white/[0.025]"} />
                <StatusCard label="最近更新" value={latest ? formatDateTimeChina(latest) : "暂无时间"} note="每条预测保留独立版本" toneClass="border-violet-400/20 bg-violet-400/[0.05]" />
              </div>
            </header>

            <Card padding="md" className="border border-amber-300/20 bg-amber-300/[0.04]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Text variant="body-sm" weight="semibold" className="text-amber-100">中期风险提醒 · {octoberFlashCrashRisk.stateLabelZh}</Text>
                <Badge variant="outline">{octoberFlashCrashRisk.windowLabelZh}</Badge>
              </div>
              <Text variant="caption" color="secondary" className="mt-2 block">{octoberFlashCrashRisk.summaryZh} 该提醒只影响仓位与追涨纪律，不改变已锁定方向。</Text>
            </Card>

            <ForecastBoard title="今日市场" forecasts={todayRows} technicalViews={technicalViews} loadFailed={todayLoadFailed} emptyMessage="今日预测尚未发布" />
            <ForecastBoard title="下一交易日" forecasts={tomorrowRows} technicalViews={technicalViews} loadFailed={tomorrowLoadFailed} emptyMessage="下一交易日观点尚未发布" />

            <div className="flex flex-wrap gap-3">
              <Link href="/member/weekly" className="rounded-full border border-primary/25 px-4 py-2 text-body-sm text-primary">周走势</Link>
              <Link href="/member/monthly" className="rounded-full border border-border/20 px-4 py-2 text-body-sm text-foreground-secondary">月走势</Link>
              <Link href="/verification" className="rounded-full border border-border/20 px-4 py-2 text-body-sm text-foreground-secondary">历史验证</Link>
            </div>
          </div>
        </Section>
      </main>
    </>
  );
}
