"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Text } from "@/components/ui";
import type { MembershipPlan } from "@/types/membership";

export function PricingPlansClient({
  plans,
  bep20Enabled,
  supportEmail,
}: {
  plans: MembershipPlan[];
  bep20Enabled: boolean;
  supportEmail: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buy(planCode: string, chain: "TRON" | "BSC") {
    setError(null);
    setLoading(`${planCode}-${chain}`);
    const res = await fetch("/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planCode, chain }),
    });
    const json = (await res.json()) as { error?: string; checkoutUrl?: string };
    setLoading(null);
    if (!res.ok) {
      if (res.status === 401) {
        router.push("/login?next=/pricing");
        return;
      }
      setError(json.error ?? "创建订单失败");
      return;
    }
    if (json.checkoutUrl) router.push(json.checkoutUrl);
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      {plans.map((plan) => (
        <Card key={plan.code} padding="lg" className="flex flex-col gap-3">
          <Text variant="body" weight="semibold">
            {plan.name}
          </Text>
          <Text variant="body-sm" color="secondary">
            {plan.duration_days} 天 ·{" "}
            {plan.price_usdt != null && plan.active
              ? `${plan.price_usdt} USDT`
              : "即将开放"}
          </Text>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={!plan.active || plan.price_usdt == null || loading !== null}
              onClick={() => buy(plan.code, "TRON")}
            >
              {loading === `${plan.code}-TRON` ? "创建中…" : "USDT-TRC20 支付"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!bep20Enabled || !plan.active || plan.price_usdt == null || loading !== null}
              onClick={() => buy(plan.code, "BSC")}
            >
              {bep20Enabled ? "BSC-USD 支付" : "BEP20 待管理员确认"}
            </Button>
          </div>
        </Card>
      ))}
      {error && (
        <Text variant="caption" color="tertiary">
          {error}
        </Text>
      )}
      <Text variant="caption" color="tertiary">
        请务必选择正确网络和指定代币合约。错误链、错误币种或假代币无法自动开通会员。客服：{supportEmail}
      </Text>
    </div>
  );
}
