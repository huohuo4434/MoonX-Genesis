"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Text } from "@/components/ui";

const ACTIONS = [
  { action: "activate_monthly", label: "开通月会员" },
  { action: "activate_quarterly", label: "开通季度会员" },
  { action: "activate_yearly", label: "开通年度会员" },
  { action: "suspend", label: "暂停会员" },
  { action: "cancel", label: "取消会员" },
] as const;

export function AdminUserMembershipActions({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: (typeof ACTIONS)[number]["action"]) {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/users/membership", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    const json = (await res.json()) as { error?: string; membershipExpiresAt?: string };
    setLoading(false);
    if (!res.ok) {
      setMessage(json.error ?? "操作失败");
      return;
    }
    setMessage(
      json.membershipExpiresAt
        ? `成功，到期 ${new Date(json.membershipExpiresAt).toLocaleString("zh-CN")}`
        : "操作成功"
    );
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((a) => (
          <Button key={a.action} size="sm" variant="outline" disabled={loading} onClick={() => run(a.action)}>
            {a.label}
          </Button>
        ))}
      </div>
      {message && (
        <Text variant="caption" color="tertiary">
          {message}
        </Text>
      )}
    </div>
  );
}
