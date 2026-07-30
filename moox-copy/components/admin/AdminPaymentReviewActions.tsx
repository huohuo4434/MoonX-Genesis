"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Text } from "@/components/ui";

export function AdminPaymentReviewActions({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: "approve" | "reject") {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/payments-review", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, action }),
    });
    const json = (await res.json()) as { error?: string; membershipExpiresAt?: string };
    setLoading(false);
    if (!res.ok) {
      setMessage(json.error ?? "操作失败");
      return;
    }
    setMessage(action === "approve" ? "已开通会员" : "已拒绝");
    router.refresh();
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <Button size="sm" disabled={loading} onClick={() => run("approve")}>
        审核通过并开通
      </Button>
      <Button size="sm" variant="outline" disabled={loading} onClick={() => run("reject")}>
        拒绝
      </Button>
      {message && (
        <Text variant="caption" color="tertiary">
          {message}
        </Text>
      )}
    </div>
  );
}
