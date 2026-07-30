import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { SectionHeader } from "@/components/home/SectionHeader";
import { Button, Card, Text } from "@/components/ui";
import { getPublicAccuracyHistory } from "@/lib/accuracy/get-public-history";
import { formatBeijingDateZh } from "@/lib/calendar/beijing-date";

/** Homepage module 3: at most 3 past verified public records. */
export async function HomeRecentVerification() {
  noStore();
  const { items } = await getPublicAccuracyHistory();
  const recent = items.slice(0, 3);

  return (
    <section className="border-t border-border/[0.06] py-8 lg:py-10">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="验证"
          title="最近验证"
          subtitle="仅展示已完成验证的历史记录。"
        />
        {recent.length === 0 ? (
          <Card padding="md" className="mt-4">
            <Text variant="body-sm" color="secondary">
              暂无已完成验证的历史记录。
            </Text>
          </Card>
        ) : (
          <div className="mt-4 grid gap-3">
            {recent.map((item) => (
              <Card key={item.forecastId} padding="md" className="border-border/[0.08]">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Text variant="body-sm" weight="semibold">
                      {item.assetName}
                    </Text>
                    <Text variant="caption" color="tertiary" className="mt-1 block">
                      预测日期 {formatBeijingDateZh(item.forecastDate)}
                    </Text>
                    <Text variant="caption" color="secondary" className="mt-1 block">
                      预测 {item.predictedDirection} · 实际 {item.actualDirection}
                    </Text>
                  </div>
                  <Text variant="body-sm" weight="semibold">
                    {item.verdictLabel}
                  </Text>
                </div>
              </Card>
            ))}
          </div>
        )}
        <div className="mt-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/verification">查看全部历史验证</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
