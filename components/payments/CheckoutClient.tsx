"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

type OrderState = {
  orderId: string;
  orderNumber: string;
  network: PaymentNetwork;
  tokenName: string;
  recipientAddress: string;
  exactAmount: number;
  listPrice: number;
  discountPercent: number;
  founderRank: number | null;
  expiresAt: string;
  warningText: string;
};

type OrderStatus =
  | "pending"
  | "verifying"
  | "paid"
  | "overpaid"
  | "underpaid"
  | "expired"
  | "manual_review"
  | "rejected"
  | "busy";

function secondsRemaining(expiresAt: string | null): number {
  if (!expiresAt) return 0;
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function CheckoutClient({
  founderQuote,
  bep20Enabled,
}: {
  trc20Address: string;
  bep20Address: string;
  founderQuote: FounderDiscountQuote;
  bep20Enabled: boolean;
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
  const [order, setOrder] = useState<OrderState | null>(null);
  const [txHash, setTxHash] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [membershipExpiresAt, setMembershipExpiresAt] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);

  const labels = en ? PLAN_LABELS_EN : PLAN_LABELS_ZH;
  const displayPrice = useMemo(
    () => discountedPrice(plan, founderQuote.discountPercent),
    [plan, founderQuote.discountPercent]
  );
  const listPrice = discountedPrice(plan, 0);

  useEffect(() => {
    setOrder(null);
    setStatus(null);
    setTxHash("");
    setMessage(null);
  }, [network, plan]);

  useEffect(() => {
    if (!order?.expiresAt || status === "paid" || status === "overpaid") return;
    setRemaining(secondsRemaining(order.expiresAt));
    const timer = window.setInterval(() => setRemaining(secondsRemaining(order.expiresAt)), 1000);
    return () => window.clearInterval(timer);
  }, [order?.expiresAt, status]);

  useEffect(() => {
    if (!order || !status || !["pending", "verifying", "busy"].includes(status)) return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/payments/order-status?orderId=${encodeURIComponent(order.orderId)}`, {
          cache: "no-store",
        });
        const json = (await response.json()) as {
          status?: OrderStatus;
          activated?: boolean;
          membershipExpiresAt?: string | null;
          verificationError?: string | null;
        };
        if (!response.ok || !json.status) return;
        setStatus(json.status);
        if (json.activated) {
          setMembershipExpiresAt(json.membershipExpiresAt ?? null);
          setMessage(en ? "Payment confirmed. Membership activated automatically." : "链上付款已确认，会员已自动开通。 ");
        } else if (["underpaid", "manual_review", "rejected", "expired"].includes(json.status)) {
          setMessage(json.verificationError ?? (en ? "The payment could not be activated automatically." : "该付款未能自动开通。"));
        }
      } catch {
        // The next poll will retry.
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [order, status, en]);

  const copy = async (value: string, successText: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(successText);
    } catch {
      setMessage(en ? "Copy failed. Please copy it manually." : "复制失败，请手动复制。 ");
    }
  };

  async function createOrder() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, network }),
      });
      const json = (await response.json()) as Partial<OrderState> & { error?: string; ok?: boolean };
      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/checkout?plan=${plan}`)}`);
        return;
      }
      if (!response.ok || !json.ok || !json.orderId || !json.orderNumber || !json.recipientAddress || !json.exactAmount || !json.expiresAt) {
        setMessage(json.error ?? (en ? "Unable to create the payment order." : "无法生成付款订单。"));
        return;
      }
      setOrder({
        orderId: json.orderId,
        orderNumber: json.orderNumber,
        network: (json.network ?? network) as PaymentNetwork,
        tokenName: json.tokenName ?? (network === "TRC20" ? "USDT-TRC20" : "BEP20 token"),
        recipientAddress: json.recipientAddress,
        exactAmount: Number(json.exactAmount),
        listPrice: Number(json.listPrice ?? listPrice),
        discountPercent: Number(json.discountPercent ?? founderQuote.discountPercent),
        founderRank: json.founderRank == null ? null : Number(json.founderRank),
        expiresAt: json.expiresAt,
        warningText: json.warningText ?? "",
      });
      setStatus("pending");
      setMessage(en ? "Order created. Transfer the exact amount shown below." : "订单已生成，请按下方金额精确转账。 ");
    } catch {
      setMessage(en ? "Network error. Please try again." : "网络异常，请稍后重试。 ");
    } finally {
      setLoading(false);
    }
  }

  async function submitHash(event: React.FormEvent) {
    event.preventDefault();
    if (!order) return;
    setMessage(null);
    setLoading(true);
    try {
      const response = await fetch("/api/payments/auto-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.orderId, txHash: txHash.trim() }),
      });
      const json = (await response.json()) as {
        error?: string;
        status?: OrderStatus;
        activated?: boolean;
        message?: string;
        membershipExpiresAt?: string | null;
      };
      if (!response.ok) {
        setMessage(json.error ?? (en ? "Verification request failed." : "核验请求失败。"));
        return;
      }
      setStatus(json.status ?? "pending");
      setMembershipExpiresAt(json.membershipExpiresAt ?? null);
      setMessage(json.message ?? (en ? "Automatic verification has started." : "已开始自动核验。"));
    } catch {
      setMessage(en ? "Network error. The system will retry after you resubmit." : "网络异常，请稍后重新提交。 ");
    } finally {
      setLoading(false);
    }
  }

  const activated = status === "paid" || status === "overpaid";
  if (activated) {
    return (
      <Card padding="lg" className="mx-auto max-w-lg space-y-3">
        <Text variant="body" weight="semibold" className="text-emerald-400">
          {en ? "Membership activated automatically" : "会员已自动开通"}
        </Text>
        <Text variant="body-sm" className="block">{en ? "Order" : "订单号"}：{order?.orderNumber}</Text>
        <Text variant="body-sm" className="block">{en ? "Paid amount" : "付款金额"}：{order?.exactAmount} USDT</Text>
        <Text variant="body-sm" className="block">
          {en ? "Membership expiry" : "会员到期时间"}：{membershipExpiresAt ? new Date(membershipExpiresAt).toLocaleString(en ? "en-US" : "zh-CN", { timeZone: "Asia/Shanghai" }) : "—"}
        </Text>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm"><Link href="/member/tomorrow">{en ? "Open member content" : "进入会员内容"}</Link></Button>
          <Button asChild size="sm" variant="outline"><Link href="/account/orders">{en ? "View order" : "查看订单"}</Link></Button>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="mx-auto max-w-lg space-y-4">
      <Text variant="body" weight="semibold">{labels[plan]}</Text>
      <div className="flex flex-wrap items-baseline gap-2">
        {founderQuote.discountPercent > 0 ? <span className="text-body-sm text-foreground-tertiary line-through">{listPrice} USDT</span> : null}
        <span className="text-xl font-semibold">{displayPrice} USDT</span>
        <span className="text-body-sm text-foreground-secondary">· {PLAN_DAYS[plan]} {en ? "days" : "天"}</span>
      </div>

      {founderQuote.discountPercent > 0 ? (
        <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/[0.04] p-3">
          <Text variant="body-sm" className="text-emerald-400">{en ? founderQuote.tierLabelEn : founderQuote.tierLabelZh}</Text>
          <Text variant="caption" color="secondary" className="mt-1 block">
            {en ? "Create each renewal order before the current membership expires to preserve the discount." : "每次续费请在当前会员到期前生成订单，以保留创始会员优惠。"}
          </Text>
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="text-caption text-foreground-tertiary">{en ? "Payment network" : "付款网络"}</label>
        <select
          value={network}
          onChange={(event) => setNetwork(event.target.value as PaymentNetwork)}
          className="h-10 w-full rounded-md border border-border bg-surface px-3 text-body-sm"
        >
          <option value="TRC20">USDT · TRON TRC20</option>
          <option value="BEP20" disabled={!bep20Enabled}>BEP20 {!bep20Enabled ? (en ? "(temporarily unavailable)" : "（暂未启用）") : ""}</option>
        </select>
      </div>

      {!order ? (
        <>
          <Text variant="caption" color="tertiary">
            {en
              ? "Generate a 45-minute order first. A tiny unique decimal is added only to identify your transfer automatically."
              : "请先生成 45 分钟有效的付款订单。系统会加入不足 0.01 USDT 的专属识别尾数，用于自动匹配您的转账。"}
          </Text>
          <Button type="button" onClick={createOrder} disabled={loading}>
            {loading ? (en ? "Creating…" : "生成中…") : en ? "Generate payment order" : "生成自动付款订单"}
          </Button>
        </>
      ) : (
        <>
          <div className="rounded-lg border border-primary/30 bg-primary/[0.04] p-4">
            <Text variant="caption" color="secondary" className="block">{en ? "Order" : "订单号"}：{order.orderNumber}</Text>
            <Text variant="caption" color="secondary" className="mt-1 block">{en ? "Valid for" : "剩余时间"}：{formatCountdown(remaining)}</Text>
            <Text variant="body-sm" weight="semibold" className="mt-4 block">{en ? "Exact amount to send" : "必须精确转账金额"}</Text>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-2xl font-semibold text-primary">{order.exactAmount.toFixed(5)} USDT</span>
              <Button type="button" size="sm" variant="outline" onClick={() => copy(order.exactAmount.toFixed(5), en ? "Amount copied" : "金额已复制")}>{en ? "Copy" : "复制"}</Button>
            </div>
            <Text variant="caption" color="tertiary" className="mt-2 block">
              {en ? "Do not round the amount. The decimal suffix is the automatic order identifier." : "请勿四舍五入；小数尾数是系统自动识别订单的凭证。"}
            </Text>
          </div>

          <div className="space-y-2">
            <Text variant="caption" color="tertiary" className="block">{order.tokenName} · {en ? "Receive address" : "收款地址"}</Text>
            <div className="flex gap-2">
              <input readOnly value={order.recipientAddress} className="h-10 min-w-0 flex-1 rounded-md border border-border bg-surface px-3 text-caption font-mono" />
              <Button type="button" variant="outline" size="sm" onClick={() => copy(order.recipientAddress, en ? "Address copied" : "地址已复制")}>{en ? "Copy" : "复制"}</Button>
            </div>
          </div>

          {order.warningText ? <Text variant="caption" className="text-amber-400">{order.warningText}</Text> : null}

          <form onSubmit={submitHash} className="flex flex-col gap-3">
            <input
              value={txHash}
              onChange={(event) => setTxHash(event.target.value)}
              placeholder={en ? "Paste transaction hash after transfer" : "转账后粘贴交易哈希"}
              className="h-10 rounded-md border border-border bg-surface px-3 text-body-sm"
              required
              minLength={64}
            />
            <Text variant="caption" color="tertiary">
              {en
                ? "After submission, the chain is checked immediately and then every minute. Correct confirmed payments activate membership automatically; no manual review is required."
                : "提交后系统会立即核验，并由 Vercel 每分钟自动重试。正确且已确认的付款会自动开通会员，无需人工审核。"}
            </Text>
            <Button type="submit" disabled={loading || remaining <= 0}>
              {loading ? (en ? "Verifying…" : "核验中…") : en ? "Verify payment automatically" : "提交并自动核验"}
            </Button>
          </form>

          {status && ["pending", "verifying", "busy"].includes(status) ? (
            <Text variant="body-sm" className="text-sky-400">
              {en ? "Blockchain confirmation in progress. This page updates automatically." : "链上确认中，本页面会自动更新，无需重复提交。"}
            </Text>
          ) : null}
        </>
      )}

      {message ? <Text variant="caption" className={activated ? "text-emerald-400" : "text-amber-400"}>{message}</Text> : null}
      <Text variant="caption" color="tertiary">
        {en ? "Normal payments are automatic. Only wrong network, wrong token, underpayment or other exceptions require support." : "正常付款全部自动处理；只有错链、错币、少付或其他异常情况才需要联系客服。"}
      </Text>
    </Card>
  );
}
