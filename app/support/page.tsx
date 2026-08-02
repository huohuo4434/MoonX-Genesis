import type { Metadata } from "next";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = { title: "客服与帮助", description: "MOOX会员、付款、预测解释与账户问题帮助。", alternates: { canonical: "/support" } };

const FAQ = [
  ["预测什么时候更新？", "日度、下一交易日、周度和月度页面会分别标明目标时段、发布时间及数据状态。休市市场不生成虚假的当日验证。"],
  ["为什么显示观望或等待确认？", "方向研究不等于立即交易。只有价格、结构和失效条件完整时，系统才生成模拟交易计划。"],
  ["USDT付款后多久开通？", "提交交易哈希后进入链上确认与人工复核。页面会保留订单状态；遇到通知失败可联系账务客服。"],
  ["历史准确率如何计算？", "只统计已到验证截止时间、取得真实行情且结论已锁定的记录；同时展示样本量、完整命中、部分命中、未命中和不可验证。"],
];

export default function SupportPage() {
  return <main><Section spacing="lg"><div className="mx-auto max-w-4xl space-y-6">
    <div><Badge variant="outline">客服中心</Badge><Heading as="h1" size="h2" className="mt-3">有问题，直接找到正确入口</Heading><Text variant="body" color="secondary" className="mt-3 block">请勿在公开页面发送API密钥、钱包私钥或完整身份证明。</Text></div>
    <div className="grid gap-4 md:grid-cols-2">
      <Card padding="lg"><Heading as="h2" size="h3">即时客服</Heading><a className="mt-4 flex min-h-11 items-center text-primary" href="https://t.me/jackuwin" target="_blank" rel="noreferrer">Telegram {siteConfig.telegram}</a><Text variant="caption" color="tertiary" className="mt-2 block">适合账户、页面与紧急交付问题。</Text></Card>
      <Card padding="lg"><Heading as="h2" size="h3">邮件分类</Heading><div className="mt-4 space-y-3 text-body-sm"><p>一般支持：<a className="text-primary" href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a></p><p>账务付款：<a className="text-primary" href={`mailto:${siteConfig.billingEmail}`}>{siteConfig.billingEmail}</a></p><p>隐私请求：<a className="text-primary" href={`mailto:${siteConfig.privacyEmail}`}>{siteConfig.privacyEmail}</a></p></div><Text variant="caption" color="tertiary" className="mt-3 block">域名邮箱需在Vercel与邮件服务中配置后才可收发。</Text></Card>
    </div>
    <div><Heading as="h2" size="h3">常见问题</Heading><div className="mt-4 space-y-3">{FAQ.map(([q,a]) => <details key={q} className="rounded-xl border border-border/[0.1] p-4"><summary className="min-h-11 cursor-pointer font-medium">{q}</summary><p className="mt-2 text-body-sm text-foreground-secondary">{a}</p></details>)}</div></div>
  </div></Section></main>;
}
