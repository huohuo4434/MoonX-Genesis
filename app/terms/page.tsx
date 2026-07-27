import type { Metadata } from "next";
import { Heading, Section, Text } from "@/components/ui";

export const metadata: Metadata = {
  title: "服务条款 | MoonX",
  description: "MoonX 服务条款。",
};

export default function TermsPage() {
  return (
    <main>
      <Section spacing="lg" className="max-w-2xl">
        <Heading as="h1" size="h2">
          服务条款
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-4 space-y-4">
          <span className="block">
            使用 MoonX 研究会员服务，即表示您同意以下条款。
          </span>
          <span className="block font-medium text-foreground">研究内容性质</span>
          <span className="block">
            MoonX 提供的预测、研究和分析内容仅供信息参考，不构成投资建议、交易建议或收益保证。历史验证记录不代表未来结果。
          </span>
          <span className="block font-medium text-foreground">会员服务</span>
          <span className="block">
            会员通过链上 USDT 支付开通。付款后系统自动核验链上交易；少付、错链、错币种或无法唯一匹配的付款可能进入人工审核。链上转账不可撤销，请在付款前仔细核对网络、币种和收款地址。
          </span>
          <span className="block font-medium text-foreground">账户与到期</span>
          <span className="block">
            会员到期后权限自动关闭，账户和历史订单记录保留。不得通过修改客户端数据获取会员权限。
          </span>
          <span className="block font-medium text-foreground">联系我们</span>
          <span className="block">
            如有服务相关问题，请联系：jackzwin999@gmail.com
          </span>
        </Text>
      </Section>
    </main>
  );
}
