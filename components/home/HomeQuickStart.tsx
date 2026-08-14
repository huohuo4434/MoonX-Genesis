import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";
import { getCurrentUser, isActiveMember, isAdmin } from "@/lib/auth/permissions";
import { getTodayForecastAccessPayload } from "@/lib/prediction-access-server";
import { getWeeklySectionPayload } from "@/lib/data/weekly-analysis-access";
import { displayDirection, isHumanPublishedForecast } from "@/lib/data/daily-forecasts";
import { englishPath } from "@/lib/i18n/config";
import { getRequestLocale } from "@/lib/i18n/server";
import { assetNameEn, directionEn, safeEnglish } from "@/lib/i18n/english-content";

type QuickCard = {
  label: string;
  title: string;
  body: string;
  href: string;
  badge: string;
};

function firstText(values: Array<string | null | undefined>, fallback: string): string {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim() ?? fallback;
}

export async function HomeQuickStart() {
  noStore();
  const [locale, user] = await Promise.all([getRequestLocale(), getCurrentUser()]);
  const en = locale === "en";
  const href = (path: string) => en ? englishPath(path) : path;
  const member = isActiveMember(user) || isAdmin(user);

  if (!member) {
    return (
      <section className="border-t border-border/[0.06] py-8">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <Card padding="lg" className="border-primary/20 bg-primary/[0.025]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <Badge variant="outline">{en ? "New here?" : "第一次使用MOOX？"}</Badge>
                <Heading as="h2" size="h3" className="mt-3">
                  {en ? "Use these four pages in order" : "先按这四步看，不需要先学专业术语"}
                </Heading>
                <Text variant="body-sm" color="secondary" className="mt-2 block">
                  {en
                    ? "Today for direction, Weekly for the current stage, AI Strategy Desk for confirmation, and Verification for the historical record."
                    : "今日看方向，周度看阶段，AI交易台等确认，验证页看历史表现。"}
                </Text>
              </div>
              <Button asChild variant="primary">
                <Link href={href("/guide")}>{en ? "Open the 1-minute guide" : "查看1分钟使用指南"}</Link>
              </Button>
            </div>
          </Card>
        </div>
      </section>
    );
  }

  const now = new Date();
  const [todayResult, weeklyResult] = await Promise.allSettled([
    getTodayForecastAccessPayload(now),
    getWeeklySectionPayload(now),
  ]);

  let todayCard: QuickCard = {
    label: en ? "Today’s main direction" : "今日主方向",
    title: en ? "Waiting for the latest release" : "等待最新观点",
    body: en ? "Open Today to see the current direction and path." : "进入今日页面查看当前方向和运行路径。",
    href: "/#moonx-view",
    badge: en ? "Today" : "今日",
  };

  if (todayResult.status === "fulfilled" && todayResult.value.allowed) {
    const forecast = todayResult.value.forecasts
      .filter(isHumanPublishedForecast)
      .sort((a, b) => b.confidence - a.confidence)[0];
    if (forecast) {
      todayCard = {
        label: en ? "Today’s main direction" : "今日主方向",
        title: en
          ? `${assetNameEn(forecast.assetName)} · ${directionEn(displayDirection(forecast))}`
          : `${forecast.assetName} · ${displayDirection(forecast)}`,
        body: en
          ? safeEnglish(
              firstText(
                [forecast.pathBias, forecast.headline, forecast.summary, forecast.expectedPath?.join(" → ")],
                "Wait for the stated confirmation before acting."
              ),
              "Wait for the stated confirmation before acting."
            )
          : firstText(
              [forecast.pathBias, forecast.headline, forecast.summary, forecast.expectedPath?.join(" → ")],
              "先认准MOOX唯一方向，再用技术点位找更合适的位置；技术不负责改方向。"
            ),
        href: "/#moonx-view",
        badge: `${forecast.confidence}%`,
      };
    }
  }

  let weeklyCard: QuickCard = {
    label: en ? "Weekly Alpha 5" : "本周精选5",
    title: en ? "Open the member weekly report" : "查看会员核心周报",
    body: en ? "Five concentrated weekly opportunities first, then the broader core-market map." : "先看本周最值得盯的5个，再看九大核心市场背景。",
    href: "/member/weekly",
    badge: en ? "Weekly" : "周度",
  };

  if (weeklyResult.status === "fulfilled" && weeklyResult.value.mode === "member") {
    const published = weeklyResult.value.slots
      .flatMap((slot) => slot.kind === "published" ? [slot.analysis] : [])
      .sort((a, b) => b.confidence - a.confidence)[0];
    if (published) {
      weeklyCard = {
        label: en ? "Weekly Alpha 5" : "本周精选5",
        title: en ? "Member weekly report is live" : "会员核心周报已发布",
        body: en
          ? "Open the concentrated five-name report first, then use the core-market appendix for context."
          : "先看本周精选5深度研究，再用九大核心市场附录判断整体环境。",
        href: "/member/weekly",
        badge: en ? "Members" : "会员",
      };
    }
  }

  const aiCard: QuickCard = {
    label: en ? "AI execution check" : "AI执行确认",
    title: en ? "Use reconciled positions only" : "只认真仓与保护单",
    body: en
      ? "Open the desk for the latest reconciled status. Missing quotes or an unavailable server always means wait."
      : "进入交易台看最新对账状态；行情为空或服务器待检查时一律视为等待，不把计划账本冒充真实持仓。",
    href: "/member/ai-trading",
    badge: en ? "No forced trades" : "不强制下单",
  };

  return (
    <section className="border-t border-border/[0.06] py-8">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <Badge variant="default">{en ? "Member quick view" : "会员快速入口"}</Badge>
          <Heading as="h2" size="h3" className="mt-2">{en ? "Only check these three items today" : "今天只看这三项"}</Heading>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {[todayCard, weeklyCard, aiCard].map((card) => (
            <Link key={card.label} href={href(card.href)} className="group">
              <Card padding="lg" className="h-full transition-colors group-hover:border-primary/30 group-hover:bg-primary/[0.02]">
                <div className="flex items-start justify-between gap-3">
                  <Text variant="caption" color="tertiary">{card.label}</Text>
                  <Badge variant="outline">{card.badge}</Badge>
                </div>
                <Text variant="body" weight="semibold" className="mt-3 block">{card.title}</Text>
                <Text variant="body-sm" color="secondary" className="mt-2 line-clamp-3 block">{card.body}</Text>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
