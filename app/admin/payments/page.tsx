import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/membership";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function AdminPaymentsPage() {
  if (!(await requireAdmin())) redirect("/login?next=/admin/payments");

  const admin = createSupabaseAdminClient();
  const { data: orders } = await admin
    ?.from("payment_orders")
    .select("id, order_number, status, chain, expected_amount, paid_amount, tx_hash, created_at, user_id, verification_error")
    .order("created_at", { ascending: false })
    .limit(50) ?? { data: [] };

  const userIds = [...new Set((orders ?? []).map((o) => o.user_id))];
  const { data: profiles } = userIds.length
    ? await admin!.from("profiles").select("id, email").in("id", userIds)
    : { data: [] };
  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]));

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/payments" />
        <Heading as="h1" size="h2">
          支付订单
        </Heading>
        <div className="mt-4 flex flex-col gap-2">
          {(orders ?? []).map((o) => (
              <Card key={o.order_number} padding="sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Text variant="body-sm" weight="semibold">
                    {o.order_number}
                  </Text>
                  <Badge variant="default">{o.status}</Badge>
                  <Text variant="caption" color="tertiary">
                    {o.chain} · {Number(o.expected_amount)} USDT
                  </Text>
                </div>
                <Text variant="caption" color="tertiary">
                  {emailById.get(o.user_id) ?? o.user_id} · {new Date(o.created_at).toLocaleString("zh-CN")}
                </Text>
                {o.tx_hash && (
                  <Text variant="caption" color="tertiary" className="font-mono break-all">
                    {o.tx_hash}
                  </Text>
                )}
                {o.verification_error && (
                  <Text variant="caption" color="tertiary">
                    {o.verification_error}
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
