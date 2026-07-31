import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { TomorrowForecastContent } from "@/components/member/MemberTomorrowPage";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";
import { getTomorrowSectionPayload } from "@/lib/data/tomorrow-forecast-access";

export async function HomeTomorrowSection() {
  noStore();
  const now = new Date();
  const section = await getTomorrowSectionPayload(now);

  if (section.mode === "member") {
    return (
      <section id="tomorrow" className="scroll-mt-24">
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
                下一交易日观点
              </Heading>
              <Text variant="body" color="secondary" className="mt-3">
                完整方向、概率、运行路径与关键价位按账户权限展示。
              </Text>
              <div className="mt-4 grid gap-2 text-body-sm sm:grid-cols-2">
                <div>
                  <span className="text-foreground-tertiary">目标日期：</span>
                  <span className="font-medium">各市场按实际交易日显示</span>
                </div>
                <div>
                  <span className="text-foreground-tertiary">当前状态：</span>
                  <span className="font-medium">
                    {section.publishedBatchExists ? "观点已更新" : "观点准备中"}
                  </span>
                </div>
                {section.lastUpdatedLabel && section.lastUpdatedLabel !== "—" ? (
                  <div className="sm:col-span-2 text-foreground-secondary">
                    最后更新：{section.lastUpdatedLabel}
                  </div>
                ) : null}
              </div>
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
