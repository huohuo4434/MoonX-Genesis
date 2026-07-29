import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminMethodologyClient } from "@/components/admin/AdminMethodologyClient";
import { Heading, Section, Text } from "@/components/ui";
import { getAccessUser } from "@/lib/auth/get-access-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "预测方法配置 | 管理后台" };

export default async function AdminMethodologyPage() {
  const access = await getAccessUser();
  if (!access.isAdmin) redirect("/admin/login");

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/methodology" />
        <Heading as="h1" size="h2">
          预测方法配置
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 max-w-2xl">
          管理公开「/methodology」页展示的分析模块、简介与权重说明。
        </Text>
        <div className="mt-6">
          <AdminMethodologyClient />
        </div>
      </Section>
    </main>
  );
}
