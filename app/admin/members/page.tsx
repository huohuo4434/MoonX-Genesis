import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { Card, Heading, Section, Text } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/membership";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if (!(await requireAdmin())) redirect("/login?next=/admin/members");

  const { q } = await searchParams;
  const admin = createSupabaseAdminClient();
  let query = admin?.from("profiles").select("id, email, role, membership_status, membership_expires_at, membership_started_at").order("updated_at", { ascending: false }).limit(100);
  if (q?.trim()) {
    query = query?.ilike("email", `%${q.trim()}%`);
  }
  const { data: members } = (await query) ?? { data: [] };

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/members" />
        <Heading as="h1" size="h2">
          会员管理
        </Heading>
        <form className="mt-4 mb-6">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="搜索邮箱…"
            className="h-10 w-full max-w-md rounded-md border border-border bg-surface px-3 text-body-sm"
          />
        </form>
        <div className="flex flex-col gap-2">
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
              {m.role !== "admin" && (
                <Text variant="caption" color="tertiary" className="font-mono">
                  ID: {m.id}
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
