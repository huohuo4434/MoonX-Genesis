"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { PAYMENT_TELEGRAM } from "@/lib/operations/lean-policy";
import { PLAN_DAYS, PLAN_LABELS_EN, PLAN_LABELS_ZH, discountedPrice, type FounderDiscountQuote } from "@/lib/payments/founder-discount-shared";
import type { MembershipPlan, PaymentNetwork } from "@/lib/auth/permissions-client";

/** Contact-only checkout: no order creation, polling, chain API or entitlement mutation. */
export function ManualCheckoutClient({ email, trc20Address, bep20Address, bep20Enabled, founderQuote, trc20Contract, bep20Contract }: {
  email: string;
  trc20Address: string;
  bep20Address: string;
  bep20Enabled: boolean;
  founderQuote: FounderDiscountQuote;
  trc20Contract: string;
  bep20Contract: string;
}) {
  const { locale, href } = useLocale();
  const en = locale === "en";
  const query = useSearchParams();
  const selected = (query.get("plan") ?? "MONTHLY").toUpperCase();
  const plan = (["MONTHLY", "QUARTERLY", "YEARLY"].includes(selected) ? selected : "MONTHLY") as MembershipPlan;
  const [network, setNetwork] = useState<PaymentNetwork>("TRC20");
  const [message, setMessage] = useState("");
  const amount = discountedPrice(plan, founderQuote.discountPercent);
  const address = network === "BEP20" && bep20Enabled ? bep20Address : trc20Address;
  const label = (en ? PLAN_LABELS_EN : PLAN_LABELS_ZH)[plan];
  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setMessage(en ? "Copied" : "已复制"); }
    catch { setMessage(en ? "Please copy manually." : "请手动复制。"); }
  }
  return (
    <Card padding="lg" className="mx-auto w-full max-w-lg space-y-4">
      <Text variant="body" weight="semibold">{label} · {PLAN_DAYS[plan]} {en ? "days" : "天"}</Text>
      <Text variant="caption" color="secondary">{en ? "Reference quote — confirm with support" : "参考报价，付款前请客服确认"}</Text>
      <p className="text-2xl font-semibold">{amount} USDT</p>
      {founderQuote.discountPercent > 0 ? <Text variant="caption" className="text-emerald-400">{en ? founderQuote.tierLabelEn : founderQuote.tierLabelZh}</Text> : null}
      <Text variant="body-sm" color="secondary" className="block">
        {en ? "Confirm the plan and any renewal discount with support before paying. After payment, send your registered email, plan, network, actual amount and TXID to the official Telegram account. Support verifies receipt before activating membership; activation is not instant." : "转账前请先向客服确认套餐和续费优惠。付款后，将注册邮箱、套餐、付款网络、实际金额和交易哈希（TXID）发给官方电报账号；管理员核实到账后开通，不是即时自动开通。"}
      </Text>
      <label className="block text-sm" htmlFor="manual-payment-network">{en ? "Payment network" : "付款网络"}</label>
      <select id="manual-payment-network" value={network} onChange={event => setNetwork(event.target.value as PaymentNetwork)} className="h-10 w-full rounded-md border border-border bg-surface px-3">
        <option value="TRC20">USDT · TRON TRC20</option>
        {bep20Enabled ? <option value="BEP20">USDT · BNB Smart Chain BEP20</option> : null}
      </select>
      <Text variant="caption" color="secondary" className="block">{en ? "Receiving address" : "收款地址"} · {network}</Text>
      <p className="break-all font-mono text-sm">{address}</p>
      <Text variant="caption" color="tertiary" className="block break-all">{en ? "Token contract (not the receiving address)" : "代币合约（不是收款地址）"}：{network === "BEP20" ? bep20Contract : trc20Contract}</Text>
      <Button type="button" size="sm" variant="outline" disabled={!address} onClick={() => copy(address)}>{en ? "Copy address" : "复制收款地址"}</Button>
      <Text variant="caption" className="block text-amber-400">
        {en ? "Use only the selected network and USDT. Withdrawal fees must not reduce the amount received. Keep the TXID; never send a seed phrase, private key or password. Already paid under an old order? Send its order number too; do not pay again." : "仅使用所选网络和 USDT，提现手续费不能扣减应到账金额。请保留 TXID，不要发送助记词、私钥或密码。旧订单已经付款的，请同时提供订单号，不要重复付款。"}
      </Text>
      <div className="flex flex-wrap gap-3">
        <Button asChild><a href={PAYMENT_TELEGRAM.url} target="_blank" rel="noopener noreferrer">{en ? "Contact" : "付款后联系"} {PAYMENT_TELEGRAM.handle}</a></Button>
        <Button type="button" variant="outline" onClick={() => copy(`${en ? "Registered email" : "注册邮箱"}: ${email}\n${label}: ${amount} USDT\n${en ? "Network" : "付款网络"}: ${network}\nTXID: \n${en ? "Actual amount received" : "实际到账金额"}: `)}>{en ? "Copy message template" : "复制联系模板"}</Button>
      </div>
      <p role="status" className="text-sm text-foreground-secondary">{message}</p>
      <Text variant="caption" color="tertiary" className="block">{en ? "This page does not create an automatic payment order or confirm receipt. No membership is granted by opening Telegram. After support confirms activation, check My Account. Consultation submissions are paused; existing records and entitlements are retained for support review." : "本页不生成自动付款订单，也不代表已到账；打开电报不会开通会员。客服确认开通后，请在“我的账户”核对有效期。在线咨询暂停新申请，既有记录及权益保留，由客服核查处理。"}</Text>
      <Link href={href("/account")} className="inline-block text-primary underline">{en ? "My account" : "我的账户"}</Link>
    </Card>
  );
}
