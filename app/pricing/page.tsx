import Link from "next/link";
import { Button, Card, Heading, Section, Text } from "@/components/ui";

const internalMonthlyPriceUsdt = 30;

export default function PricingPage() {
  return (
    <main>
      <Section spacing="lg" className="flex flex-col items-center gap-6">
        <div className="max-w-2xl text-center">
          <Heading as="h1" size="display">
            MoonX研究会员
          </Heading>
          <Text variant="body" color="secondary" className="mt-3">
            封闭内测，暂未开放公开购买。
          </Text>
        </div>
        <Card padding="lg" className="max-w-lg">
          <Text variant="body" weight="semibold">
            内测研究权益
          </Text>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-body-sm text-foreground-secondary">
            <li>提前查看下一交易日完整预测</li>
            <li>方向、概率与预计运行路径</li>
            <li>精确支撑、压力与失效条件</li>
            <li>盘中突发事件修正与版本记录</li>
            <li>历史预测验证明细</li>
            <li>完整重点观察池</li>
          </ol>
          <Text variant="caption" color="tertiary" className="mt-4 block">
            内测参考价：{internalMonthlyPriceUsdt} USDT / 30天。支付功能尚未开放；本页不提供付款、钱包连接或自动开通。
          </Text>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild>
              <a href="mailto:moonx@example.com?subject=MoonX%20Beta%20Application">申请内测资格</a>
            </Button>
            <Button asChild variant="outline">
              <Link href="/member/tomorrow">了解明日预测</Link>
            </Button>
          </div>
          <Text variant="caption" color="tertiary" className="mt-4 block">
            MoonX提供结构化研究观点、技术观察与情景推演，不构成针对任何个人的投资建议，不承诺收益，也不保证预测结果。用户应独立判断并承担相应风险。
          </Text>
        </Card>
      </Section>
    </main>
  );
}
