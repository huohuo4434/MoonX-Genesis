import type { Metadata } from "next";
import { Heading, Section, Text } from "@/components/ui";

export const metadata: Metadata = {
  title: "隐私政策 | MoonX",
  description: "MoonX 隐私政策。",
};

export default function PrivacyPage() {
  return (
    <main>
      <Section spacing="lg" className="max-w-2xl">
        <Heading as="h1" size="h2">
          隐私政策
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-4 space-y-4">
          <span className="block">
            MoonX（以下简称「我们」）重视您的隐私。本政策说明我们如何收集、使用和保护您的个人信息。
          </span>
          <span className="block font-medium text-foreground">我们收集的信息</span>
          <span className="block">
            当您使用邮箱登录时，我们收集您的电子邮箱地址用于身份验证和账户管理。支付订单记录包含订单号、链上交易哈希和会员状态，用于完成会员开通。
          </span>
          <span className="block font-medium text-foreground">信息使用</span>
          <span className="block">
            您的邮箱仅用于登录验证、订单通知和会员服务。我们不会出售您的个人信息。
          </span>
          <span className="block font-medium text-foreground">数据安全</span>
          <span className="block">
            账户数据存储在 Supabase 加密数据库中。我们不会存储钱包私钥、助记词或密码。
          </span>
          <span className="block font-medium text-foreground">联系我们</span>
          <span className="block">
            如有隐私相关问题，请联系：jackzwin999@gmail.com
          </span>
        </Text>
      </Section>
    </main>
  );
}
