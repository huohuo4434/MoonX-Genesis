import Link from "next/link";

import { AdminNav } from "@/components/admin/AdminNav";
import { Badge, Button, Card, Heading, Section, Text } from "@/components/ui";
import { requireAdminOrNotFound } from "@/lib/auth/require-admin-or-404";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const entries = [
  {
    title: "音频／视频课程",
    description: "上传 MP3、M4A、MP4 等课程原件。系统立即尝试转写和拆解；未完成部分由两小时补偿任务继续。",
    href: "/admin/lessons",
    action: "上传课程媒体",
    badge: "自动转写＋方法拆解",
  },
  {
    title: "已有文字／截图转写",
    description: "已经有 TXT、VTT 或截图识别文字时，从这里粘贴原文。保存后立即生成候选方法与奇门影子证据。",
    href: "/admin/teacher-knowledge/lessons/new",
    action: "录入文字笔记",
    badge: "保留原文＋即时处理",
  },
  {
    title: "单一品种研究材料",
    description: "只针对某只股票、币、黄金或指数的资料，进入资产材料导入，避免混入通用方法知识库。",
    href: "/admin/asset-research",
    action: "导入品种资料",
    badge: "按资产归档",
  },
] as const;

export default async function AdminResearchIngestPage() {
  await requireAdminOrNotFound();
  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/research-ingest" />
        <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">ONE INBOX · ADMIN ONLY</p>
        <Heading as="h1" size="h2" className="mt-2">统一资料入口</Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 max-w-3xl">
          不再凭页面名称猜资料该放哪里：先按“媒体原件、已有文字、单一品种资料”选择。三个入口共用同一研究治理，AI只生成候选，不能改正式方向、权重或交易权限。
        </Text>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {entries.map((item) => (
            <Card key={item.href} padding="lg" className="flex flex-col gap-4">
              <div><Badge variant="outline">{item.badge}</Badge></div>
              <Heading as="h2" size="h3">{item.title}</Heading>
              <Text variant="body-sm" color="secondary" className="grow">{item.description}</Text>
              <Button asChild><Link href={item.href}>{item.action}</Link></Button>
            </Card>
          ))}
        </div>
        <Card padding="md" className="mt-6 border border-amber-500/30 bg-amber-500/10">
          <Text variant="body-sm">上传成功不等于方法已验证。新内容先进入 RESEARCH_ONLY；只有事前锁定、到期闭合K线评价和真实样本门槛都满足后，后台才会显示研究比较合格。</Text>
        </Card>
      </Section>
    </main>
  );
}
