import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, Heading, Section, Text } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/membership";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function AdminPaymentsPage() {
  if (!(await requireAdmin())) redirect("/login");

  const admin = createSupabaseAdminClient();
  const { data: orders } = await admin
    ?.from("payment_orders")
    .select("order_number, status, chain, expected_amount, paid_amount, tx_hash, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(50) ?? { data: [] };

  return (
    <main>
      <Section spacing="lg">
        <Heading as="h1" size="h2">
          支付订单（管理员）
        </Heading>
        <div className="mt-4 flex flex-col gap-2">
          {(orders ?? []).map((o) => (
            <Card key={o.order_number} padding="sm">
              <Text variant="body-sm">
                {o.order_number} · {o.status} · {o.chain} · {Number(o.expected_amount)} USDT
              </Text>
              {o.tx_hash && (
                <Text variant="caption" color="tertiary" className="font-mono">
                  {o.tx_hash}
                </Text>
              )}
            </Card>
          ))}
        </div>
        <Link href="/admin/plans" className="mt-4 inline-block text-body-sm text-primary hover:underline">
          套餐管理
        </Link>
      </Section>
    </main>
  );
}
