import { AdminNav } from "@/components/admin/AdminNav";
import { Badge, Button, Card, Heading, Section, Text } from "@/components/ui";
import { buildSiteHealthReport } from "@/lib/admin/site-health";
import { countPendingPaymentOrders } from "@/lib/payments/payment-orders-store";
import { requireAdminOrRedirect } from "@/lib/auth/permissions";
import { buildLiveAcceptanceReport } from "@/lib/health/live-acceptance";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminSiteHealthPage() {
  await requireAdminOrRedirect("/admin/site-health");
  const [report, pending, acceptance] = await Promise.all([buildSiteHealthReport(), countPendingPaymentOrders(), buildLiveAcceptanceReport()]);
  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/site-health" pendingCount={pending} />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Heading as="h1" size="h2">网站诊断</Heading>
            <Text variant="body-sm" color="secondary" className="mt-2 block">集中检查日度、周度、月度、重点关注与Vibe证据覆盖。无需逐页截图，也不会显示密钥或用户隐私。</Text>
          </div>
          <Button asChild variant="outline"><a href="/api/admin/site-health">下载诊断JSON</a></Button>
        </div>
        <Card padding="lg" className="mt-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Heading as="h2" size="h3">实时验收五盏灯</Heading>
            <Badge variant={acceptance.overall === "GREEN" ? "success" : "warning"}>{acceptance.overall}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            {acceptance.lights.map((light) => (
              <div key={light.key} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <span aria-hidden className={`h-3 w-3 rounded-full ${light.status === "GREEN" ? "bg-emerald-400" : light.status === "YELLOW" ? "bg-amber-400" : "bg-red-500"}`} />
                  <strong className="text-sm">{light.labelZh}</strong>
                </div>
                <p className="mt-2 text-xs text-foreground-secondary">{light.detailZh}</p>
              </div>
            ))}
          </div>
          <Text variant="caption" color="tertiary">{acceptance.noteZh}</Text>
        </Card>
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
          <Text variant="body-sm">Vibe实时后端：{report.automation.vibeConfigured ? "已配置" : "未配置（使用内置快照）"}</Text>
          <Text variant="body-sm">Vibe可用证据：{report.automation.vibeEvidenceReady} 项</Text>
          <Text variant="body-sm">邮件服务：{report.automation.emailConfigured ? (report.automation.emailProductionReady ? "生产域名已配置" : "已连接，但仍是测试发件人") : "未配置"}</Text>
          <Text variant="body-sm">今日社交卡：{report.automation.socialCardsToday} 张</Text>
          <Text variant="caption" color="tertiary">{report.automation.note}</Text>
        </Card>
      </Section>
    </main>
  );
}
