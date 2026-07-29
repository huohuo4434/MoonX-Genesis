import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { SectionHeader } from "@/components/home/SectionHeader";
import { Badge, Text } from "@/components/ui";
import { sortByDailyAssetOrder } from "@/lib/data/daily-asset-order";
import { getTomorrowSectionPayload } from "@/lib/data/tomorrow-forecast-access";
import { formatDateChina } from "@/lib/utils/datetime";

export async function HomeTomorrowSection() {
  noStore();
  const payload = await getTomorrowSectionPayload();
  const teasers = sortByDailyAssetOrder(payload.summary.teasers.filter((t) => t.isReady));
  const unlocked = payload.mode === "member";
  const published = teasers.length > 0;

  return (
    <section id="tomorrow-preview" className="border-t border-border/[0.06] py-8 lg:py-12">
      <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="会员"
          title="下一交易日完整预测"
          subtitle="会员可提前查看下一交易日：BTC、美股、黄金、原油等怎么走。"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            目标交易日期：{formatDateChina(payload.summary.nextDateIso)}
          </Badge>
          <Badge variant="outline">{unlocked ? "会员已解锁" : "会员锁定"}</Badge>
          <Badge variant="outline">
            {published ? `已生成 ${teasers.length}` : "尚未发布"}
          </Badge>
        </div>

        {!published ? (
          <p className="mt-4 text-body-sm text-foreground-secondary">
            下一交易日预测尚未发布。预测发布后将在此处显示。
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teasers.map((t) => (
              <div
                key={t.id}
                className="flex flex-col gap-2 rounded-lg border border-border/[0.08] bg-card p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <Text variant="body" weight="semibold">
                    {t.assetName}
                  </Text>
                  <Badge variant="outline">已生成</Badge>
                </div>
                <p className="text-caption text-foreground-tertiary">
                  目标交易日期：{formatDateChina(t.forecastForDate)}
                </p>
                <p className="text-caption text-foreground-tertiary">
                  {unlocked
                    ? payload.accessReason === "ADMIN"
                      ? "管理员已解锁"
                      : "会员已解锁"
                    : "会员锁定"}
                </p>
              </div>
            ))}
          </div>
        )}
        <Link
          href="/member/tomorrow"
          className="mt-4 inline-block text-body-sm text-primary underline-offset-4 hover:underline"
        >
          {unlocked ? "查看完整下一交易日观点" : "登录会员查看完整内容"}
        </Link>
      </div>
    </section>
  );
}
