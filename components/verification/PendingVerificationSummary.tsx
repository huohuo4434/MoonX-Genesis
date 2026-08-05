import { Badge, Card, Heading, Text } from "@/components/ui";
import type { PendingVerificationItem } from "@/lib/accuracy/get-pending-verification";

function formatDateTime(value: string, en: boolean): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(en ? "en-GB" : "zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function PendingVerificationSummary({
  items,
  en,
}: {
  items: PendingVerificationItem[];
  en: boolean;
}) {
  if (!items.length) return null;

  const observing = items.filter((item) => item.phase === "OBSERVING");
  const awaiting = items.filter((item) => item.phase === "AWAITING_RESULT");

  return (
    <Card padding="lg" className="mb-6 border-primary/15 bg-primary/[0.02]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Heading as="h2" size="h3">
            {en ? "Locked records awaiting verification" : "已经锁定、正在等待验证的记录"}
          </Heading>
          <Text variant="body-sm" color="secondary" className="mt-2 block">
            {en
              ? "No verdict is filled in early. Records move to completed verification only after the observation window ends and real market data is available."
              : "这里不会提前填写命中结果。只有观察窗口结束并取得真实行情后，记录才会进入已完成验证。"}
          </Text>
        </div>
        <Badge variant="outline">{items.length} {en ? "records" : "条"}</Badge>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <Text variant="body-sm" weight="semibold">{en ? "Observing now" : "正在观察中"}</Text>
          <div className="mt-2 space-y-2">
            {observing.length ? observing.map((item) => (
              <div key={item.forecastId} className="rounded-lg border border-border/[0.08] p-3">
                <div className="flex items-center justify-between gap-3">
                  <Text variant="body-sm" weight="semibold">{item.assetName} · {item.symbol}</Text>
                  <Badge variant="warning">{en ? "Observing" : "观察中"}</Badge>
                </div>
                <Text variant="caption" color="tertiary" className="mt-2 block">
                  {en ? "Forecast date" : "预测日期"}：{item.forecastDate} · {en ? "Due" : "预计验证"}：{formatDateTime(item.cutoffAt, en)}
                </Text>
              </div>
            )) : (
              <Text variant="caption" color="tertiary" className="block rounded-lg border border-border/[0.08] p-3">
                {en ? "No record is currently inside its observation window." : "当前没有仍处于观察窗口内的记录。"}
              </Text>
            )}
          </div>
        </div>

        <div>
          <Text variant="body-sm" weight="semibold">{en ? "Window ended, result processing" : "观察结束，等待结果处理"}</Text>
          <div className="mt-2 space-y-2">
            {awaiting.length ? awaiting.map((item) => (
              <div key={item.forecastId} className="rounded-lg border border-border/[0.08] p-3">
                <div className="flex items-center justify-between gap-3">
                  <Text variant="body-sm" weight="semibold">{item.assetName} · {item.symbol}</Text>
                  <Badge variant="outline">{en ? "Processing" : "待处理"}</Badge>
                </div>
                <Text variant="caption" color="tertiary" className="mt-2 block">
                  {en ? "Locked" : "锁定时间"}：{formatDateTime(item.lockedAt, en)} · {en ? "Forecast date" : "预测日期"}：{item.forecastDate}
                </Text>
              </div>
            )) : (
              <Text variant="caption" color="tertiary" className="block rounded-lg border border-border/[0.08] p-3">
                {en ? "No completed observation is waiting for processing." : "当前没有观察结束但尚未处理的记录。"}
              </Text>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
