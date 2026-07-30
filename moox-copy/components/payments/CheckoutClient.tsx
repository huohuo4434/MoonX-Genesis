"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Text } from "@/components/ui";
import { PLAN_DAYS, PLAN_LABELS, PLAN_PRICES, type MembershipPlan, type PaymentNetwork } from "@/lib/auth/permissions-client";

export function CheckoutClient({
  trc20Address,
  bep20Address,
}: {
  trc20Address: string;
  bep20Address: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  } | null>(null);

  const address = network === "TRC20" ? trc20Address : bep20Address;

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setMessage("地址已复制");
    } catch {
      setMessage("复制失败，请手动复制地址");
    }
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (txHash.trim().length < 20) {
      setMessage("交易哈希至少 20 个字符");
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
    };
    setLoading(false);
    if (!res.ok || !json.ok || !json.orderNumber) {
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/checkout?plan=${plan}`)}`);
        return;
      }
      setMessage(json.error ?? "付款信息保存失败，请稍后重试。");
      return;
    }
    setSuccess({
      orderNumber: json.orderNumber,
      planName: json.planName ?? PLAN_LABELS[plan],
      amount: json.amount ?? PLAN_PRICES[plan],
    });
  }

  const amount = useMemo(() => PLAN_PRICES[plan], [plan]);

  if (success) {
    return (
      <Card padding="lg" className="mx-auto max-w-lg space-y-3">
        <Text variant="body" weight="semibold">
          付款信息已提交
        </Text>
        <Text variant="body-sm" className="block">
          订单号：{success.orderNumber}
        </Text>
        <Text variant="body-sm" className="block">
          套餐：{success.planName}
        </Text>
        <Text variant="body-sm" className="block">
          金额：{success.amount} USDT
        </Text>
        <Text variant="body-sm" className="block">
          状态：等待管理员审核
        </Text>
        <Button asChild size="sm" className="w-fit">
          <Link href="/account/orders">查看我的订单</Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="mx-auto max-w-lg space-y-4">
      <Text variant="body" weight="semibold">
        {PLAN_LABELS[plan]}
      </Text>
      <Text variant="body-sm" color="secondary">
        应付金额：{amount} USDT · 会员天数：{PLAN_DAYS[plan]} 天
      </Text>

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
            复制地址
          </Button>
        </div>
        <input
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
          placeholder="交易哈希"
          className="h-10 rounded-md border border-border bg-surface px-3 text-body-sm"
          required
          minLength={20}
        />
        <Text variant="caption" color="tertiary">
          请严格使用所选网络转账 USDT。链上交易不可撤销。提交交易哈希后由管理员审核开通。
        </Text>
        {message && (
          <Text variant="caption" className="text-red-600">
            {message}
          </Text>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? "提交中…" : "提交审核"}
        </Button>
      </form>
    </Card>
  );
}
