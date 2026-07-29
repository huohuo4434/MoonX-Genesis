import { unstable_noStore as noStore } from "next/cache";
import { AdminNav } from "@/components/admin/AdminNav";
import { Card, Heading, Section, Text } from "@/components/ui";
import { listMembershipEvents } from "@/lib/auth/membership-events";
import { requireAdminOrRedirect } from "@/lib/auth/permissions";
import { formatDateTimeChina } from "@/lib/utils/datetime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminMembershipEventsPage() {
  noStore();
  await requireAdminOrRedirect("/admin/membership-events");
  const events = await listMembershipEvents({ limit: 100 });

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/membership-events" />
        <Heading as="h1" size="h2">
          会员变更流水
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2">
          每次会员到期时间变化都会记录。部署与审核不得静默覆盖到期时间。
        </Text>
        <div className="mt-6 space-y-3">
          {events.map((e) => (
            <Card key={e.id} padding="md" className="grid gap-1 text-body-sm">
              <div>用户邮箱：{e.userEmail ?? e.userId}</div>
              <div>
                原到期时间：
                {e.previousExpiresAt ? formatDateTimeChina(e.previousExpiresAt) : "—"}
              </div>
              <div>
                新到期时间：
                {e.newExpiresAt ? formatDateTimeChina(e.newExpiresAt) : "—"}
              </div>
              <div>变化天数：{e.daysChanged}</div>
              <div>变化原因：{e.eventType}</div>
              <div>来源：{e.source} / {e.sourceId}</div>
              <div>操作人：{e.operatorId ?? "—"}</div>
              <div>操作时间：{formatDateTimeChina(e.createdAt)}</div>
              {e.note ? <div>备注：{e.note}</div> : null}
            </Card>
          ))}
          {!events.length ? (
            <Text variant="body-sm" color="tertiary">
              暂无流水
            </Text>
          ) : null}
        </div>
      </Section>
    </main>
  );
}
