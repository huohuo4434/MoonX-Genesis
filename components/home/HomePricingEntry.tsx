import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { SectionHeader } from "@/components/home/SectionHeader";
import { Button, Text } from "@/components/ui";
import { loadFreshPredictionUser } from "@/lib/prediction-access-server";
import { isAdminUser } from "@/lib/auth/is-admin";
import { PAID_MEMBER_BENEFITS } from "@/lib/presentation/membership-benefits";

const BENEFITS = PAID_MEMBER_BENEFITS.slice(0, 6);

/** Homepage module 5: single membership CTA — no wallet / payment UI. Hidden for admins. */
export async function HomePricingEntry() {
  noStore();
  const fresh = await loadFreshPredictionUser();
  if (fresh.accessUser && isAdminUser(fresh.accessUser)) {
    return null;
  }

  return (
    <section className="border-t border-border/[0.06] py-8 lg:py-10">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="会员" title="解锁 MOOX 完整研究" subtitle="提前获取完整判断与证据摘要。" />
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((item) => (
            <li key={item} className="text-body-sm text-foreground-secondary">
              · {item}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-4 text-body-sm text-foreground-secondary">
          <span>月度 50 USDT</span>
          <span>季度 120 USDT</span>
          <span>年度 400 USDT</span>
        </div>
        <div className="mt-5">
          <Button asChild>
            <Link href="/pricing">查看会员方案</Link>
          </Button>
        </div>
        <Text variant="caption" color="tertiary" className="mt-3 block">
          研究观点仅供参考，不构成投资建议。
        </Text>
      </div>
    </section>
  );
}
