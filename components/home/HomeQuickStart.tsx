import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";
import { getCurrentUser, isActiveMember, isAdmin } from "@/lib/auth/permissions";
import { getTodayForecastAccessPayload } from "@/lib/prediction-access-server";
import { getWeeklySectionPayload } from "@/lib/data/weekly-analysis-access";
import { getAiTradePlanDashboard } from "@/lib/trading-signals/ai-trade-plans";
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
  const [todayResult, weeklyResult, aiResult] = await Promise.allSettled([
    getTodayForecastAccessPayload(now),
    getWeeklySectionPayload(now),
    getAiTradePlanDashboard(now),
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
    label: en ? "Current weekly stage" : "本周所处阶段",
    title: en ? "Open the weekly outlook" : "查看本周整体路径",
    body: en ? "Daily views are easier to use inside the weekly context." : "日度判断最好放在周度背景中理解。",
    href: "/member/weekly",
    badge: en ? "Weekly" : "周度",
  };

  if (weeklyResult.status === "fulfilled" && weeklyResult.value.mode === "member") {
    const published = weeklyResult.value.slots
      .flatMap((slot) => slot.kind === "published" ? [slot.analysis] : [])
      .sort((a, b) => b.confidence - a.confidence)[0];
    if (published) {
      weeklyCard = {
        label: en ? "Current weekly stage" : "本周所处阶段",
        title: en
          ? `${assetNameEn(published.assetName)} · ${directionEn(published.overallDirection)}`
          : `${published.assetName} · ${published.overallDirection}`,
        body: en
          ? safeEnglish(firstText([published.weeklyPath, published.headline], "Read the full weekly path."), "Read the full weekly path.")
          : firstText([published.weeklyPath, published.headline], "进入周度页查看完整运行顺序。"),
        href: "/member/weekly",
        badge: `${published.confidence}%`,
      };
    }
  }

  let aiCard: QuickCard = {
    label: en ? "AI trading status" : "AI当前是否准备交易",
    title: en ? "No confirmed entry yet" : "暂未确认入场",
    body: en ? "The system will keep watching instead of forcing an order." : "系统继续观察，不会为了有单而强行下单。",
    href: "/member/ai-trading",
    badge: en ? "Watching" : "观察中",
  };

  if (aiResult.status === "fulfilled") {
    const priority = ["OPEN", "PARTIALLY_FILLED", "ORDER_SUBMITTED", "ARMED", "WATCHING", "PUBLISHED"];
    const plan = aiResult.value.plans
      .filter((item) => priority.includes(item.status))
      .sort((a, b) => priority.indexOf(a.status) - priority.indexOf(b.status))[0];
    if (plan) {
      const statusMap: Record<string, [string, string]> = {
        OPEN: ["持仓中", "Open"],
        PARTIALLY_FILLED: ["部分成交", "Partially filled"],
        ORDER_SUBMITTED: ["已提交订单", "Order submitted"],
        ARMED: ["条件接近", "Armed"],
        WATCHING: ["等待确认", "Watching"],
        PUBLISHED: ["计划已发布", "Published"],
      };
      aiCard = {
        label: en ? "AI trading status" : "AI当前是否准备交易",
        title: `${plan.symbol} · ${plan.direction === "LONG" ? (en ? "Long" : "做多") : plan.direction === "SHORT" ? (en ? "Short" : "做空") : (en ? "Wait" : "观望")}`,
        body: en
          ? safeEnglish(firstText([plan.thesisSummary, plan.triggerRule], "Open the Strategy Desk for entry, stop and targets."), "Open the Strategy Desk for entry, stop and targets.")
          : firstText([plan.thesisSummary, plan.triggerRule], "进入交易台查看入场、止损和止盈条件。"),
        href: "/member/ai-trading",
        badge: statusMap[plan.status]?.[en ? 1 : 0] ?? plan.status,
      };
    }
  }

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
