import { AdminNav } from "@/components/admin/AdminNav";
import { TradingTerminalClient } from "@/components/admin/TradingTerminalClient";
import { Heading, Section, Text } from "@/components/ui";
import { getTradingV2Snapshot } from "@/lib/trading-signals/v2-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminTradingTerminalPage() {
  const snapshot = await getTradingV2Snapshot();
  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/trading-terminal" />
        <Heading as="h1" size="h2">
          MOOX 模拟交易
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6 max-w-4xl">
          把正式预测转换成交易草稿，锁定入场、止损、分批止盈和仓位纪律；价格触发后只在模拟账户执行。已发布计划不能覆盖，只能生成新版本。
        </Text>
        <TradingTerminalClient initial={snapshot} />
      </Section>
    </main>
  );
}
