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
          社交内容
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6">
          每日北京时间00:10自动生成公开传播卡片。任务失败会自动重试一次；若仍失败，请在网站诊断中查看错误并手动重建。
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
