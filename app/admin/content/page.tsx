import { AdminNav } from "@/components/admin/AdminNav";
import { AdminContentActions } from "@/components/admin/AdminContentActions";
import { AdminPublishForm } from "@/components/admin/AdminPublishForm";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { readCollection, type PredictionRecord } from "@/lib/data/moonx-store";
import { getAllMemberForecasts } from "@/lib/data/daily-forecasts";

export default async function AdminContentPage() {
  const [predictions, forecasts] = await Promise.all([
    readCollection<PredictionRecord[]>("predictions", []),
    Promise.resolve(getAllMemberForecasts()),
  ]);

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/content" />
        <Heading as="h1" size="h2">
          内容发布
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6">
          编辑并发布今日观点与明日预测。本地核心预测仍可用；此处发布内容作为运营覆盖层。
        </Text>

        <AdminPublishForm kind="today" />
        <AdminPublishForm kind="tomorrow" />

        <Heading as="h2" size="h3" className="mb-3 mt-2">
          已发布运营内容
        </Heading>
        <div className="mb-8 flex flex-col gap-3">
          {predictions.map((p) => (
            <Card key={p.id} padding="md">
              <div className="flex flex-wrap items-center gap-2">
                <Text variant="body" weight="semibold">
                  {p.type === "today" ? "今日观点" : "明日预测"} · {p.title}
                </Text>
                <Badge variant={p.status === "published" ? "default" : "neutral"}>{p.status}</Badge>
              </div>
              <Text variant="body-sm" color="secondary" className="mt-2 whitespace-pre-wrap">
                {p.body}
              </Text>
              <Text variant="caption" color="tertiary" className="mt-2 block">
                更新于 {new Date(p.updatedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
              </Text>
              <AdminContentActions id={p.id} status={p.status} />
            </Card>
          ))}
          {!predictions.length && (
            <Text variant="body-sm" color="secondary">
              暂无运营发布内容。
            </Text>
          )}
        </div>

        <Heading as="h2" size="h3" className="mb-3">
          本地核心预测（只读）
        </Heading>
        <div className="flex flex-col gap-3">
          {forecasts.slice(0, 8).map((f) => (
            <Card key={f.id} padding="md">
              <div className="flex flex-wrap items-center gap-2">
                <Text variant="body" weight="semibold">
                  {f.assetName} · {f.symbol}
                </Text>
                <Badge variant={f.status === "draft" ? "neutral" : "default"}>{f.status}</Badge>
                <Badge variant="outline">{f.accessLevel}</Badge>
              </div>
              <Text variant="body-sm" color="secondary" className="mt-2">
                {f.summary}
              </Text>
            </Card>
          ))}
        </div>
      </Section>
    </main>
  );
}
