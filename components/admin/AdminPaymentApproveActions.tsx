"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Text } from "@/components/ui";

function explorerUrl(network: string, txHash: string): string {
  if (network === "BEP20") return `https://bscscan.com/tx/${txHash}`;
  return `https://tronscan.org/#/transaction/${txHash}`;
}

export function AdminPaymentApproveActions({
  orderId,
  userId,
  txHash,
  network,
}: {
  orderId: string;
  userId: string;
  txHash: string;
  network: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function run(action: "approve" | "reject" | "mark_test") {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/payments/submit", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, userId, action }),
    });
    const json = (await res.json()) as { error?: string };
    setLoading(false);
    if (!res.ok) {
      setMessage(json.error ?? "操作失败");
      return;
    }
    setMessage(
      action === "approve" ? "已开通会员" : action === "reject" ? "已拒绝" : "已标记系统测试"
    );
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={loading} onClick={() => run("approve")}>
          审核并开通
        </Button>
        <Button size="sm" variant="outline" disabled={loading} onClick={() => run("reject")}>
          拒绝
        </Button>
        <Button size="sm" variant="outline" disabled={loading} onClick={() => run("mark_test")}>
          标记系统测试
        </Button>
        <Button
          size="sm"
          variant="outline"
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(txHash);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "已复制" : "复制交易哈希"}
        </Button>
        <a
          href={explorerUrl(network, txHash)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center rounded-md border border-border px-3 text-caption hover:bg-muted"
        >
          打开区块浏览器
        </a>
      </div>
      {message && (
        <Text variant="caption" color="tertiary">
          {message}
        </Text>
      )}
    </div>
  );
}
