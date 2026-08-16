"use client";

import { Heading, Section, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function PrivacyPageClient({ supportEmail }: { supportEmail: string }) {
  const { locale } = useLocale();
  const en = locale === "en";
  return (
    <main>
      <Section spacing="lg" className="mx-auto max-w-2xl">
        <Heading as="h1" size="h2">{en ? "Privacy policy" : "隐私政策"}</Heading>
        <Text variant="body-sm" color="secondary" className="mt-3 block">
          {en ? "MOOX values your privacy. This policy explains how account, payment and service information is used and protected." : "MOOX重视您的隐私。本政策说明我们如何收集、使用和保护与您账户及服务相关的信息。"}
        </Text>
        <div className="mt-8 space-y-8 text-body-sm text-foreground-secondary">
          <section className="space-y-2"><h2 className="text-body font-semibold text-foreground">{en ? "1. Information we collect" : "1. 我们收集哪些信息"}</h2><ul className="list-disc space-y-1 pl-5">{(en ? ["Email used for registration and sign-in", "Membership plan, status and expiry", "Order number, USDT network, transaction hash and review status", "Basic operational and security logs, never plaintext passwords", "Server-generated device credential hash and coarse browser/system labels"] : ["注册与登录使用的电子邮箱地址", "会员套餐、到期时间与会员状态", "付款订单号、USDT网络、交易哈希与审核状态", "基础运行与安全日志，不含密码明文", "服务器生成的设备凭证哈希和大致的浏览器和系统类型／系统名称"]).map((item)=><li key={item}>{item}</li>)}</ul></section>
          <section className="space-y-2"><h2 className="text-body font-semibold text-foreground">{en ? "2. How information is used" : "2. 信息如何使用"}</h2><ul className="list-disc space-y-1 pl-5">{(en ? ["Authentication and account management", "Membership activation, renewal and verification", "Order and membership service notifications", "Site reliability, fraud prevention and account security"] : ["完成身份验证与账户管理", "开通、续期与核验会员权限", "发送订单与会员状态相关通知", "改进站点稳定性、防滥用与账户安全"]).map((item)=><li key={item}>{item}</li>)}</ul><p>{en ? "We do not sell personal information." : "我们不会出售您的个人信息。"}</p></section>
          <section className="space-y-2"><h2 className="text-body font-semibold text-foreground">{en ? "3. Authentication and devices" : "3. 账户和登录设备"}</h2><p>{en ? "Authentication is handled by a trusted provider. MOOX does not store or read plaintext passwords. Device controls do not collect Canvas or hardware fingerprints and do not ban users solely by a fixed IP." : "账户认证由受托服务处理，MOOX不保存或读取明文密码。设备控制不采集Canvas或硬件指纹，也不会仅按固定IP封禁用户。"}</p></section>
          <section className="space-y-2"><h2 className="text-body font-semibold text-foreground">{en ? "4. Payment data" : "4. 付款数据"}</h2><p>{en ? "For automatic verification and exception handling, we store the plan, list price, exact order amount, discount snapshot, order status, network, transaction hash and public on-chain transfer details. We never request wallet private keys or seed phrases." : "为完成自动核验及异常处理，我们会保存套餐、标价、订单精确金额、折扣快照、订单状态、网络、交易哈希和公开链上转账信息。我们不会索取钱包私钥或助记词。"}</p></section>
          <section className="space-y-2"><h2 className="text-body font-semibold text-foreground">{en ? "5. Third-party services" : "5. 第三方服务"}</h2><p>{en ? "We may use trusted providers for authentication and storage, cloud hosting and delivery, transactional email and public market data." : "我们可能使用受托的账户认证与存储、云托管与内容分发、事务性邮件和公开市场行情服务。"}</p></section>
          <section className="space-y-2"><h2 className="text-body font-semibold text-foreground">{en ? "6. Retention and your rights" : "6. 保存期限与用户权利"}</h2><p>{en ? "Records are retained for operational and legal needs. You may contact us to request access to or correction of account information related to you." : "账户与订单记录会在业务及法律需要期间保留。您可联系我们申请查阅或更正与本人相关的账户信息。"}</p></section>
          <section className="space-y-2"><h2 className="text-body font-semibold text-foreground">{en ? "7. Security" : "7. 数据安全"}</h2><p>{en ? "We use reasonable technical and administrative safeguards, but no online system can guarantee absolute security. Keep your credentials secure." : "我们采取合理的技术与管理措施保护数据，但任何在线系统都无法保证绝对安全，请妥善保管登录凭证。"}</p></section>
          <section className="space-y-2"><h2 className="text-body font-semibold text-foreground">{en ? "8. Member consultation data" : "8. 会员咨询资料"}</h2><p>{en ? "With explicit consent, consultation inputs and drafts are encrypted at rest and processed with AI assistance before review by the designated primary reviewer. Pre-approval drafts are not delivered. After a terminal decision you may request deletion of private inputs and responses; minimal quota and audit records remain for integrity and legal obligations." : "在您明确同意后，咨询输入与草稿会加密保存，并由MOOX研究系统辅助整理，再由指定主理人复核。未批准草稿不会向会员交付。申请进入终态后，您可以请求删除私密输入和答复；为防止权益重复及履行必要审计义务，最小化的权益与审计记录会继续保留。"}</p></section>
          <section className="space-y-2"><h2 className="text-body font-semibold text-foreground">{en ? "9. Contact" : "9. 联系方式"}</h2><p>{en ? "Privacy questions" : "隐私问题"}：{supportEmail}</p><p>{en ? "Last updated: Aug 15, 2026" : "最后更新：2026年8月15日"}</p></section>
        </div>
      </Section>
    </main>
  );
}
