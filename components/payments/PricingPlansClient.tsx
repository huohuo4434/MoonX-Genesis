"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Card, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import {
  PLAN_DISPLAY,
  PLAN_PURCHASE_LABEL,
} from "@/lib/payments/plan-display";
import {
  PLAN_LABELS_EN,
  PLAN_LABELS_ZH,
  OFFICIAL_PLAN_PRICES,
  discountedPrice,
  type FounderDiscountQuote,
} from "@/lib/payments/founder-discount-shared";
import type { MembershipPlan } from "@/types/membership";

function CopyAddress({ label, address }: { label: string; address: string }) {
  const [copied, setCopied] = useState(false);
  const { locale } = useLocale();
  const english = locale === "en";
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/[0.08] bg-muted/20 p-3">
      <Text variant="body-sm" weight="semibold" className="block">
        {label}
      </Text>
      <p className="text-caption text-foreground-tertiary">
        {english ? "Receiving address" : "收款地址"}
      </p>
      <p className="break-all font-mono text-caption text-foreground-secondary">{address}</p>
      <div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(address);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? (english ? "Copied" : "已复制") : english ? "Copy address" : "复制地址"}
        </Button>
      </div>
    </div>
  );
}

export function PricingPlansClient({
  plans,
  supportEmail,
  trc20Address,
  bep20Address,
  isLoggedIn,
  founderQuote,
}: {
  plans: MembershipPlan[];
  supportEmail: string;
  trc20Address: string;
  bep20Address: string;
  isLoggedIn: boolean;
  founderQuote: FounderDiscountQuote;
}) {
  const { locale } = useLocale();
  const english = locale === "en";
  const labels = english ? PLAN_LABELS_EN : PLAN_LABELS_ZH;
  const hasDiscount = founderQuote.discountPercent > 0;

  return (
    <div className="flex w-full max-w-4xl flex-col gap-5 overflow-x-hidden">
      {hasDiscount ? (
        <Card padding="md" className="border-emerald-400/25 bg-emerald-400/[0.04]">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">
              {english ? founderQuote.tierLabelEn : founderQuote.tierLabelZh}
            </Badge>
            {founderQuote.founderRank ? (
              <Text variant="caption" color="secondary">
                {english
                  ? `Founding member #${founderQuote.founderRank}`
                  : `创始会员第 ${founderQuote.founderRank} 位`}
              </Text>
            ) : null}
          </div>
          <Text variant="body-sm" color="secondary" className="mt-2 block">
            {english
              ? "This price applies while your membership is renewed without interruption. Once the membership expires before a renewal order is submitted, the founding discount is permanently forfeited."
              : "该价格仅在会员连续续订时有效。必须在会员到期前提交续费订单；一旦中断，创始会员折扣永久失效。"}
          </Text>
        </Card>
      ) : founderQuote.status === "forfeited" ? (
        <Card padding="md" className="border-amber-400/25 bg-amber-400/[0.04]">
          <Text variant="body-sm" color="secondary">
            {english
              ? "Your founding discount has ended because the previous membership expired before a renewal order was submitted. Standard prices now apply."
              : "你的上一期会员到期前未提交续费订单，创始会员连续续订优惠已失效，当前按标准价格结算。"}
          </Text>
        </Card>
      ) : null}

      {plans.map((plan) => {
        const code = plan.code as keyof typeof PLAN_LABELS_ZH;
        const meta = PLAN_DISPLAY[plan.code];
        const purchaseLabel = PLAN_PURCHASE_LABEL[plan.code] ?? "立即购买";
        const href = isLoggedIn
          ? `/checkout?plan=${plan.code}`
          : `/login?next=${encodeURIComponent("/pricing")}`;
        const listPrice = OFFICIAL_PLAN_PRICES[code];
        const actualPrice = discountedPrice(code, founderQuote.discountPercent);
        const saving = Math.max(0, listPrice - actualPrice);

        return (
          <Card key={plan.code} padding="lg" className="flex flex-col gap-3 overflow-hidden">
            <div className="flex flex-wrap items-center gap-2">
              <Text variant="body" weight="semibold">
                {labels[code]}
              </Text>
              {meta?.badge ? (
                <Badge variant="default">
                  {english
                    ? code === "MONTHLY"
                      ? "Flexible"
                      : code === "QUARTERLY"
                        ? "Recommended"
                        : "Best long-term value"
                    : meta.badge}
                </Badge>
              ) : null}
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              {hasDiscount ? (
                <span className="text-body-sm text-foreground-tertiary line-through">
                  {listPrice} USDT
                </span>
              ) : null}
              <span className="text-xl font-semibold text-foreground">{actualPrice} USDT</span>
              <span className="text-body-sm text-foreground-secondary">
                / {plan.duration_days} {english ? "days" : "天"}
              </span>
            </div>
            {hasDiscount ? (
              <p className="text-caption text-emerald-400">
                {english ? `You save ${saving} USDT` : `本期优惠 ${saving} USDT`}
              </p>
            ) : meta?.savingText ? (
              <p className="mb-3 text-caption text-foreground-tertiary">
                {english
                  ? code === "QUARTERLY"
                    ? "Save 40 USDT versus three monthly plans"
                    : code === "YEARLY"
                      ? "Save 260 USDT versus twelve monthly plans"
                      : meta.savingText
                  : meta.savingText}
              </p>
            ) : null}
            <div className="pt-1">
              <Button size="sm" asChild>
                <Link href={href}>
                  {isLoggedIn
                    ? english
                      ? `Buy ${labels[code]}`
                      : purchaseLabel
                    : english
                      ? "Sign in to purchase"
                      : "登录后购买"}
                </Link>
              </Button>
            </div>
          </Card>
        );
      })}

      <Card padding="lg" className="flex flex-col gap-4 overflow-hidden">
        <Text variant="body-sm" weight="semibold" className="block">
          {english ? "Payment instructions" : "付款说明"}
        </Text>
        <CopyAddress label="USDT-TRC20" address={trc20Address} />
        <CopyAddress label="USDT-BEP20" address={bep20Address} />
        <div className="flex flex-col gap-2">
          <Text variant="body-sm" weight="semibold" className="block">
            {english ? "Steps" : "付款步骤"}
          </Text>
          {(english
            ? [
                "1. Choose a membership plan",
                "2. Transfer the exact USDT amount on the selected network",
                "3. Submit the transaction hash",
                "4. Membership activates automatically after on-chain confirmation",
              ]
            : [
                "1. 选择会员套餐",
                "2. 使用对应网络转账准确金额的USDT",
                "3. 提交交易哈希",
                "4. 链上确认后自动开通会员（正常付款无需人工审核）",
              ]
          ).map((line) => (
            <p key={line} className="text-body-sm text-foreground-secondary">
              {line}
            </p>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-body-sm text-foreground-secondary">
              {english ? "Support email" : "客服邮箱"}
            </p>
            <p className="mt-1 break-all text-body-sm">{supportEmail || "jackzwin999@gmail.com"}</p>
          </div>
          <div>
            <p className="text-body-sm text-foreground-secondary">
              {english ? "Telegram support" : "电报客服"}
            </p>
            <a
              href="https://t.me/jackuwin"
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-body-sm text-primary hover:underline"
            >
              @jackuwin
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}
