import { AdminNav } from "@/components/admin/AdminNav";
import { Badge, Button, Card, Heading, Section, Text } from "@/components/ui";
import { buildSiteHealthReport } from "@/lib/admin/site-health";
import { countPendingPaymentOrders } from "@/lib/payments/payment-orders-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminSiteHealthPage() {
  const [report, pending] = await Promise.all([buildSiteHealthReport(), countPendingPaymentOrders()]);
  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/site-health" pendingCount={pending} />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Heading as="h1" size="h2">网站诊断</Heading>
            <Text variant="body-sm" color="secondary" className="mt-2 block">集中检查今日、下一交易日、周度和月度覆盖。无需逐页截图，也不会显示密钥或用户隐私。</Text>
          </div>
          <Button asChild variant="outline"><a href="/api/admin/site-health">下载诊断JSON</a></Button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {report.sections.map((section) => (
            <Card key={section.key} padding="lg" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <Heading as="h2" size="h3">{section.label}</Heading>
                <Badge variant={section.missing.length ? "warning" : "success"}>{section.ready} / {section.expected}</Badge>
              </div>
              {section.missing.length ? (
                <div className="space-y-2">
                  {section.missing.map((item) => <div key={item.assetId} className="rounded-lg border border-amber-400/20 p-3 text-sm"><strong>{item.assetName}</strong><div className="mt-1 text-foreground-secondary">{item.reason}</div></div>)}
                </div>
              ) : <Text variant="body-sm" color="secondary">覆盖完整。</Text>}
            </Card>
          ))}
        </div>
        <Card padding="lg" className="mt-6 space-y-2">
          <Heading as="h2" size="h3">自动化配置</Heading>
          <Text variant="body-sm">服务器定时任务密钥：{report.automation.cronSecretConfigured ? "已配置" : "未配置"}</Text>
          <Text variant="body-sm">Bitget连接参数：{report.automation.bitgetConfigured ? "已配置" : "未配置"}</Text>
          <Text variant="caption" color="tertiary">{report.automation.note}</Text>
        </Card>
      </Section>
    </main>
  );
}
