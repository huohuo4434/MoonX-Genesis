"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Text } from "@/components/ui";
import { PLAN_DISPLAY } from "@/lib/payments/plan-display";
import type { MembershipPlan } from "@/types/membership";

export function PricingPlansClient({
  plans,
  bep20Enabled,
  trc20Open,
  supportEmail,
}: {
  plans: MembershipPlan[];
  bep20Enabled: boolean;
  trc20Open: boolean;
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
      {plans.map((plan) => {
        const meta = PLAN_DISPLAY[plan.code];
        const hasPrice = plan.price_usdt != null && plan.price_usdt > 0;
        const canBuy = trc20Open && plan.active && hasPrice;
        return (
          <Card key={plan.code} padding="lg" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Text variant="body" weight="semibold">
                {plan.name}
              </Text>
              {meta?.badge ? <Badge variant="default">{meta.badge}</Badge> : null}
            </div>
            <Text variant="body-sm" color="secondary">
              {plan.duration_days} 天 ·{" "}
              {hasPrice ? `${plan.price_usdt} USDT` : "即将开放"}
            </Text>
            {meta?.savingText ? (
              <Text variant="caption" color="tertiary">
                {meta.savingText}
              </Text>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={!canBuy || loading !== null}
                onClick={() => buy(plan.code, "TRON")}
              >
                {loading === `${plan.code}-TRON`
                  ? "创建中…"
                  : trc20Open
                    ? "USDT-TRC20 支付"
                    : "USDT-TRC20 即将开放"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!bep20Enabled || !canBuy || loading !== null}
                onClick={() => buy(plan.code, "BSC")}
              >
                {bep20Enabled ? "BSC-USD 支付" : "BEP20 待管理员确认"}
              </Button>
            </div>
          </Card>
        );
      })}
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
