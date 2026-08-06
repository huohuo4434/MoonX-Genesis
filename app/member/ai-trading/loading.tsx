import { Card, Section, Text } from "@/components/ui";

export default function AiTradingDeskLoading() {
  return (
    <main>
      <Section spacing="lg">
        <Card padding="lg" className="animate-pulse border-primary/20 bg-primary/[0.02]">
          <Text variant="body" weight="semibold">AI交易公开台正在打开</Text>
          <Text variant="body-sm" color="secondary" className="mt-2 block">
            页面骨架会先显示，最近一次服务器快照随后加载；不会再因为Bitget或数据库短暂延迟而整页空白。
          </Text>
        </Card>
      </Section>
    </main>
  );
}
