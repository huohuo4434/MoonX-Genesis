"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, Text } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function CheckoutClient({
  orderNumber,
  supportEmail,
  recipientAddress,
}: {
  orderNumber: string;
  supportEmail: string;
  recipientAddress: string;
}) {
  const [txHash, setTxHash] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoggedIn(false);
      return;
    }
    supabase.auth.getUser().then(({ data }) => setLoggedIn(Boolean(data.user)));
  }, []);

  async function copyAddress() {
    await navigator.clipboard.writeText(recipientAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function verifyPayment() {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber, txHash: txHash.trim() }),
    });
    const json = (await res.json()) as { error?: string; success?: boolean; membershipExpiresAt?: string };
    setLoading(false);
    if (!res.ok) {
      setMessage(json.error ?? "验证失败");
      return;
    }
    setMessage(`付款已确认，会员有效期至 ${json.membershipExpiresAt ?? "—"}`);
  }

  if (loggedIn === false) {
    return (
      <Card padding="md">
        <Text variant="body-sm" color="secondary">
          请先{" "}
          <Link href={`/login?next=/checkout/${orderNumber}`} className="text-primary underline">
            登录
          </Link>{" "}
          后再验证付款。
        </Text>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <Text variant="body-sm" color="secondary">
        仅通过 TRON 网络发送官方 USDT-TRC20。请勿发送 TRX、其他代币或使用其他网络。错链或错币种无法自动找回。
      </Text>
      <Button type="button" variant="outline" size="sm" onClick={copyAddress}>
        {copied ? "地址已复制" : "复制收款地址"}
      </Button>
      <input
        value={txHash}
        onChange={(e) => setTxHash(e.target.value)}
        placeholder="交易哈希 (TxHash)"
        className="h-10 rounded-md border border-border bg-surface px-3 font-mono text-body-sm"
        aria-label="交易哈希"
      />
      <Button onClick={verifyPayment} disabled={loading || !txHash.trim()}>
        {loading ? "验证中…" : "验证付款"}
      </Button>
      {message && (
        <Text variant="body-sm" color="secondary">
          {message}
        </Text>
      )}
      <Text variant="caption" color="tertiary">
        客服：{supportEmail}
      </Text>
    </Card>
  );
}
