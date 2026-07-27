import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { Card, Heading, Section, Text } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/membership";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function AdminPlansPage() {
  if (!(await requireAdmin())) redirect("/login?next=/admin/plans");

  const admin = createSupabaseAdminClient();
  const { data: plans } = await admin?.from("membership_plans").select("*").order("sort_order") ?? { data: [] };

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/plans" />
        <Heading as="h1" size="h2">
          套餐管理
        </Heading>
        <Text variant="body-sm" color="secondary" className="mb-4">
          生产套餐：月度 50 / 季度 120 / 年度 400 USDT。价格通过数据库 migration 002 维护。
        </Text>
        <div className="flex flex-col gap-3">
          {(plans ?? []).map((p) => (
            <Card key={p.id} padding="md">
              <Text variant="body" weight="semibold">
                {p.name} ({p.code})
              </Text>
              <Text variant="caption" color="tertiary">
                {p.duration_days} 天 · 价格：{p.price_usdt ?? "未配置"} USDT ·{" "}
                {p.active ? "已启用" : "未启用"}
              </Text>
            </Card>
          ))}
        </div>
        <div className="mt-6 flex gap-4">
          <Link href="/admin/payments" className="text-body-sm text-primary hover:underline">
            订单
          </Link>
          <Link href="/admin/members" className="text-body-sm text-primary hover:underline">
            会员
          </Link>
        </div>
      </Section>
    </main>
  );
}
