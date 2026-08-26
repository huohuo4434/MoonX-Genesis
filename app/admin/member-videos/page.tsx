import { AdminNav } from "@/components/admin/AdminNav";
import { MemberVideoUploadClient } from "@/components/admin/MemberVideoUploadClient";
import { Card, Heading, Section, Text } from "@/components/ui";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminMemberVideosPage() {
  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/member-videos" />
        <div className="mx-auto max-w-4xl">
          <Heading as="h1" size="h2">
            会员视频管理
          </Heading>
          <Text color="secondary" className="mt-2">
            当前片目：纳指100 · 十年周期风险窗口（4分51秒）
          </Text>
          <Card padding="lg" className="mt-6">
            <MemberVideoUploadClient />
          </Card>
        </div>
      </Section>
    </main>
  );
}
