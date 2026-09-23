"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Text } from "@/components/ui";
import { membershipRequestId } from "@/lib/operations/membership-request-id";

const ACTIONS = [
  { action: "activate_monthly", label: "人工开通／续期月会员", danger: false },
  { action: "activate_quarterly", label: "人工开通／续期季度会员", danger: false },
  { action: "activate_yearly", label: "人工开通／续期年度会员", danger: false },
  { action: "suspend", label: "暂停会员", danger: true },
  { action: "cancel", label: "取消会员", danger: true },
] as const;

export function AdminUserMembershipActions({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const inFlight = useRef(false);
  const revokeAttempt = useRef<{ key: string; requestId: string } | null>(null);

  async function run(action: (typeof ACTIONS)[number]["action"], label: string) {
    if (inFlight.current) return;
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 4) {
      setMessage("请填写操作原因。人工付款须先核实收款并查重，原因应含网络、TXID、实际到账金额和日期；旧订单优先在付款页核查。");
      return;
    }
    if (!window.confirm(`确认执行“${label}”？\n\n原因：${trimmedReason}\n\n该操作会写入会员审计流水。`)) return;

    inFlight.current = true;
    setLoading(true);
    setMessage(null);
    try {
    const operationKey = JSON.stringify([userId, action, trimmedReason]);
    if (!action.startsWith("activate_") && revokeAttempt.current?.key !== operationKey) {
      revokeAttempt.current = { key: operationKey, requestId: crypto.randomUUID() };
    }
    const requestId = action.startsWith("activate_")
      ? await membershipRequestId(userId, action, trimmedReason)
      : revokeAttempt.current!.requestId;
    const res = await fetch("/api/admin/users/membership", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, requestId, reason: trimmedReason, confirmed: true }),
    });
    const json = (await res.json()) as { error?: string; membershipExpiresAt?: string; applied?: boolean; skipped?: string };
    if (!res.ok) {
      setMessage(json.error ?? "操作失败");
      return;
    }
    // A subsequent revoke after reactivation is a new action, not the old revoke replay.
    revokeAttempt.current = null;
    setMessage(
      json.applied === false && json.skipped === "already_applied"
        ? "该请求已处理，未重复增加会员天数。"
        : json.membershipExpiresAt
          ? `成功，到期 ${new Date(json.membershipExpiresAt).toLocaleString("zh-CN")}`
          : "操作成功"
    );
    router.refresh();
    } catch {
      setMessage("结果未确认，请先查看会员有效期和审计记录。确需重试时保留相同操作和原因，以复用请求ID；不要换原因重复加时。");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
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
          placeholder="人工付款：网络、TXID、实际到账金额、日期；或唯一的活动赠送说明"
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
        人工付款先核对钱包真实到账、注册账户及历史订单／审计记录，避免重复加时。此入口记为人工会员调整，不生成自动付款账单，也不自动发放创始资格或邀请奖励。同一账户、开通／续期操作、原因的请求ID固定；结果不确定时先核查再原样重试。另一笔真实付款须使用其自己的TXID和原因。
      </Text>
      {message && <Text variant="caption" color="tertiary">{message}</Text>}
    </div>
  );
}
