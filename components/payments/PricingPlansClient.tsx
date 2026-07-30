"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Card, Text } from "@/components/ui";
import { PLAN_DISPLAY, PLAN_PURCHASE_LABEL } from "@/lib/payments/plan-display";
import type { MembershipPlan } from "@/types/membership";

const BENEFITS = [
  "今日完整预测",
  "下一交易日预测",
  "本周行情路径",
  "重点资产研究",
  "长鑫科技会员分析",
  "Asteroid会员分析",
  "Master I Ching分析",
  "Wave Intelligence",
  "AI综合判断",
  "风险和失效条件",
];

function CopyAddress({ label, address }: { label: string; address: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/[0.08] bg-muted/20 p-3">
      <Text variant="body-sm" weight="semibold" className="block">
        {label}
      </Text>
      <p className="text-caption text-foreground-tertiary">收款地址</p>
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
          {copied ? "已复制" : "复制地址"}
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
}: {
  plans: MembershipPlan[];
  supportEmail: string;
  trc20Address: string;
  bep20Address: string;
  isLoggedIn: boolean;
}) {
  return (
    <div className="flex w-full max-w-3xl flex-col gap-5 overflow-x-hidden">
      <Card padding="lg" className="flex flex-col gap-2">
        <Text variant="body" weight="semibold" className="block">
          会员权益
        </Text>
        <ul className="space-y-1 text-body-sm text-foreground-secondary">
          {BENEFITS.map((b) => (
            <li key={b}>· {b}</li>
          ))}
        </ul>
      </Card>

      {plans.map((plan) => {
        const meta = PLAN_DISPLAY[plan.code];
        const purchaseLabel = PLAN_PURCHASE_LABEL[plan.code] ?? "立即购买";
        const href = isLoggedIn
          ? `/checkout?plan=${plan.code}`
          : `/login?next=${encodeURIComponent("/pricing")}`;
        return (
          <Card key={plan.code} padding="lg" className="flex flex-col gap-3 overflow-hidden">
            <div className="flex flex-wrap items-center gap-2">
              <Text variant="body" weight="semibold">
                {plan.name}
              </Text>
              {meta?.badge ? <Badge variant="default">{meta.badge}</Badge> : null}
            </div>
            <p className="text-body-sm text-foreground-secondary">
              {plan.price_usdt} USDT／{plan.duration_days}天
            </p>
            {meta?.savingText ? (
              <p className="mb-3 text-caption text-foreground-tertiary">{meta.savingText}</p>
            ) : null}
            <div className="pt-1">
              <Button size="sm" asChild>
                <Link href={href}>{isLoggedIn ? purchaseLabel : "登录后购买"}</Link>
              </Button>
            </div>
          </Card>
        );
      })}

      <Card padding="lg" className="flex flex-col gap-4 overflow-hidden">
        <Text variant="body-sm" weight="semibold" className="block">
          付款说明
        </Text>
        <CopyAddress label="USDT-TRC20" address={trc20Address} />
        <CopyAddress label="USDT-BEP20" address={bep20Address} />
        <div className="flex flex-col gap-2">
          <Text variant="body-sm" weight="semibold" className="block">
            付款步骤
          </Text>
          <p className="text-body-sm text-foreground-secondary">1. 选择会员套餐</p>
          <p className="text-body-sm text-foreground-secondary">2. 使用对应网络转账USDT</p>
          <p className="text-body-sm text-foreground-secondary">3. 提交交易哈希</p>
          <p className="text-body-sm text-foreground-secondary">
            4. 管理员人工审核开通（暂不自动链上核验）
          </p>
          <p className="text-body-sm text-foreground-secondary">4. 管理员审核后开通</p>
        </div>
        <p className="text-body-sm text-foreground-secondary">客服邮箱</p>
        <p className="text-body-sm">{supportEmail || "jackzwin999@gmail.com"}</p>
      </Card>
    </div>
  );
}
