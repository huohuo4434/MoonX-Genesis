import Link from "next/link";
import { LockIcon } from "@/components/icons";
import { Button, Card, Heading, Section, Text } from "@/components/ui";
import { getMemberUserContext } from "@/lib/access/member-preview";
import { formatForecastDateZh } from "@/lib/calendar/next-trading-day";
import {
  buildTomorrowPublicSummary,
  CORE_TOMORROW_ASSETS,
  getMemberTomorrowForecasts,
  getPublicTodayForecasts,
  isHumanPublishedForecast,
} from "@/lib/data/daily-forecasts";
import { getCurrentWeeklyEdition } from "@/lib/data/weekly-edition";
import { routes } from "@/lib/navigation";

function formatShanghaiTime(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Daily page: tomorrow member entry + today's public forecasts + weekly rhythm context. */
export async function DailyMarketForecastSection() {
  const now = new Date();
  const [user, edition, summary, todayForecasts] = await Promise.all([
    getMemberUserContext(),
    getCurrentWeeklyEdition(),
    Promise.resolve(buildTomorrowPublicSummary(now)),
    Promise.resolve(getPublicTodayForecasts(now)),
  ]);
  const memberForecasts = user.isMember ? getMemberTomorrowForecasts(now) : [];

  return (
    <Section spacing="lg" id="daily-edition">
      <div className="mb-8 flex flex-col gap-2">
        <Text variant="label" color="secondary">
          DAILY MARKET FORECASTS
        </Text>
        <Heading as="h1" size="h2">
          每日预测
        </Heading>
        <Text variant="body" color="secondary">
          下一交易日会员预测与今日公开验证内容分开展示；周度节奏来自本周战术研究。
        </Text>
      </div>

      {/* Tomorrow member block */}
      <div className="mb-10 rounded-lg border border-primary/25 bg-card/40 p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Text variant="label" color="secondary">
            会员专享 · 明日核心预测
          </Text>
          {!user.isMember ? <LockIcon size={14} className="text-primary" /> : null}
        </div>
        <Text variant="body" weight="semibold" className="mb-1">
          下一交易日：{formatForecastDateZh(summary.nextDateIso)}
        </Text>
        <Text variant="body-sm" color="secondary" className="mb-4">
          已更新 {summary.assetCount} 项资产 · 最后更新 {summary.lastUpdatedLabel}（上海时间）
          {summary.publishedCount > 0 ? " · 部分预测已发布" : " · 尚未发布（待人工审核）"}
        </Text>

        {user.isMember ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {memberForecasts.map((f) => {
              const pending = !isHumanPublishedForecast(f);
              return (
                <Card key={f.id} padding="md" className="flex flex-col gap-2">
                  <Text variant="body" weight="semibold">
                    {f.assetName}{" "}
                    <span className="font-mono text-foreground-tertiary">{f.symbol}</span>
                  </Text>
                  <Text variant="caption" color="tertiary">
                    {f.tradingSessionLabel} · {formatForecastDateZh(f.forecastForDate)}
                  </Text>
                  {pending ? (
                    <Text variant="body-sm" color="secondary">
                      研究尚未完成
                    </Text>
                  ) : (
                    <>
                      <Text variant="label" color="secondary">
                        {f.direction} · {f.confidence}%
                      </Text>
                      <Text variant="body-sm" color="secondary">
                        {f.summary}
                      </Text>
                    </>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            <Text variant="body-sm" color="secondary">
              覆盖资产：{summary.assetNames.join("、")}
            </Text>
            <ul className="grid gap-2 sm:grid-cols-2 text-body-sm text-foreground-secondary">
              {["明日方向", "上涨/下跌概率", "支撑压力", "关键时间窗口", "失效条件"].map((label) => (
                <li key={label} className="rounded-md border border-border/[0.08] px-3 py-2">
                  {label}：<span className="text-foreground-tertiary">会员解锁</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button asChild variant="primary" size="sm">
                <Link href={routes.pricing}>解锁明日预测</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={routes.tomorrowForecast}>查看会员权益</Link>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Today public block */}
      <div className="mb-10">
        <Text variant="label" color="secondary" className="mb-2 block">
          今日公开验证
        </Text>
        <Text variant="caption" color="tertiary" className="mb-4 block">
          来自对应交易日已公开（publicAt 已到达）的预测记录 · 标记「今日验证中」
        </Text>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {todayForecasts.length === 0 ? (
            <Card padding="md">
              <Text variant="body-sm" color="secondary">
                今日公开预测尚未到达公开时间。
              </Text>
            </Card>
          ) : (
            todayForecasts.map((f) => {
              const pending = !isHumanPublishedForecast(f);
              return (
                <Card key={f.id} padding="md" className="flex flex-col gap-2">
                  <Text variant="body" weight="semibold">
                    {f.assetName}{" "}
                    <span className="font-mono text-foreground-tertiary">{f.symbol}</span>
                  </Text>
                  <Text variant="caption" color="tertiary">
                    预测针对 {formatForecastDateZh(f.forecastForDate)} · 验证中
                  </Text>
                  <Text variant="body-sm" color="secondary">
                    {pending ? "研究尚未完成" : f.summary}
                  </Text>
                  <Text variant="caption" color="tertiary">
                    首次发布 {formatShanghaiTime(f.publishedAt)} · v{f.version}
                  </Text>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Weekly rhythm from configured assets — not hardcoded to SPX/NDX only */}
      <div>
        <Text variant="label" color="secondary" className="mb-2 block">
          本周节奏参考（{edition.periodStart} → {edition.periodEnd}）
        </Text>
        {edition.cards.length === 0 ? (
          <Card padding="md">
            <Text variant="body-sm" color="secondary">
              本周预测尚未录入
            </Text>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {CORE_TOMORROW_ASSETS.map((asset) => {
              const card = edition.cards.find((c) => c.assetId === asset.assetId);
              if (!card) {
                return (
                  <Card key={asset.assetId} padding="md">
                    <Text variant="body" weight="semibold">
                      {asset.assetName}
                    </Text>
                    <Text variant="body-sm" color="secondary" className="mt-2">
                      本周节奏待补充
                    </Text>
                  </Card>
                );
              }
              const dayKey = (() => {
                const d = now.getDay();
                if (d === 0) return "weekend";
                if (d === 6) return "weekend";
                return (["monday", "tuesday", "wednesday", "thursday", "friday"] as const)[d - 1];
              })();
              const slot = card.daySlots.find((s) => s.key === dayKey) ?? card.daySlots[0];
              return (
                <Card key={card.assetId} padding="md" className="flex flex-col gap-2">
                  <Text variant="body" weight="semibold">
                    {card.nameZhCN}{" "}
                    <span className="font-mono text-foreground-tertiary">{card.symbol}</span>
                  </Text>
                  {slot ? (
                    <>
                      <Text variant="label" color="secondary">
                        {slot.directionLabelZhCN}
                      </Text>
                      <Text variant="body-sm" color="secondary">
                        {slot.rhythmZhCN}
                      </Text>
                    </>
                  ) : (
                    <Text variant="body-sm" color="secondary">
                      {card.record.summary.zhCN}
                    </Text>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href={routes.forecasts}>查看本周预测</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={routes.researchVerification}>查看历史预测准确率</Link>
        </Button>
      </div>
    </Section>
  );
}
