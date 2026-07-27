import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { Card, Heading, Section, Text } from "@/components/ui";
import { getPaymentReadiness } from "@/lib/payments/readiness";
import { requireAdmin } from "@/lib/auth/membership";
import { getPaymentConfig } from "@/lib/payments/config";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export default async function AdminSettingsPage() {
  if (!(await requireAdmin())) redirect("/login?next=/admin/settings");

  const cfg = getPaymentConfig();
  const readiness = await getPaymentReadiness();

  const checks = [
    { label: "Supabase URL", ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) },
    { label: "Supabase Anon Key", ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) },
    { label: "Supabase Service Role", ok: isSupabaseAdminConfigured() },
    { label: "TronGrid API Key", ok: Boolean(cfg.tronGridApiKey) },
    { label: "TRC20 收款地址", ok: Boolean(cfg.trc20Address) },
    { label: "TRC20 支付开放", ok: readiness.trc20Open },
    { label: "Cron Secret", ok: Boolean(process.env.CRON_SECRET) },
  ];

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/settings" />
        <Heading as="h1" size="h2">
          系统设置
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6">
          环境变量状态（不显示密钥内容）。TRC20 仅在全部检查通过时向用户开放。
        </Text>
        <div className="grid gap-3 sm:grid-cols-2">
          {checks.map((c) => (
            <Card key={c.label} padding="sm">
              <Text variant="body-sm">
                {c.label}：{c.ok ? "✓ 已配置" : "✗ 未就绪"}
              </Text>
            </Card>
          ))}
        </div>
        {!readiness.trc20Open && readiness.reasons.length > 0 && (
          <Card padding="md" className="mt-6">
            <Text variant="body-sm" weight="semibold">
              TRC20 未开放原因
            </Text>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-body-sm text-foreground-secondary">
              {readiness.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </Card>
        )}
        <Card padding="md" className="mt-6">
          <Text variant="body-sm" weight="semibold">
            收款信息
          </Text>
          <Text variant="caption" color="tertiary" className="mt-2 font-mono break-all">
            TRC20：{cfg.trc20Address}
          </Text>
          <Text variant="caption" color="tertiary" className="mt-1 font-mono break-all">
            USDT 合约：{cfg.tronUsdtContract}
          </Text>
          <Text variant="caption" color="tertiary" className="mt-1">
            客服：{cfg.supportEmail}
          </Text>
        </Card>
      </Section>
    </main>
  );
}
