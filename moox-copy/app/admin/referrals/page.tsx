import { AdminNav } from "@/components/admin/AdminNav";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { requireAdminOrRedirect } from "@/lib/auth/permissions";
import { getAdminReferralRows } from "@/lib/referral/service";
import { formatDateTimeChina } from "@/lib/utils/datetime";

export const dynamic = "force-dynamic";

export const metadata = { title: "邀请管理 | 管理后台" };

export default async function AdminReferralsPage() {
  await requireAdminOrRedirect("/admin/referrals");
  const rows = await getAdminReferralRows();

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/referrals" />
        <Heading as="h1" size="h2">
          邀请管理
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6">
          查看邀请关系、付款状态与奖励天数。成功邀请双方各增加 7 天会员时间。
        </Text>

        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.id} padding="md" className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{row.status}</Badge>
                <Badge variant="outline">{row.paymentStatus}</Badge>
                <Text variant="caption" color="tertiary">
                  +{row.rewardDays} 天
                </Text>
              </div>
              <Text variant="body-sm">
                邀请人：{row.inviterEmail}
              </Text>
              <Text variant="body-sm">
                被邀请人：{row.inviteeEmail}
              </Text>
              <Text variant="caption" color="tertiary" className="block">
                付款：{row.paymentId ?? "—"} · 创建 {formatDateTimeChina(row.createdAt)}
              </Text>
              {row.flaggedReason ? (
                <Text variant="caption" className="text-red-600">
                  异常：{row.flaggedReason}
                </Text>
              ) : null}
            </Card>
          ))}
          {rows.length === 0 ? (
            <Text variant="body-sm" color="secondary">
              暂无邀请记录。可运行 `npm run seed:referral` 写入测试数据。
            </Text>
          ) : null}
        </div>
      </Section>
    </main>
  );
}
