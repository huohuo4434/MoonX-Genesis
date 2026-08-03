import type { Metadata } from "next";
import { Heading, Section, Text } from "@/components/ui";

export const metadata: Metadata = {
  title: "隐私政策",
  description: "MOOX 隐私政策：账户、付款与第三方服务说明。",
};

const UPDATED = "2026年7月29日";

export default function PrivacyPage() {
  return (
    <main>
      <Section spacing="lg" className="mx-auto max-w-2xl">
        <Heading as="h1" size="h2">
          隐私政策
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-3 block">
          MOOX（以下简称「我们」）重视您的隐私。本政策说明我们如何收集、使用和保护与您账户及服务相关的信息。
        </Text>

        <div className="mt-8 space-y-8 text-body-sm text-foreground-secondary">
          <section className="space-y-2">
            <h2 className="text-body font-semibold text-foreground">1. 我们收集哪些信息</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>注册与登录使用的电子邮箱地址</li>
              <li>会员套餐、到期时间与会员状态</li>
              <li>付款订单号、USDT 网络、交易哈希与审核状态</li>
              <li>为保障服务运行所需的基础技术日志（不含密码明文）</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-foreground">2. 信息如何使用</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>完成身份验证与账户管理</li>
              <li>开通、续期与核验会员权限</li>
              <li>发送与订单、会员状态相关的服务通知</li>
              <li>改进站点稳定性与安全防护</li>
            </ul>
            <p>我们不会出售您的个人信息。</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-foreground">3. 账户和登录数据</h2>
            <p>
              账户认证由受托认证服务处理，MOOX 应用程序不会保存或读取用户明文密码。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-foreground">4. 付款及交易哈希</h2>
            <p>
              为完成人工审核，我们会保存您提交的订单信息、收款网络、交易哈希、金额与处理结果。我们不收集钱包私钥或助记词。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-foreground">5. 第三方服务</h2>
            <p>为提供服务，我们可能使用：</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>账户认证与数据存储服务商</li>
              <li>云托管与内容分发服务商</li>
              <li>事务性邮件服务商</li>
              <li>市场行情服务（公开市场数据）</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-foreground">6. 数据保存期限</h2>
            <p>
              账户与订单记录在业务需要及法律要求期间保留。您可联系我们申请查阅或更正与本人相关的账户信息。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-foreground">7. 用户权利</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>查阅与本人账户相关的基本信息</li>
              <li>更正不准确的联系邮箱（在可行范围内）</li>
              <li>就隐私问题提出询问或投诉</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-foreground">8. 数据安全</h2>
            <p>
              我们采取合理的技术与管理措施保护数据。任何在线系统都无法保证绝对安全，请妥善保管您的登录凭证。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-foreground">9. 联系方式</h2>
            <p>如有隐私相关问题，请联系：jackzwin999@gmail.com</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-foreground">10. 最后更新时间</h2>
            <p>{UPDATED}</p>
          </section>
        </div>
      </Section>
    </main>
  );
}
