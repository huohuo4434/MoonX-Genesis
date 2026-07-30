import { AdminNav } from "@/components/admin/AdminNav";
import { AdminSocialContentClient } from "@/components/admin/AdminSocialContentClient";
import { Heading, Section, Text } from "@/components/ui";
import { getBeijingTodayKey } from "@/lib/calendar/beijing-date";
import { listSocialCards, listSocialCardsForDate } from "@/lib/social-cards/store";

export const dynamic = "force-dynamic";

export default async function AdminSocialContentPage() {
  const today = getBeijingTodayKey();
  const [todayCards, all] = await Promise.all([listSocialCardsForDate(today), listSocialCards()]);
  const history = all.filter((c) => c.forecastDate !== today);

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/social" />
        <Heading as="h1" size="h2">
          Social Content
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6">
          每日北京时间 00:10 自动生成社交媒体传播卡片。仅展示公开营销内容，不含会员专享、六爻原文、内部权重与详细路径。
        </Text>
        <AdminSocialContentClient
          initialToday={todayCards}
          initialHistory={history}
          forecastDate={today}
        />
      </Section>
    </main>
  );
}
