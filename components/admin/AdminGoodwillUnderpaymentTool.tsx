"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Text } from "@/components/ui";
import { buildAdminGoodwillRequest } from "@/lib/payments/admin-goodwill-form-core";

type SuccessResult = {
  actualReceivedAmount: number;
  membershipExpiresAt: string | null;
  alreadyActivated: boolean;
};

const fieldClass = "w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60";

export function AdminGoodwillUnderpaymentTool() {
  const router = useRouter();
  const [orderId, setOrderId] = useState("");
  const [txHash, setTxHash] = useState("");
  const [claimedActualAmount, setClaimedActualAmount] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SuccessResult | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);
    const built = buildAdminGoodwillRequest({ orderId, txHash, claimedActualAmount, reason, confirmed });
    if (!built.ok) {
      setError(built.error);
      return;
    }
    if (!window.confirm("这是一次少付手续费客服特批。服务端会重新读取链上实际到账，订单仍保留少付事实。确认继续？")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/payments/auto-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(built.payload),
      });
      const json = await response.json() as Partial<SuccessResult> & { error?: string };
      if (!response.ok) throw new Error(json.error ?? "少付手续费特批失败");
      if (typeof json.actualReceivedAmount !== "number") throw new Error("服务端未返回权威实际到账金额");
      setResult({
        actualReceivedAmount: json.actualReceivedAmount,
        membershipExpiresAt: json.membershipExpiresAt ?? null,
        alreadyActivated: json.alreadyActivated === true,
      });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "少付手续费特批失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div>
        <label className="mb-1 block text-sm text-white/80" htmlFor="goodwill-order-id">订单 ID（UUID）</label>
        <input id="goodwill-order-id" className={fieldClass} value={orderId} onChange={(event) => setOrderId(event.target.value)} autoComplete="off" />
      </div>
      <div>
        <label className="mb-1 block text-sm text-white/80" htmlFor="goodwill-tx-hash">TRON 交易哈希（64位）</label>
        <input id="goodwill-tx-hash" className={`${fieldClass} font-mono`} value={txHash} onChange={(event) => setTxHash(event.target.value)} autoComplete="off" />
      </div>
      <div>
        <label className="mb-1 block text-sm text-white/80" htmlFor="goodwill-actual-amount">辅助核对金额（可选，USDT）</label>
        <input id="goodwill-actual-amount" className={fieldClass} value={claimedActualAmount} onChange={(event) => setClaimedActualAmount(event.target.value)} inputMode="decimal" placeholder="例如 62.502090" />
        <Text variant="caption" color="tertiary" className="mt-1 block">该金额不具备授权力；服务端会用链上权威金额覆盖并比对。</Text>
      </div>
      <div>
        <label className="mb-1 block text-sm text-white/80" htmlFor="goodwill-reason">客服特批原因（至少10个字符）</label>
        <textarea id="goodwill-reason" className={`${fieldClass} min-h-24`} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="记录手续费少付、链上核验和本次一次性客服决定" />
      </div>
      <label className="flex items-start gap-2 text-sm text-white/80">
        <input type="checkbox" className="mt-1" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
        <span>我确认这是少付客服特批，不把实际少付伪记为全额支付；系统将保存真实到账和审计记录。</span>
      </label>
      <Button type="submit" disabled={busy || !confirmed}>{busy ? "链上复核并开通中…" : "少付手续费特批"}</Button>
      {error ? <Text variant="body-sm" className="block text-red-300">{error}</Text> : null}
      {result ? (
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/[0.06] p-3">
          <Text variant="body-sm" weight="semibold" className="text-emerald-300">Goodwill approved · 少付特批已开通</Text>
          <Text variant="caption" className="mt-1 block">链上实际到账：{result.actualReceivedAmount} USDT</Text>
          <Text variant="caption" className="mt-1 block">会员到期：{result.membershipExpiresAt ? new Date(result.membershipExpiresAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }) : "未返回"}</Text>
          {result.alreadyActivated ? <Text variant="caption" className="mt-1 block">该订单此前已完成，未重复增加会员期限。</Text> : null}
        </div>
      ) : null}
    </form>
  );
}
