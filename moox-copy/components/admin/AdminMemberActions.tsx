"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Text } from "@/components/ui";

const PRESETS = [
  { label: "开通月会员30天", days: 30 },
  { label: "开通季会员90天", days: 90 },
  { label: "开通年会员365天", days: 365 },
] as const;

export function AdminMemberActions({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function grant(days: number) {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "grant", days }),
    });
    const json = (await res.json()) as { error?: string; membershipExpiresAt?: string };
    setLoading(false);
    if (!res.ok) {
      setMessage(json.error ?? "操作失败");
      return;
    }
    setMessage(
      json.membershipExpiresAt
        ? `已开通 ${days} 天，到期：${new Date(json.membershipExpiresAt).toLocaleString("zh-CN")}`
        : "开通成功"
    );
    router.refresh();
  }

  async function suspend() {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "suspend" }),
    });
    const json = (await res.json()) as { error?: string };
    setLoading(false);
    if (!res.ok) {
      setMessage(json.error ?? "操作失败");
      return;
    }
    setMessage("已暂停会员");
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-border/[0.06] pt-3">
      <Text variant="caption" color="tertiary">
        {email}
      </Text>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Button key={p.days} size="sm" variant="outline" disabled={loading} onClick={() => grant(p.days)}>
            {p.label}
          </Button>
        ))}
        <Button size="sm" variant="outline" disabled={loading} onClick={suspend}>
          暂停会员
        </Button>
      </div>
      {message && (
        <Text variant="caption" color="tertiary">
          {message}
        </Text>
      )}
    </div>
  );
}
