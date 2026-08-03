import { Badge, Card, Heading, Text } from "@/components/ui";
import { listCurrentMonthlyMarketOutlooks } from "@/lib/data/monthly-market-outlook";

function bars(values: { up: number; flat: number; down: number }) {
  return [
    ["上涨", values.up, "bg-emerald-500/75"],
    ["震荡", values.flat, "bg-slate-400/65"],
    ["下跌", values.down, "bg-rose-500/75"],
  ] as const;
}

export function MemberMonthlyPage() {
  const items = listCurrentMonthlyMarketOutlooks();
  return (
    <div className="space-y-7">
      <div>
        <Badge variant="default">会员专享</Badge>
        <Heading as="h1" size="h2" className="mt-3">月度走势分析</Heading>
        <Text variant="body" color="secondary" className="mt-2 block max-w-4xl">
          展示已有原始研究依据的月度方向和运行路径。没有当前有效卦象的项目不会补写结论。
        </Text>
      </div>
      <Card padding="md" className="border-primary/20 bg-primary/[0.025]">
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <span>当前周期：2026年8月</span>
          <span>完整覆盖：9项</span>
          <span>数据覆盖：9/9</span>
        </div>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        {items.map((item) => (
          <Card key={item.assetId} padding="lg" className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Heading as="h2" size="h3">{item.assetName} <span className="text-base font-normal text-foreground-tertiary">{item.symbol}</span></Heading>
                <Text variant="caption" color="tertiary" className="mt-1 block">{item.venue} · {item.periodStart} 至 {item.periodEnd}</Text>
              </div>
              <div className="flex flex-wrap gap-2"><Badge variant={item.direction.includes("跌") || item.direction.includes("回落") ? "warning" : "outline"}>{item.direction}</Badge>{item.volatility === "HIGH" ? <Badge variant="outline">高波动</Badge> : null}</div>
            </div>
            <div className="space-y-2">
              {bars(item.probabilities).map(([label, value, color]) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <span className="w-9 text-foreground-tertiary">{label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className={`h-full ${color}`} style={{ width: `${value}%` }} /></div>
                  <span className="w-10 text-right tabular-nums">{value}%</span>
                </div>
              ))}
            </div>
            <div><Text variant="caption" color="tertiary">运行路径</Text><Text variant="body-sm" className="mt-1 block">{item.path}</Text></div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">重点窗口</Text><Text variant="body-sm" className="mt-1 block">{item.keyWindow}</Text></div>
              <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">主要风险</Text><Text variant="body-sm" className="mt-1 block">{item.risk}</Text></div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
