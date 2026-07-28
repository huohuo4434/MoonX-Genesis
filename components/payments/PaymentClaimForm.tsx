"use client";

import { useState } from "react";
import { Button, Text } from "@/components/ui";

export function PaymentClaimForm() {
  const [planCode, setPlanCode] = useState<"MONTHLY" | "QUARTERLY" | "YEARLY">("MONTHLY");
  const [chain, setChain] = useState<"TRON" | "BSC">("TRON");
  const [txHash, setTxHash] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/payments-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planCode,
        chain,
        txHash: txHash.trim() || undefined,
      }),
    });
    const json = (await res.json()) as { error?: string };
    setLoading(false);
    if (!res.ok) {
      setMessage(json.error ?? "提交失败");
      return;
    }
    setTxHash("");
    setMessage("已提交，等待管理员审核开通。");
  }

  return (
    <form onSubmit={submit} className="mt-6 flex max-w-lg flex-col gap-3 border-t border-border/[0.08] pt-4">
      <Text variant="body-sm" weight="semibold">
        提交转账审核
      </Text>
      <select
        value={planCode}
        onChange={(e) => setPlanCode(e.target.value as typeof planCode)}
        className="h-10 rounded-md border border-border bg-surface px-3 text-body-sm"
      >
        <option value="MONTHLY">月会员 50 USDT</option>
        <option value="QUARTERLY">季会员 120 USDT</option>
        <option value="YEARLY">年会员 400 USDT</option>
      </select>
      <select
        value={chain}
        onChange={(e) => setChain(e.target.value as typeof chain)}
        className="h-10 rounded-md border border-border bg-surface px-3 text-body-sm"
      >
        <option value="TRON">USDT-TRC20</option>
        <option value="BSC">BEP20</option>
      </select>
      <input
        value={txHash}
        onChange={(e) => setTxHash(e.target.value)}
        placeholder="交易哈希（可选）"
        className="h-10 rounded-md border border-border bg-surface px-3 text-body-sm"
      />
      <Button type="submit" size="sm" disabled={loading}>
        {loading ? "提交中…" : "提交审核"}
      </Button>
      {message && (
        <Text variant="caption" color="tertiary">
          {message}
        </Text>
      )}
    </form>
  );
}
