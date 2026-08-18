// MOOX_V72051_MEMBER_DAILY_CLEAN
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
import { buildDailyInvalidation, buildDailyResearchReason, cleanDailyLevel } from "@/lib/forecasts/daily-display-reason";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const path = "/member/daily";

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

function tone(direction: string): string {
  if (/上涨|回升/.test(direction)) return "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-100";
  if (/下跌|回落/.test(direction)) return "border-rose-400/25 bg-rose-400/[0.07] text-rose-100";
  return "border-sky-400/20 bg-sky-400/[0.05] text-sky-100";
}

function ForecastTable({ title, forecasts }: { title: string; forecasts: DailyForecast[] }) {
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
          <table className="min-w-[900px] w-full border-separate border-spacing-y-2 text-left">
            <thead className="text-caption text-foreground-tertiary">
              <tr><th className="px-3 py-2">市场</th><th className="px-3 py-2">方向</th><th className="px-3 py-2">研判依据</th><th className="px-3 py-2">支撑</th><th className="px-3 py-2">压力</th><th className="px-3 py-2">失效条件</th><th className="px-3 py-2">更新</th></tr>
            </thead>
            <tbody>
              {rows.map((forecast) => {
                const direction = displayDirection(forecast);
                return (
                  <tr key={forecast.id} className="bg-background/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,.05)]">
                    <td className="rounded-l-xl px-3 py-3"><div className="font-semibold">{forecast.assetName}</div><div className="mt-1 font-mono text-caption text-foreground-tertiary">{forecast.symbol}</div></td>
                    <td className="px-3 py-3"><span className={`inline-flex rounded-full border px-3 py-1 text-body-sm font-semibold ${tone(direction)}`}>{direction}</span>{qimenAgreementLabel(forecast) ? <div className="mt-1 text-caption text-foreground-tertiary">{qimenAgreementLabel(forecast)}</div> : null}</td>
                    <td className="max-w-[330px] px-3 py-3 text-body-sm text-foreground-secondary">{buildDailyResearchReason(forecast)}</td>
                    <td className="px-3 py-3 text-body-sm">{cleanDailyLevel(forecast.supportLevels?.[0])}</td>
                    <td className="px-3 py-3 text-body-sm">{cleanDailyLevel(forecast.resistanceLevels?.[0])}</td>
                    <td className="px-3 py-3 text-body-sm text-foreground-secondary">{buildDailyInvalidation(forecast)}</td>
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
    getTodayForecastAccessPayload(now),
    getTomorrowSectionPayload(now),
  ]);
  const todayRows = today.allowed ? today.forecasts : [];
  const tomorrowRows = tomorrow.mode === "member" ? tomorrow.forecasts : [];
  const latest = [...todayRows, ...tomorrowRows]
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

            <ForecastTable title="今日市场" forecasts={todayRows} />
            <ForecastTable title="下一交易日" forecasts={tomorrowRows} />

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
