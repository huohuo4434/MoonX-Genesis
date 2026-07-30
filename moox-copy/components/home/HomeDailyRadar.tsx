import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { Badge, Button, Card, Text } from "@/components/ui";
import { SectionHeader } from "@/components/home/SectionHeader";
import { getAccessUser } from "@/lib/auth/get-access-user";

type RadarItem = {
  key: string;
  labelZh: string;
  keyWindowLabel: string;
  keyWindowText: string;
  aiMemoryText: string;
};

const RADAR_ITEMS: RadarItem[] = [
  {
    key: "BTC",
    labelZh: "BTC",
    keyWindowLabel: "关键窗口",
    keyWindowText: "关键窗口",
    aiMemoryText: "关注产业周期变化",
  },
  {
    key: "SPX",
    labelZh: "S&P500",
    keyWindowLabel: "关键窗口",
    keyWindowText: "关键窗口",
    aiMemoryText: "关注流动性与风险偏好节奏",
  },
  {
    key: "NDX",
    labelZh: "NASDAQ",
    keyWindowLabel: "关键窗口",
    keyWindowText: "关键窗口",
    aiMemoryText: "关注科技板块估值与盈利预期",
  },
  {
    key: "GLD",
    labelZh: "黄金",
    keyWindowLabel: "重要支撑区域",
    keyWindowText: "重要支撑区域",
    aiMemoryText: "关注美元与通胀路径",
  },
  {
    key: "WTI",
    labelZh: "WTI",
    keyWindowLabel: "重要支撑区域",
    keyWindowText: "重要支撑区域",
    aiMemoryText: "关注油价与宏观定价",
  },
  {
    key: "CXMT",
    labelZh: "长鑫科技",
    keyWindowLabel: "关键窗口",
    keyWindowText: "产业景气观察窗口",
    aiMemoryText: "关注AI存储需求增长与国产替代",
  },
  {
    key: "ASTEROID",
    labelZh: "Asteroid",
    keyWindowLabel: "关键窗口",
    keyWindowText: "社区与流动性窗口",
    aiMemoryText: "关注生态进展与交易渠道变化",
  },
];

export async function HomeDailyRadar() {
  noStore();
  const access = await getAccessUser();
  const isMember = access.isAdmin || access.isActiveMember;

  return (
    <section id="daily-radar" className="border-t border-border/[0.06] py-8 lg:py-12">
      <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="每日追踪" title="MOOX Daily Radar" subtitle="MOOX每日市场雷达" />

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">正在跟踪：</Badge>
          {["BTC", "S&P500", "NASDAQ", "黄金", "WTI", "长鑫科技", "Asteroid"].map((x) => (
            <Badge key={x} variant="outline" className="border-white/15 bg-white/[0.03] text-white/70">
              {x}
            </Badge>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {RADAR_ITEMS.map((item) => (
            <Card key={item.key} padding="lg" className="bg-card">
              <Text variant="body" weight="semibold" className="text-white">
                {item.labelZh}
              </Text>
              <div className="mt-3 space-y-2 text-body-sm text-foreground-secondary">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-white/60">状态：</span>
                  <span className="text-white/85">关注</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-white/60">{item.keyWindowLabel}：</span>
                  <span className="text-white/85">{item.keyWindowText}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-white/60">AI Memory：</span>
                  <span className="text-white/85">{item.aiMemoryText}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-white/60">等待验证：</span>
                  <span className="text-white/85">等待验证</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href={isMember ? "/#moonx-view" : "/pricing"}>查看完整预测</Link>
          </Button>
        </div>

        <Text variant="body-sm" color="secondary" className="mt-4 text-center">
          Radar提供公开追踪窗口，不展示具体会员方向与概率。
        </Text>
      </div>
    </section>
  );
}

