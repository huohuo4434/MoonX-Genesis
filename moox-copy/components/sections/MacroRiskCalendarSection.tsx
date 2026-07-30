import { Card, Section, Text } from "@/components/ui";

const events = [
  ["7月28日至29日", "美联储FOMC会议", "高"],
  ["7月30日", "英国央行利率决议及货币政策报告", "高"],
  ["7月30日", "美国二季度GDP初值", "高"],
  ["7月30日", "美国6月个人收入与支出及核心PCE", "高"],
  ["7月30日至31日", "日本央行货币政策会议", "高"],
  ["7月31日", "东京7月CPI初值", "中"],
] as const;

export function MacroRiskCalendarSection() {
  return (
    <Section spacing="sm" className="border-t border-border/[0.06]">
      <div className="mb-4"><Text variant="label" color="secondary">本周宏观风险日历</Text><Text variant="body" weight="semibold">本周超级宏观周：央行决议、GDP与通胀验证</Text><Text variant="body-sm" color="secondary">本周关键不只是央行是否调整利率，而是政策措辞、通胀性质判断及数据结果相对于市场预期的偏差。</Text></div>
      <div className="grid gap-2 md:grid-cols-2">{events.map(([date, name, risk]) => <Card key={name} padding="sm" className="flex items-center justify-between gap-2"><div><Text variant="caption" color="tertiary">{date}</Text><Text variant="body-sm">{name}</Text></div><Text variant="caption" color="secondary">{risk}风险</Text></Card>)}</div>
      <Text variant="caption" color="tertiary" className="mt-3 block">高波动事件期间优先控制风险，等待市场完成第一轮定价后再判断方向是否得到确认。</Text>
    </Section>
  );
}
