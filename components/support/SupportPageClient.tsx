"use client";

import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const FAQ_ZH = [
  ["预测什么时候更新？", "日度、下一交易日、周度和月度页面会分别标明目标时段、发布时间及数据状态。休市市场不生成虚假的当日验证。"],
  ["为什么显示观望或等待确认？", "方向研究不等于立即交易。只有价格、结构和失效条件完整时，系统才生成模拟交易计划。"],
  ["USDT付款后多久开通？", "生成订单并提交交易哈希后，系统立即核验，并由 Vercel 每分钟自动重试。链上确认后自动开通；通常无需人工审核。"],
  ["历史准确率如何计算？", "只统计已到验证截止时间、取得真实行情且结论已锁定的记录；同时展示样本量、完整命中、部分命中、未命中和不可验证。"],
] as const;

const FAQ_EN = [
  ["When are forecasts updated?", "Daily, next-session, weekly and monthly pages show their target window, publication time and data status. Closed markets are not given fake same-day verification records."],
  ["Why does a forecast say wait or confirmation required?", "A directional view is not an immediate trade. A simulated plan appears only when price, structure and invalidation conditions are complete."],
  ["How long does USDT activation take?", "After the transaction hash is submitted, verification starts immediately and Vercel retries every minute. Confirmed payments activate automatically; manual review is only for exceptions."],
  ["How is historical accuracy calculated?", "Only locked records whose verification window has ended and whose real market data is available are counted. Sample size, full hits, partial hits, misses and unverifiable records remain visible."],
] as const;

export function SupportPageClient({
  telegram,
  supportEmail,
}: {
  telegram: string;
  supportEmail: string;
}) {
  const { locale } = useLocale();
  const en = locale === "en";
  const faq = en ? FAQ_EN : FAQ_ZH;

  return (
    <main>
      <Section spacing="lg">
        <div className="mx-auto max-w-4xl space-y-6">
          <div>
            <Badge variant="outline">{en ? "Support" : "客服中心"}</Badge>
            <Heading as="h1" size="h2" className="mt-3">
              {en ? "Get help through the right channel" : "有问题，直接找到正确入口"}
            </Heading>
            <Text variant="body" color="secondary" className="mt-3 block">
              {en
                ? "Never send API keys, wallet private keys or full identity documents on a public page."
                : "请勿在公开页面发送API密钥、钱包私钥或完整身份证明。"}
            </Text>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card padding="lg">
              <Heading as="h2" size="h3">{en ? "Live support" : "即时客服"}</Heading>
              <a className="mt-4 flex min-h-11 items-center text-primary" href="https://t.me/jackuwin" target="_blank" rel="noreferrer">
                Telegram {telegram}
              </a>
              <Text variant="caption" color="tertiary" className="mt-2 block">
                {en ? "For account, page and urgent delivery issues." : "适合账户、页面与紧急交付问题。"}
              </Text>
            </Card>
            <Card padding="lg">
              <Heading as="h2" size="h3">{en ? "Email" : "联系邮箱"}</Heading>
              <div className="mt-4 text-body-sm"><p><a className="text-primary" href={`mailto:${supportEmail}`}>{supportEmail}</a></p></div>
              <Text variant="caption" color="tertiary" className="mt-3 block">
                {en ? "For general support, billing and privacy requests." : "统一用于一般支持、账务付款和隐私请求。"}
              </Text>
            </Card>
          </div>
          <div>
            <Heading as="h2" size="h3">{en ? "Frequently asked questions" : "常见问题"}</Heading>
            <div className="mt-4 space-y-3">
              {faq.map(([q, a]) => (
                <details key={q} className="rounded-xl border border-border/[0.1] p-4">
                  <summary className="min-h-11 cursor-pointer font-medium">{q}</summary>
                  <p className="mt-2 text-body-sm text-foreground-secondary">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </Section>
    </main>
  );
}
