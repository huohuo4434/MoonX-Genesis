import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/membership";
import { getAllMemberForecasts } from "@/lib/data/daily-forecasts";

export default async function AdminForecastsPage() {
  if (!(await requireAdmin())) redirect("/login?next=/admin/forecasts");

  const forecasts = getAllMemberForecasts();

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/forecasts" />
        <Heading as="h1" size="h2">
          明日预测审核
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6">
          未审核（draft/reviewed）的预测不会进入会员页面完整展示。发布前请确认方向、价位与失效条件。
        </Text>
        <div className="flex flex-col gap-3">
          {forecasts.map((f) => (
            <Card key={f.id} padding="md">
              <div className="flex flex-wrap items-center gap-2">
                <Text variant="body" weight="semibold">
                  {f.assetName} · {f.symbol}
                </Text>
                <Badge variant={f.status === "draft" ? "neutral" : "default"}>{f.status}</Badge>
                <Badge variant="default">{f.accessLevel}</Badge>
              </div>
              <Text variant="body-sm" color="secondary" className="mt-2">
                {f.summary}
              </Text>
              <Text variant="caption" color="tertiary" className="mt-2">
                预测日 {f.forecastForDate} · 置信度 {f.confidence}% · v{f.version}
                {f.reviewedBy ? ` · 审核 ${f.reviewedBy}` : ""}
                {f.publishedBy ? ` · 发布 ${f.publishedBy}` : ""}
              </Text>
            </Card>
          ))}
        </div>
      </Section>
    </main>
  );
}
