"use client";

import { useState } from "react";
import { Button, Text } from "@/components/ui";

export function AdminOrderActions({
  orderId,
  orderNumber,
}: {
  orderId: string;
  orderNumber: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(action: "reject" | "manual_review" | "mark_paid") {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, action }),
    });
    const json = (await res.json()) as { error?: string };
    setLoading(false);
    if (!res.ok) {
      setMessage(json.error ?? "操作失败");
      return;
    }
    setMessage("已更新");
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border/[0.06] pt-2">
      <Text variant="caption" color="tertiary">
        {orderNumber}
      </Text>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={loading} onClick={() => run("manual_review")}>
          转人工审核
        </Button>
        <Button size="sm" variant="outline" disabled={loading} onClick={() => run("mark_paid")}>
          手动补单
        </Button>
        <Button size="sm" variant="outline" disabled={loading} onClick={() => run("reject")}>
          拒绝
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
