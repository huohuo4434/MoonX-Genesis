import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { TomorrowReleaseWatcher } from "@/components/home/TomorrowReleaseWatcher";
import { TomorrowForecastContent } from "@/components/member/MemberTomorrowPage";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";
import { getBeijingTodayKey, getBeijingTomorrowKey } from "@/lib/calendar/beijing-date";
import {
  FORMAL_PUBLISH_LABEL,
  plannedPublishAtIso,
  tomorrowPublishState,
} from "@/lib/calendar/publish-windows";
import { getTomorrowSectionPayload } from "@/lib/data/tomorrow-forecast-access";
import { formatDateChina, formatDateTimeChina } from "@/lib/utils/datetime";

export async function HomeTomorrowSection() {
  noStore();
  const now = new Date();
  const section = await getTomorrowSectionPayload(now);
  const publishAt = plannedPublishAtIso(getBeijingTodayKey(now));
  const publishedBatchExists = section.mode === "member" || section.publishedBatchExists;
  const state = tomorrowPublishState(publishedBatchExists, now);

  if (section.mode === "member") {
    return (
      <section id="tomorrow" className="scroll-mt-24">
        <TomorrowReleaseWatcher plannedPublishAt={publishAt} published />
        <TomorrowForecastContent forecasts={section.forecasts} embedded />
      </section>
    );
  }

  return (
    <section id="tomorrow" className="scroll-mt-24 py-20 lg:py-28">
      <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
        <Card padding="lg" className="overflow-hidden border-primary/20 bg-primary/[0.03]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="default">会员专享</Badge>
                <Badge variant="outline">明日观点</Badge>
              </div>
              <Heading as="h2" size="h3">
                下一交易日预测 · {FORMAL_PUBLISH_LABEL}准时发布
              </Heading>
              <Text variant="body" color="secondary" className="mt-3">
                六爻负责方向、节奏和时间窗口；支撑压力由裸K结构、EMA60与MACD技术结构锁定。未正式发布前不展示空白失效位或占位预测。
              </Text>
              <div className="mt-4 grid gap-2 text-body-sm sm:grid-cols-2">
                <div>
                  <span className="text-foreground-tertiary">BTC目标日期：</span>
                  <span className="font-medium">{formatDateChina(getBeijingTomorrowKey(now))}</span>
                </div>
                <div>
                  <span className="text-foreground-tertiary">计划发布时间：</span>
                  <span className="font-medium">{formatDateTimeChina(publishAt)}</span>
                </div>
                <div className="sm:col-span-2 text-primary">
                  <TomorrowReleaseWatcher plannedPublishAt={publishAt} published={state === "published"} />
                </div>
              </div>
              {state === "published" ? (
                <Text variant="body-sm" className="mt-3 text-emerald-500">
                  明日观点已正式发布。有效会员登录后可直接查看完整方向、路径与技术区间。
                </Text>
              ) : state === "delayed" ? (
                <Text variant="body-sm" className="mt-3 text-amber-500">
                  正在同步正式批次，页面会自动刷新；系统不会回退显示旧日期预测。
                </Text>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button asChild>
                <Link href="/pricing">查看会员价格</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/account">我的账户</Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
