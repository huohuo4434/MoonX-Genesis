"use client";

import { Heading, Section, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const BENEFITS_ZH = [
  "全天提前查看当日完整预测与下一交易日观点",
  "唯一方向、完整情景权重、运行路径、关键价位与技术风控参考",
  "周度、月度趋势及六爻、奇门、技术分析依据",
  "重点资产完整研究、AI交易台与会员交易信号",
];
const BENEFITS_EN = [
  "Early access to full daily and next-session forecasts",
  "Full probabilities, expected path, key levels, confirmation and invalidation",
  "Weekly and monthly outlooks with Liu Yao, Qimen Dunjia and technical structure",
  "Full Research Watchlist coverage, AI Strategy Desk and member signals",
];

export function TermsPageClient({ supportEmail }: { supportEmail: string }) {
  const { locale } = useLocale();
  const en = locale === "en";
  const benefits = en ? BENEFITS_EN : BENEFITS_ZH;
  return (
    <main>
      <Section spacing="lg" className="mx-auto max-w-2xl">
        <Heading as="h1" size="h2">{en ? "Terms of service" : "服务条款"}</Heading>
        <Text variant="body-sm" color="secondary" className="mt-3 block">
          {en ? "By using MOOX, you agree to the following terms." : "使用MOOX服务，即表示您同意以下条款。"}
        </Text>
        <div className="mt-8 space-y-8 text-body-sm text-foreground-secondary">
          <section className="space-y-2"><h2 className="text-body font-semibold text-foreground">{en ? "Nature of the service" : "服务性质"}</h2><p>{en ? "MOOX provides research on market direction, scenario weights, expected paths, key levels and verification records. It is not investment advice, trading advice or a return guarantee. Past performance does not predict future results." : "MOOX提供市场方向、情景权重、运行路径、关键价位与验证记录等研究内容，仅供参考，不构成投资建议、交易建议或收益保证。历史表现不代表未来结果。"}</p></section>
          <section className="space-y-2"><h2 className="text-body font-semibold text-foreground">{en ? "Paid-member benefits" : "付费会员权益"}</h2><ul className="list-disc space-y-1 pl-5">{benefits.map((item)=><li key={item}>{item}</li>)}</ul></section>
          <section className="space-y-2"><h2 className="text-body font-semibold text-foreground">{en ? "Prices and founding-member offer" : "价格与创始会员优惠"}</h2><p>{en ? "List prices remain 80 USDT monthly, 200 USDT quarterly and 700 USDT annually. Existing founding benefits (20% off for ranks 1–10 and 10% for ranks 11–50) remain subject to eligibility and continuity review, account-bound, non-transferable and non-stackable. Before expiry, contact support to confirm renewal eligibility, rank and amount. Manual checkout does not reserve an online renewal order or automatically assign a rank; reference quotes are not final confirmation." : "标准价格仍为月度80 USDT、季度200 USDT、年度700 USDT。既有创始会员权益（前10名8折、第11至50名9折）保留并按资格及连续性核查，仅限本人账户、不可转让和叠加。请在到期前联系客服确认续费资格、名次及金额；人工付款页不预留线上续费订单、不自动分配名次，参考报价不等于最终确认。"}</p></section>
          <section className="space-y-2"><h2 className="text-body font-semibold text-foreground">{en ? "Payment and manual verification" : "付款与人工核验"}</h2><p>{en ? "Confirm the plan with support before transferring on an enabled network to the displayed receiving address. After payment, send your registered email, plan, network and TXID to Telegram @jackuwin. An administrator verifies actual receipt before activation; opening Telegram or submitting a claim does not grant membership. Existing orders are retained. New online consultations are paused; contact support about existing consultation benefits and outstanding requests." : "转账前向客服确认套餐，使用当前启用的网络和页面收款地址。付款后将注册邮箱、套餐、网络和 TXID 发给 Telegram @jackuwin，由管理员核实实际到账后开通。打开电报或自称已付款不会授予会员。历史订单保留；在线咨询暂停新申请，既有咨询权益和未完成申请请联系客服核查处理。"}</p></section>
          <section className="space-y-2"><h2 className="text-body font-semibold text-foreground">{en ? "Wrong network, token and refunds" : "错误网络、币种与退款"}</h2><p>{en ? "Check the network, token, amount and destination before payment. Blockchain transfers are usually irreversible, and MOOX cannot guarantee recovery of funds sent to the wrong address, network or token." : "请在付款前核对网络、币种、金额与收款地址。链上转账通常不可撤销；因用户填错地址、选错网络或币种导致的损失，MOOX无法保证追回。"}</p></section>
          <section className="space-y-2"><h2 className="text-body font-semibold text-foreground">{en ? "Account and devices" : "账户与设备"}</h2><p>{en ? "You are responsible for your email and password. Paid content is for the account holder only. The system may limit linked devices and concurrent use, with device management available in the account area." : "您有责任保管登录邮箱与密码。付费内容仅供本人使用；为防止账号共享，系统可限制绑定设备数量及同一时间使用付费内容的设备数量。账户页会提供设备查看与移除入口。"}</p></section>
          <section className="space-y-2"><h2 className="text-body font-semibold text-foreground">{en ? "No sharing or redistribution" : "禁止共享与转载"}</h2><p>{en ? "You may not share, resell, publicly redistribute, bulk-copy or scrape paid content, or bypass access controls by modifying client or API data." : "禁止共享、转售、公开转发、批量复制或爬取付费内容，也不得通过修改客户端或接口数据获取未授权权限。"}</p></section>
          <section className="space-y-2"><h2 className="text-body font-semibold text-foreground">{en ? "Availability and risk" : "服务中断与风险"}</h2><p>{en ? "We aim to keep the service available but are not responsible for brief interruptions caused by maintenance, third parties or force majeure. Financial markets involve risk; users remain responsible for their decisions." : "我们尽力保持服务可用，但不对因维护、第三方故障或不可抗力导致的短暂中断承担责任。金融市场存在风险，用户应独立判断并承担决策后果。"}</p></section>
          <section className="space-y-2"><h2 className="text-body font-semibold text-foreground">{en ? "Contact" : "联系方式"}</h2><p>{en ? `Support: ${supportEmail}` : `客服邮箱：${supportEmail}`}</p><p>{en ? "Last updated: Aug 3, 2026" : "最后更新：2026年8月3日"}</p></section>
        </div>
      </Section>
    </main>
  );
}
