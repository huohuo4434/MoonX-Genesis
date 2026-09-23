"use client";

import Link from "next/link";
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

export function PricingPlansClient({
  plans,
  supportEmail,
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
  const { locale, href: localizedHref } = useLocale();
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
              ? "This is a reference quote based on existing records. Contact support before expiry to verify renewal eligibility and the final amount; manual checkout does not reserve an online renewal order."
              : "这里是依据既有记录计算的参考报价。请在会员到期前联系客服核对续费资格及最终应付金额；人工付款页不会预留线上续费订单。"}
          </Text>
        </Card>
      ) : founderQuote.status === "forfeited" ? (
        <Card padding="md" className="border-amber-400/25 bg-amber-400/[0.04]">
          <Text variant="body-sm" color="secondary">
            {english
              ? "Existing system records flag a continuity gap. Manual renewals do not create an online order, so ask support to verify payment timing and eligibility before transferring. The displayed price is only a reference."
              : "既有系统记录提示续费连续性待核查。人工付款不会生成线上订单，请先联系客服核对付款时间与优惠资格，再确认金额转账；页面价格仅作参考。"}
          </Text>
        </Card>
      ) : null}

      {plans.map((plan) => {
        const code = plan.code as keyof typeof PLAN_LABELS_ZH;
        const meta = PLAN_DISPLAY[plan.code];
        const purchaseLabel = PLAN_PURCHASE_LABEL[plan.code] ?? "立即购买";
        const href = isLoggedIn
          ? localizedHref(`/checkout?plan=${plan.code}`)
          : localizedHref(`/login?next=${encodeURIComponent(localizedHref("/pricing"))}`);
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
        <Text variant="body-sm" color="secondary">{english ? "Open checkout to see the network currently enabled and its receiving address. Confirm your plan with support before paying." : "请先进入套餐付款页，查看当前支持的网络及对应收款地址，转账前向客服确认套餐。"}</Text>
        <div className="flex flex-col gap-2">
          <Text variant="body-sm" weight="semibold" className="block">
            {english ? "Steps" : "付款步骤"}
          </Text>
          {(english
            ? [
                "1. Choose a membership plan",
                "2. Transfer the exact USDT amount on the selected network",
                "3. Send registered email, plan, network and TXID to Telegram @jackuwin",
                "4. An administrator verifies receipt and activates membership manually",
              ]
            : [
                "1. 选择会员套餐",
                "2. 使用对应网络转账准确金额的USDT",
                "3. 将注册邮箱、套餐、网络和 TXID 发给电报 @jackuwin",
                "4. 管理员核实到账后人工开通会员",
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
