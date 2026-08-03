import type { Metadata } from "next";
import { Heading, Section, Text } from "@/components/ui";
import { PAID_MEMBER_BENEFITS, PAID_MEMBER_LABEL } from "@/lib/presentation/membership-benefits";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = { title: "服务条款", description: "MOOX 服务条款：会员权益、USDT付款与人工审核说明。" };
const UPDATED = "2026年8月3日";

export default function TermsPage() {
  return <main><Section spacing="lg" className="mx-auto max-w-2xl">
    <Heading as="h1" size="h2">服务条款</Heading>
    <Text variant="body-sm" color="secondary" className="mt-3 block">使用MOOX服务，即表示您同意以下条款。</Text>
    <div className="mt-8 space-y-8 text-body-sm text-foreground-secondary">
      <section className="space-y-2"><h2 className="text-body font-semibold text-foreground">服务性质</h2><p>MOOX提供市场方向、概率、运行路径、关键价位与验证记录等研究内容，仅供参考，不构成投资建议、交易建议或收益保证。历史表现不代表未来结果。</p></section>
      <section className="space-y-2"><h2 className="text-body font-semibold text-foreground">{PAID_MEMBER_LABEL}权益</h2><ul className="list-disc space-y-1 pl-5">{PAID_MEMBER_BENEFITS.map((item)=><li key={item}>{item}</li>)}</ul></section>
      <section className="space-y-2"><h2 className="text-body font-semibold text-foreground">付款与审核</h2><p>请选择套餐，使用USDT（TRC20或BEP20）转账至付款页面显示的指定地址并提交交易哈希。提交后进入待核验与人工审核流程；提交哈希不等于审核通过，审核通过后会员权限才会生效。</p></section>
      <section className="space-y-2"><h2 className="text-body font-semibold text-foreground">错误网络、币种与退款</h2><p>请在付款前核对网络、币种、金额与收款地址。链上转账通常不可撤销；因用户填错地址、选错网络或币种导致的损失，MOOX无法保证追回。</p></section>
      <section className="space-y-2"><h2 className="text-body font-semibold text-foreground">账户与设备</h2><p>您有责任保管登录邮箱与密码。付费内容仅供本人使用；为防止账号共享，系统可限制绑定设备数量及同一时间使用付费内容的设备数量。账户页会提供设备查看与移除入口。</p></section>
      <section className="space-y-2"><h2 className="text-body font-semibold text-foreground">禁止共享与转载</h2><p>禁止共享、转售、公开转发、批量复制或爬取付费内容，也不得通过修改客户端或接口数据获取未授权权限。</p></section>
      <section className="space-y-2"><h2 className="text-body font-semibold text-foreground">服务中断与风险</h2><p>我们尽力保持服务可用，但不对因维护、第三方故障或不可抗力导致的短暂中断承担责任。金融市场存在风险，用户应独立判断并承担决策后果。</p></section>
      <section className="space-y-2"><h2 className="text-body font-semibold text-foreground">联系方式</h2><p>客服邮箱：{siteConfig.supportEmail}</p><p>最后更新：{UPDATED}</p></section>
    </div>
  </Section></main>;
}
