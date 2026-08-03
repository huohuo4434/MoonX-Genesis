import Link from "next/link";
import { Button, Card, Text } from "@/components/ui";
import {
  FREE_USER_LABEL,
  MEMBERSHIP_BENEFIT_ROWS,
  PAID_MEMBER_LABEL,
} from "@/lib/presentation/membership-benefits";

export function HomeMembershipComparison() {
  return (
    <section id="member-benefits" className="scroll-mt-24 border-t border-border/[0.06] py-8 lg:py-10">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <Text variant="caption" className="uppercase tracking-[0.18em] text-primary">
            免费与付费有什么区别
          </Text>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            注册先看今日，付费解锁完整决策结构
          </h2>
          <Text variant="body-sm" color="secondary" className="mt-3 block">
            免费注册用户用于了解当日方向与公开验证；付费会员用于提前查看下一交易日、周度、月度、关键价位和完整研究依据。
          </Text>
        </div>

        <Card padding="none" className="mt-5 overflow-hidden border-border/[0.1]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-body-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 font-semibold text-foreground">功能</th>
                  <th className="px-4 py-3 font-semibold text-foreground">{FREE_USER_LABEL}</th>
                  <th className="px-4 py-3 font-semibold text-foreground">{PAID_MEMBER_LABEL}</th>
                </tr>
              </thead>
              <tbody>
                {MEMBERSHIP_BENEFIT_ROWS.map((row) => (
                  <tr key={row.feature} className="border-t border-border/[0.07]">
                    <td className="px-4 py-3 text-foreground">{row.feature}</td>
                    <td className="px-4 py-3 text-foreground-secondary">{row.free}</td>
                    <td className="px-4 py-3 text-foreground-secondary">{row.paid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/login?tab=register&next=%2F%23moonx-view">免费注册查看今日观点</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/pricing">查看会员价格</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
