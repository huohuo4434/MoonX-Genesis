"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Text } from "@/components/ui";

const ACTIONS = [
  { action: "activate_monthly", label: "管理员赠送月会员", danger: false },
  { action: "activate_quarterly", label: "管理员赠送季度会员", danger: false },
  { action: "activate_yearly", label: "管理员赠送年度会员", danger: false },
  { action: "suspend", label: "暂停会员", danger: true },
  { action: "cancel", label: "取消会员", danger: true },
] as const;

export function AdminUserMembershipActions({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: (typeof ACTIONS)[number]["action"], label: string) {
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 4) {
      setMessage("请先填写至少4个字的操作原因。付款到账请优先从付款订单页处理，不要用管理员赠送代替付款。 ");
      return;
    }
    if (!window.confirm(`确认执行“${label}”？\n\n原因：${trimmedReason}\n\n该操作会写入会员审计流水。`)) return;

    const requestId = crypto.randomUUID();
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/users/membership", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, requestId, reason: trimmedReason, confirmed: true }),
    });
    const json = (await res.json()) as { error?: string; membershipExpiresAt?: string; applied?: boolean; skipped?: string };
    setLoading(false);
    if (!res.ok) {
      setMessage(json.error ?? "操作失败");
      return;
    }
    setMessage(
      json.applied === false && json.skipped === "already_applied"
        ? "该请求已处理，未重复增加会员天数。"
        : json.membershipExpiresAt
          ? `成功，到期 ${new Date(json.membershipExpiresAt).toLocaleString("zh-CN")}`
          : "操作成功"
    );
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <label className="text-caption text-foreground-tertiary">
        操作原因（必填）
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={loading}
          maxLength={300}
          placeholder="例如：活动赠送30天；付款请到付款订单页处理"
          className="mt-1 min-h-10 w-full rounded-md border border-border/[0.12] bg-background px-3 py-2 text-body-sm text-foreground outline-none focus:border-primary/50"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((a) => (
          <Button
            key={a.action}
            size="sm"
            variant="outline"
            disabled={loading || reason.trim().length < 4}
            onClick={() => run(a.action, a.label)}
          >
            {a.label}
          </Button>
        ))}
      </div>
      <Text variant="caption" color="tertiary">
        付款到账必须绑定付款订单处理；这里仅用于明确的管理员赠送/调整。每次请求都有幂等ID和审计原因。
      </Text>
      {message && <Text variant="caption" color="tertiary">{message}</Text>}
    </div>
  );
}
