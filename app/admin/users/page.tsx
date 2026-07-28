import { AdminNav } from "@/components/admin/AdminNav";
import { AdminUserMembershipActions } from "@/components/admin/AdminUserMembershipActions";
import { Card, Heading, Section, Text } from "@/components/ui";
import {
  isActiveMember,
  isAdmin,
  listAllAuthUsers,
  PLAN_LABELS,
} from "@/lib/auth/permissions";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const all = await listAllAuthUsers();
  const users = q?.trim()
    ? all.filter((u) => u.email.includes(q.trim().toLowerCase()))
    : all;

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/users" />
        <Heading as="h1" size="h2">
          用户与会员
        </Heading>
        <form className="mt-4 mb-6">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="搜索邮箱…"
            className="h-10 w-full max-w-md rounded-md border border-border bg-surface px-3 text-body-sm"
          />
        </form>
        <div className="flex flex-col gap-3">
          {users.map((u) => {
            const meta = u.app_metadata;
            const adminUser = isAdmin(u);
            return (
              <Card key={u.id} padding="md">
                <Text variant="body-sm" weight="semibold">
                  {u.email}
                </Text>
                <Text variant="caption" color="tertiary" className="mt-1 block">
                  注册时间：
                  {new Date(u.created_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
                </Text>
                <Text variant="caption" color="tertiary" className="mt-1 block">
                  角色：{adminUser ? "管理员" : "普通用户"} · 会员状态：
                  {adminUser ? "永久有效" : isActiveMember(u) ? "有效" : meta.membership_status ?? "未开通"}
                  {meta.membership_plan ? ` · 套餐 ${PLAN_LABELS[meta.membership_plan]}` : ""}
                  {meta.membership_expires_at
                    ? ` · 到期 ${new Date(meta.membership_expires_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`
                    : ""}
                </Text>
                {meta.pending_payment && (
                  <Text variant="caption" color="tertiary" className="mt-1 block">
                    待审核：{PLAN_LABELS[meta.pending_payment.plan]} · {meta.pending_payment.network} ·{" "}
                    {meta.pending_payment.tx_hash}
                  </Text>
                )}
                {!adminUser && <AdminUserMembershipActions userId={u.id} />}
              </Card>
            );
          })}
          {!users.length && (
            <Text variant="body-sm" color="secondary">
              暂无用户。
            </Text>
          )}
        </div>
      </Section>
    </main>
  );
}
