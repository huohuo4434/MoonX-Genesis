import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { LockIcon } from "@/components/icons";
import { Button, Card, Heading, Section, Text } from "@/components/ui";
import { getMemberUserContext } from "@/lib/access/member-preview";
import { formatForecastDateZh } from "@/lib/calendar/next-trading-day";
import {
  buildTomorrowPublicSummary,
  CORE_TOMORROW_ASSETS,
  displayDirection,
  getMemberTomorrowForecasts,
  isHumanPublishedForecast,
} from "@/lib/data/daily-forecasts";
import { getTodayForecastAccessPayload } from "@/lib/prediction-access-server";
import { getCurrentWeeklyEdition } from "@/lib/data/weekly-edition";
import { routes } from "@/lib/navigation";

/** Daily page: tomorrow member entry + today's gated forecasts + weekly rhythm context. */
export async function DailyMarketForecastSection() {
  noStore();
  const now = new Date();
  const [user, edition, summary, todayPayload] = await Promise.all([
    getMemberUserContext(),
    getCurrentWeeklyEdition(),
    Promise.resolve(buildTomorrowPublicSummary(now)),
    getTodayForecastAccessPayload(now),
  ]);
  const memberForecasts = user.isMember ? getMemberTomorrowForecasts(now) : [];
  const todayForecasts = todayPayload.allowed ? todayPayload.forecasts : [];

  return (
    <Section spacing="lg" id="daily-edition">
      <div className="mb-8 flex flex-col gap-2">
        <Heading as="h1" size="h2">
          每日市场预测
        </Heading>
        <Text variant="body" color="secondary">
          下一交易日会员预测与今日公开验证内容分开展示；各市场公开时间以每条预测记录的 publicAt 为准。
        </Text>
      </div>

      {/* Tomorrow member block */}
      <div className="mb-10 rounded-lg border border-primary/25 bg-card/40 p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Text variant="label" color="secondary">
            下一交易日预测 · 会员提前查看
          </Text>
          {!user.isMember ? <LockIcon size={14} className="text-primary" /> : null}
        </div>
        <Text variant="body" weight="semibold" className="mb-1">
          预测日期：{formatForecastDateZh(summary.nextDateIso)}
        </Text>
        <Text variant="body-sm" color="secondary" className="mb-4">
          {summary.allDraft
            ? `计划覆盖 ${summary.assetCount} 项资产 · 预测草稿待人工审核`
            : `已发布 ${summary.publishedCount} 项预测 · 最后更新 ${summary.lastUpdatedLabel}`}
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
                      尚未发布
                    </Text>
                  ) : (
                    <>
                      <Text variant="label" color="secondary">
                        {displayDirection(f)} · {f.confidence}%
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

      {/* Today gated block */}
      <div className="mb-10">
        <Text variant="label" color="secondary" className="mb-2 block">
          今日预测
        </Text>
        {!todayPayload.allowed && todayPayload.access.reason === "LOGIN_REQUIRED" ? (
          <Card padding="md" className="space-y-3">
            <Text variant="body" weight="semibold">
              登录后查看今日预测
            </Text>
            <Text variant="body-sm" color="secondary">
              今日预测仅向已登录用户开放。
            </Text>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="primary" size="sm">
                <Link href="/login">登录</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/register">注册</Link>
              </Button>
            </div>
          </Card>
        ) : null}
        {!todayPayload.allowed && todayPayload.access.reason === "WAIT_UNTIL_08" ? (
          <Card padding="md" className="space-y-3">
            <Text variant="body" weight="semibold">
              今日预测将在北京时间08:00开放
            </Text>
            <Text variant="body-sm" color="secondary">
              有效会员可全天提前查看今日预测。
            </Text>
            <Button asChild variant="primary" size="sm">
              <Link href={routes.pricing}>升级会员</Link>
            </Button>
          </Card>
        ) : null}
        {todayPayload.allowed ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {todayForecasts.length === 0 ? (
              <Card padding="md">
                <Text variant="body-sm" color="secondary">
                  今日预测内容稍后发布。
                </Text>
              </Card>
            ) : (
              todayForecasts.map((f) => {
                const ready = isHumanPublishedForecast(f);
                return (
                  <Card key={f.id} padding="md" className="flex flex-col gap-2">
                    <Text variant="body" weight="semibold">
                      {f.assetName}{" "}
                      <span className="font-mono text-foreground-tertiary">{f.symbol}</span>
                    </Text>
                    <Text variant="caption" color="tertiary">
                      预测针对 {formatForecastDateZh(f.forecastForDate)}
                      {ready ? " · 今日验证中" : ""}
                    </Text>
                    <Text variant="body-sm" color="secondary">
                      {ready ? `${displayDirection(f)} · ${f.summary}` : "研究尚未完成"}
                    </Text>
                  </Card>
                );
              })
            )}
          </div>
        ) : null}
      </div>

      {/* Core assets reference */}
      <div className="mb-6">
        <Text variant="label" color="secondary" className="mb-2 block">
          默认覆盖资产
        </Text>
        <Text variant="body-sm" color="secondary">
          {CORE_TOMORROW_ASSETS.map((a) => a.assetName).join("、")}
        </Text>
      </div>

      {/* Weekly rhythm */}
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
                if (d === 0 || d === 6) return "weekend";
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
          <Link href={routes.weeklyAnalysis}>查看本周行情</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={routes.verification}>查看历史预测准确率</Link>
        </Button>
      </div>
    </Section>
  );
}
