import { Badge, Card, Text } from "@/components/ui";

export function AiDeskQuickNav({
  en,
  planCount,
  positionCount,
  tradeCount,
  experimentDay,
}: {
  en: boolean;
  planCount: number;
  positionCount: number;
  tradeCount: number;
  experimentDay: number;
}) {
  const items = [
    {
      href: "#plans",
      title: en ? "Current plans" : "当前计划",
      value: planCount,
      detail: en ? "Direction, entry, stop and targets" : "方向、入场、止损与目标",
    },
    {
      href: "#positions",
      title: en ? "Open positions" : "真实持仓",
      value: positionCount,
      detail: en ? "Positions already executed" : "已经由交易所执行的仓位",
    },
    {
      href: "#trades",
      title: en ? "Completed trades" : "最近结束交易",
      value: tradeCount,
      detail: en ? "Closed results and review" : "已结束结果与复盘",
    },
    {
      href: "#performance",
      title: en ? "30-day experiment" : "30天实验成绩",
      value: experimentDay,
      detail: en ? "Daily PnL and drawdown" : "每日盈亏与最大回撤",
    },
  ];

  return (
    <Card padding="md" className="border-primary/20 bg-primary/[0.025]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Text variant="body-sm" weight="semibold">{en ? "Member quick navigation" : "会员只需要看这四块"}</Text>
        <Badge variant="outline">{en ? "Simple view" : "简洁模式"}</Badge>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <a key={item.href} href={item.href} className="rounded-lg border border-border/[0.08] p-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.02]">
            <div className="flex items-center justify-between gap-2">
              <Text variant="body-sm" weight="semibold">{item.title}</Text>
              <Badge variant="outline">{item.value}</Badge>
            </div>
            <Text variant="caption" color="secondary" className="mt-1 block">{item.detail}</Text>
          </a>
        ))}
      </div>
    </Card>
  );
}
