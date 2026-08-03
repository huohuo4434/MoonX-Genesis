"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import {
  PLAN_DAYS,
  PLAN_LABELS_EN,
  PLAN_LABELS_ZH,
  discountedPrice,
  type FounderDiscountQuote,
} from "@/lib/payments/founder-discount-shared";
import type { MembershipPlan, PaymentNetwork } from "@/lib/auth/permissions-client";

export function CheckoutClient({
  trc20Address,
  bep20Address,
  founderQuote,
}: {
  trc20Address: string;
  bep20Address: string;
  founderQuote: FounderDiscountQuote;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const en = locale === "en";
  const planParam = (searchParams.get("plan") ?? "MONTHLY").toUpperCase();
  const plan = (["MONTHLY", "QUARTERLY", "YEARLY"].includes(planParam)
    ? planParam
    : "MONTHLY") as MembershipPlan;

  const [network, setNetwork] = useState<PaymentNetwork>("TRC20");
  const [txHash, setTxHash] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{
    orderNumber: string;
    planName: string;
    amount: number;
    listPrice?: number;
    discountPercent?: number;
  } | null>(null);

  const address = network === "TRC20" ? trc20Address : bep20Address;
  const labels = en ? PLAN_LABELS_EN : PLAN_LABELS_ZH;

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setMessage(en ? "Address copied" : "地址已复制");
    } catch {
      setMessage(en ? "Copy failed. Please copy it manually." : "复制失败，请手动复制地址");
    }
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (txHash.trim().length < 20) {
      setMessage(en ? "The transaction hash must be at least 20 characters." : "交易哈希至少 20 个字符");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/payments/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, network, txHash: txHash.trim() }),
    });
    const json = (await res.json()) as {
      error?: string;
      ok?: boolean;
      orderNumber?: string;
      planName?: string;
      amount?: number;
      listPrice?: number;
      discountPercent?: number;
    };
    setLoading(false);
    if (!res.ok || !json.ok || !json.orderNumber) {
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/checkout?plan=${plan}`)}`);
        return;
      }
      setMessage(json.error ?? (en ? "Unable to save the payment. Please try again." : "付款信息保存失败，请稍后重试。"));
      return;
    }
    setSuccess({
      orderNumber: json.orderNumber,
      planName: en ? labels[plan] : json.planName ?? labels[plan],
      amount: json.amount ?? discountedPrice(plan, founderQuote.discountPercent),
      listPrice: json.listPrice,
      discountPercent: json.discountPercent,
    });
  }

  const amount = useMemo(
    () => discountedPrice(plan, founderQuote.discountPercent),
    [plan, founderQuote.discountPercent]
  );
  const listPrice = discountedPrice(plan, 0);

  if (success) {
    return (
      <Card padding="lg" className="mx-auto max-w-lg space-y-3">
        <Text variant="body" weight="semibold">
          {en ? "Payment submitted" : "付款信息已提交"}
        </Text>
        <Text variant="body-sm" className="block">
          {en ? "Order" : "订单号"}：{success.orderNumber}
        </Text>
        <Text variant="body-sm" className="block">
          {en ? "Plan" : "套餐"}：{success.planName}
        </Text>
        <Text variant="body-sm" className="block">
          {en ? "Amount" : "金额"}：{success.amount} USDT
        </Text>
        {success.discountPercent ? (
          <Text variant="caption" className="block text-emerald-400">
            {en
              ? `${success.discountPercent}% founding-member discount applied.`
              : `已按创始会员优惠减免 ${success.discountPercent}%。`}
          </Text>
        ) : null}
        <Text variant="body-sm" className="block">
          {en ? "Status: waiting for manual review" : "状态：等待管理员审核"}
        </Text>
        <Button asChild size="sm" className="w-fit">
          <Link href="/account/orders">{en ? "View my orders" : "查看我的订单"}</Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="mx-auto max-w-lg space-y-4">
      <Text variant="body" weight="semibold">
        {labels[plan]}
      </Text>
      <div className="flex flex-wrap items-baseline gap-2">
        {founderQuote.discountPercent > 0 ? (
          <span className="text-body-sm text-foreground-tertiary line-through">{listPrice} USDT</span>
        ) : null}
        <span className="text-xl font-semibold">{amount} USDT</span>
        <span className="text-body-sm text-foreground-secondary">
          · {PLAN_DAYS[plan]} {en ? "days" : "天"}
        </span>
      </div>
      {founderQuote.discountPercent > 0 ? (
        <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/[0.04] p-3">
          <Text variant="body-sm" className="text-emerald-400">
            {en ? founderQuote.tierLabelEn : founderQuote.tierLabelZh}
          </Text>
          <Text variant="caption" color="secondary" className="mt-1 block">
            {en
              ? "To keep this discount, submit every renewal order before the current membership expires."
              : "要保留该折扣，每次都必须在当前会员到期前提交续费订单。"}
          </Text>
        </div>
      ) : null}

      <div className="space-y-2">
        <Text variant="caption" color="tertiary" className="block">
          TRC20：{trc20Address}
        </Text>
        <Text variant="caption" color="tertiary" className="block">
          BEP20：{bep20Address}
        </Text>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <select
          value={network}
          onChange={(e) => setNetwork(e.target.value as PaymentNetwork)}
          className="h-10 rounded-md border border-border bg-surface px-3 text-body-sm"
        >
          <option value="TRC20">TRC20</option>
          <option value="BEP20">BEP20</option>
        </select>
        <div className="flex gap-2">
          <input
            readOnly
            value={address}
            className="h-10 flex-1 rounded-md border border-border bg-surface px-3 text-caption font-mono"
          />
          <Button type="button" variant="outline" size="sm" onClick={copyAddress}>
            {en ? "Copy" : "复制地址"}
          </Button>
        </div>
        <input
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
          placeholder={en ? "Transaction hash" : "交易哈希"}
          className="h-10 rounded-md border border-border bg-surface px-3 text-body-sm"
          required
          minLength={20}
        />
        <Text variant="caption" color="tertiary">
          {en
            ? "Send the exact USDT amount on the selected network. Blockchain transfers are irreversible. The order is activated only after manual review."
            : "请严格使用所选网络转账准确金额的 USDT。链上交易不可撤销。提交交易哈希后由管理员审核开通。"}
        </Text>
        {message && (
          <Text variant="caption" className="text-red-600">
            {message}
          </Text>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? (en ? "Submitting…" : "提交中…") : en ? "Submit for review" : "提交审核"}
        </Button>
      </form>
    </Card>
  );
}
