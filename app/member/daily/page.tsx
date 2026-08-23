// MOOX_V72065_MEMBER_DAILY_LIVE_LEVELS
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { getTodayForecastAccessPayload } from "@/lib/prediction-access-server";
import { getTomorrowSectionPayload } from "@/lib/data/tomorrow-forecast-access";
import { displayDirection, isHumanPublishedForecast } from "@/lib/data/daily-forecasts";
import { dailyAssetOrderIndex } from "@/lib/data/daily-asset-order";
import { formatDateChina, formatDateTimeChina } from "@/lib/utils/datetime";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import type { DailyForecast } from "@/types/daily-forecast";
import { buildDailyResearchReason } from "@/lib/forecasts/daily-display-reason";
import { buildMemberDailyTechnicalViews, type MemberDailyTechnicalView } from "@/lib/forecasts/member-daily-live-levels";
import { getOctober2026AssetRisk, getOctober2026FlashCrashRisk } from "@/lib/research/october-2026-flash-crash-risk";

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
    console.warn("[member-daily] dependency degraded", error);
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
    descriptionZh: "九大市场今日与下一交易日方向、关键位、失效条件和简明结论。",
    descriptionEn: "Clear daily and next-session calls, key levels and invalidation across the nine core markets.",
  });
}

function qimenAgreementLabel(forecast: DailyForecast): string | undefined {
  return (forecast as DailyForecast & { qimenAgreementLabel?: string }).qimenAgreementLabel;
}

function qimenDirectionLabel(forecast: DailyForecast): string {
  const evidence = forecast.qimenEvidence ?? "";
  const match = evidence.match(/(?:奇门独立观点|奇门主判)=([^；]+)/u);
  return match?.[1]?.trim() || "待验算";
}

function tone(direction: string): string {
  if (/上涨|回升/.test(direction)) return "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-100";
  if (/下跌|回落/.test(direction)) return "border-rose-400/25 bg-rose-400/[0.07] text-rose-100";
  return "border-sky-400/20 bg-sky-400/[0.05] text-sky-100";
}

function ForecastTable({
  title,
  forecasts,
  technicalViews,
  riskAsOf,
}: {
  title: string;
  forecasts: DailyForecast[];
  technicalViews: Record<string, MemberDailyTechnicalView>;
  riskAsOf: Date;
}) {
  const rows = forecasts
    .filter(isHumanPublishedForecast)
    .sort((left, right) => dailyAssetOrderIndex(left.assetId) - dailyAssetOrderIndex(right.assetId));
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Heading as="h2" size="h3">{title}</Heading>
          
        </div>
        {rows[0]?.forecastForDate ? <Badge variant="outline">{formatDateChina(rows[0].forecastForDate)}</Badge> : null}
      </div>
      {rows.length ? (
        <div className="overflow-x-auto rounded-2xl border border-border/[0.08] bg-card/45 p-2">
          <table className="min-w-[1120px] w-full border-separate border-spacing-y-2 text-left">
            <thead className="text-caption text-foreground-tertiary">
              <tr><th className="px-3 py-2">市场</th><th className="px-3 py-2">周卦/阶段卦派生</th><th className="px-3 py-2">奇门独立验算</th><th className="px-3 py-2">两法关系</th><th className="px-3 py-2">10月风险</th><th className="px-3 py-2">研判依据</th><th className="px-3 py-2">支撑</th><th className="px-3 py-2">压力</th><th className="px-3 py-2">失效位</th><th className="px-3 py-2">更新</th></tr>
            </thead>
            <tbody>
              {rows.map((forecast) => {
                const direction = displayDirection(forecast);
                const technical = technicalViews[forecast.id] ?? { support: "—", resistance: "—", invalidation: "—", source: "UNAVAILABLE" as const };
                const octoberRisk = getOctober2026AssetRisk(forecast.symbol, riskAsOf);
                return (
                  <tr key={forecast.id} className="bg-background/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,.05)]">
                    <td className="rounded-l-xl px-3 py-3"><div className="font-semibold">{forecast.assetName}</div><div className="mt-1 font-mono text-caption text-foreground-tertiary">{forecast.symbol}</div></td>
                    <td className="px-3 py-3"><span className={`inline-flex rounded-full border px-3 py-1 text-body-sm font-semibold ${tone(direction)}`}>{direction}</span><div className="mt-1 text-[11px] text-foreground-tertiary">网站正式观点；不是另起日卦</div></td>
                    <td className="px-3 py-3"><span className={`inline-flex rounded-full border px-3 py-1 text-body-sm font-semibold ${tone(qimenDirectionLabel(forecast))}`}>{qimenDirectionLabel(forecast)}</span></td>
                    <td className="px-3 py-3 text-body-sm text-foreground-secondary">{qimenAgreementLabel(forecast) || "等待双法核对"}</td>
                    <td className="max-w-[170px] px-3 py-3"><div className="text-body-sm font-semibold text-amber-100">{octoberRisk.stateLabelZh}</div><div className="mt-1 text-caption text-foreground-tertiary">{octoberRisk.sensitivityLabelZh}</div></td>
                    <td className="max-w-[330px] px-3 py-3 text-body-sm text-foreground-secondary">{buildDailyResearchReason(forecast)}</td>
                    <td className="px-3 py-3 text-body-sm font-medium">{technical.support}</td>
                    <td className="px-3 py-3 text-body-sm font-medium">{technical.resistance}</td>
                    <td className="px-3 py-3 text-body-sm text-foreground-secondary">{technical.invalidation}</td>
                    <td className="rounded-r-xl px-3 py-3 text-caption text-foreground-tertiary">{formatDateTimeChina(forecast.updatedAt || forecast.publishedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <Card padding="lg"><Text variant="body-sm" color="secondary">本时段尚无已发布预测。</Text></Card>}
    </section>
  );
}

export default async function MemberDailyPage() {
  noStore();
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED") redirect(`/login?next=${path}`);
  if (gate.status === "MEMBERSHIP_REQUIRED") redirect("/pricing");
  if (gate.status === "DEVICE_REQUIRED") return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;

  const now = new Date();
  const [today, tomorrow] = await Promise.all([
    within(getTodayForecastAccessPayload(now), null, 2_600),
    within(getTomorrowSectionPayload(now), null, 2_600),
  ]);
  const todayRows = today?.allowed ? today.forecasts : [];
  const tomorrowRows = tomorrow?.mode === "member" ? tomorrow.forecasts : [];
  const allRows = [...todayRows, ...tomorrowRows];
  const technicalViews = await within(buildMemberDailyTechnicalViews(allRows), {}, 1_200);
  const octoberFlashCrashRisk = getOctober2026FlashCrashRisk(now);
  const latest = allRows
    .map((row) => row.updatedAt || row.publishedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  return (
    <>
      <MemberDeviceHeartbeat />
      <main>
        <Section spacing="lg">
          <div className="mx-auto w-full max-w-[1240px] space-y-9">
            <header className="rounded-3xl border border-violet-300/15 bg-[radial-gradient(circle_at_90%_0%,rgba(124,92,255,.16),transparent_32%),linear-gradient(145deg,#0f1220,#090a0e)] p-6 sm:p-8">
              <Badge variant="default">会员日报</Badge>
              <Heading as="h1" size="h2" className="mt-4">今日与下一交易日</Heading>
              <div className="mt-4 flex flex-wrap gap-4 text-caption text-foreground-tertiary">
                <span>今日已发布：{todayRows.length}</span><span>下一交易日已发布：{tomorrowRows.length}</span><span>最近更新：{latest ? formatDateTimeChina(latest) : "—"}</span>
              </div>
            </header>

            <Card padding="md" className="border border-amber-300/20 bg-amber-300/[0.04]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Text variant="body-sm" weight="semibold" className="text-amber-100">10月闪崩风险先验 · {octoberFlashCrashRisk.stateLabelZh}</Text>
                  <Text variant="caption" color="secondary" className="mt-1 block">{octoberFlashCrashRisk.summaryZh}</Text>
                </div>
                <Badge variant="outline">{octoberFlashCrashRisk.windowLabelZh}</Badge>
              </div>
              <Text variant="caption" color="tertiary" className="mt-2 block">该风险先验只影响仓位、杠杆与追涨纪律，不反向修改由当前周卦/阶段卦派生并锁定的网站正式方向；9大市场仍按各自结构独立判断。</Text>
            </Card>

            <ForecastTable title="今日市场" forecasts={todayRows} technicalViews={technicalViews} riskAsOf={now} />
            <ForecastTable title="下一交易日" forecasts={tomorrowRows} technicalViews={technicalViews} riskAsOf={now} />

            <Card padding="md" className="border border-violet-300/15 bg-violet-300/[0.035]">
              <Text variant="body-sm" weight="semibold">日度观点来源说明</Text>
              <Text variant="caption" color="secondary" className="mt-2 block">网站不要求、也不会伪造独立日卦。老师原卦优先；没有老师细分时，使用按老师方法复核的用户周卦/阶段卦，再结合周内路径、目标日干支和市场日历拆分成日度观点。六爻与奇门分别独立预测：同向提高信心，分歧时两种观点原样列出并降低信心。</Text>
            </Card>

            <div className="flex flex-wrap gap-3">
              <Link href="/member/weekly" className="rounded-full border border-primary/25 px-4 py-2 text-body-sm text-primary">查看周走势预测</Link>
              <Link href="/verification" className="rounded-full border border-border/20 px-4 py-2 text-body-sm text-foreground-secondary">查看历史验证</Link>
            </div>
          </div>
        </Section>
      </main>
    </>
  );
}
