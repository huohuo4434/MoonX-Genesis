import Link from "next/link";
import { Badge, Button, Text } from "@/components/ui";
import { SectionHeader } from "@/components/home/SectionHeader";
import { getHomeMemberStockPayload } from "@/lib/data/member-stocks/access";
import { formatDateTimeChina } from "@/lib/utils/datetime";

export async function HomeMemberStocksSection() {
  const payload = await getHomeMemberStockPayload();
  if (!payload?.visible) return null;

  return (
    <section id="member-stocks" className="border-t border-border/[0.06] py-8 lg:py-12">
      <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="会员"
          title="会员福利股"
          subtitle="MoonX选择少量重点股票持续跟踪。当前首只：长鑫科技。"
        />
        <div className="mt-4 max-w-lg rounded-lg border border-border/[0.08] bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Text variant="body" weight="semibold">
              {payload.name}
            </Text>
            <Badge variant="outline">会员福利股</Badge>
            {payload.mode === "member" && payload.todayDirection ? (
              <Badge variant="outline">{payload.todayDirection}</Badge>
            ) : null}
          </div>
          <Text variant="caption" color="tertiary" className="mt-1 block font-mono">
            股票代码：{payload.symbol}
          </Text>
          {payload.mode === "locked" ? (
            <>
              <Text variant="caption" color="tertiary" className="mt-2 block">
                今日、明日及本周分析持续更新
              </Text>
              <Text variant="caption" color="tertiary" className="mt-1 block">
                会员锁定
              </Text>
            </>
          ) : (
            <>
              {payload.todayHeadline ? (
                <Text variant="body-sm" color="secondary" className="mt-2 block break-words">
                  {payload.todayHeadline}
                </Text>
              ) : null}
              {payload.updatedAt ? (
                <Text variant="caption" color="tertiary" className="mt-1 block">
                  最后更新：{formatDateTimeChina(payload.updatedAt)}
                </Text>
              ) : null}
            </>
          )}
          <Button asChild size="sm" className="mt-3 w-fit">
            <Link href={`/member/stocks/${payload.stockId}`}>
              {payload.mode === "locked" ? "会员查看长鑫分析" : "查看长鑫分析"}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
