import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, Heading, Section, Text } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/membership";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AccountOrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createSupabaseServerClient();
  let orders: Array<Record<string, unknown>> = [];
  if (supabase) {
    const { data } = await supabase
      .from("payment_orders")
      .select("order_number, chain, expected_amount, status, created_at, expires_at, paid_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    orders = data ?? [];
  }

  return (
    <main>
      <Section spacing="lg">
        <Heading as="h1" size="h2">
          我的订单
        </Heading>
        <div className="mt-6 flex flex-col gap-3">
          {orders.length === 0 ? (
            <Card padding="md">
              <Text variant="body-sm" color="secondary">
                暂无订单
              </Text>
            </Card>
          ) : (
            orders.map((o) => (
              <Card key={String(o.order_number)} padding="md" className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Text variant="body" weight="semibold">
                    {String(o.order_number)}
                  </Text>
                  <Text variant="caption" color="tertiary">
                    {String(o.chain)} · {Number(o.expected_amount)} · {String(o.status)}
                  </Text>
                </div>
                {o.status === "pending" && (
                  <Link
                    href={`/checkout/${o.order_number}`}
                    className="text-body-sm text-primary hover:underline"
                  >
                    去支付
                  </Link>
                )}
              </Card>
            ))
          )}
        </div>
      </Section>
    </main>
  );
}
