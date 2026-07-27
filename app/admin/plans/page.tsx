import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, Heading, Section, Text } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/membership";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function AdminPlansPage() {
  const adminProfile = await requireAdmin();
  if (!adminProfile) redirect("/login");

  const admin = createSupabaseAdminClient();
  const { data: plans } = await admin?.from("membership_plans").select("*").order("sort_order") ?? { data: [] };

  return (
    <main>
      <Section spacing="lg">
        <Heading as="h1" size="h2">
          套餐管理（管理员）
        </Heading>
        <Text variant="body-sm" color="secondary" className="mb-4">
          在 Supabase 控制台或通过 SQL 更新 price_usdt 与 active。未配置价格前不得启用购买。
        </Text>
        <div className="flex flex-col gap-3">
          {(plans ?? []).map((p) => (
            <Card key={p.id} padding="md">
              <Text variant="body" weight="semibold">
                {p.name} ({p.code})
              </Text>
              <Text variant="caption" color="tertiary">
                {p.duration_days} 天 · 价格：{p.price_usdt ?? "未配置"} · {p.active ? "已启用" : "未启用"}
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
