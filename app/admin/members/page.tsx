import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, Heading, Section, Text } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/membership";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function AdminMembersPage() {
  if (!(await requireAdmin())) redirect("/login");

  const admin = createSupabaseAdminClient();
  const { data: members } = await admin
    ?.from("profiles")
    .select("email, role, membership_status, membership_expires_at")
    .order("updated_at", { ascending: false })
    .limit(50) ?? { data: [] };

  return (
    <main>
      <Section spacing="lg">
        <Heading as="h1" size="h2">
          会员管理（管理员）
        </Heading>
        <div className="mt-4 flex flex-col gap-2">
          {(members ?? []).map((m) => (
            <Card key={m.email} padding="sm">
              <Text variant="body-sm">
                {m.email} · {m.role} · {m.membership_status}
              </Text>
              {m.membership_expires_at && (
                <Text variant="caption" color="tertiary">
                  到期 {new Date(m.membership_expires_at).toLocaleString("zh-CN")}
                </Text>
              )}
            </Card>
          ))}
        </div>
        <Link href="/admin/payments" className="mt-4 inline-block text-body-sm text-primary hover:underline">
          支付订单
        </Link>
      </Section>
    </main>
  );
}
