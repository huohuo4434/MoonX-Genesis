import { AdminNav } from "@/components/admin/AdminNav";
import { Card, Heading, Text } from "@/components/ui";
import { SignalDbSetupClient } from "@/components/admin/SignalDbSetupClient";
import { SIGNAL_DB_SETUP_SQL } from "@/lib/trading-signals/setup-sql";

export const dynamic = "force-dynamic";

export default function TradingSignalSetupPage() {
  return (
    <main className="mx-auto w-full max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <AdminNav current="/admin/trading-signals/setup" />
      <Heading as="h1" size="h2" className="mb-2">
        交易信号数据库设置
      </Heading>
      <Text variant="body-sm" color="secondary" className="mb-6 max-w-4xl">
        API地址本身是正确的；当前黄色提示表示交易信号专用数据库尚未建立或Vercel没有DATABASE_URL。先执行下面SQL，再在Vercel配置DATABASE_URL，信号保存和API密钥才会真正生效。
      </Text>
      <Card padding="lg">
        <SignalDbSetupClient sql={SIGNAL_DB_SETUP_SQL} />
      </Card>
    </main>
  );
}
