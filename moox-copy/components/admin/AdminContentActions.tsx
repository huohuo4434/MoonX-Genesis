"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Text } from "@/components/ui";

export function AdminContentActions({
  id,
  status,
}: {
  id: string;
  status: "draft" | "published";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: "publish" | "withdraw" | "save_draft") {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const json = (await res.json()) as { error?: string };
    setLoading(false);
    if (!res.ok) {
      setMessage(json.error ?? "操作失败");
      return;
    }
    setMessage(action === "withdraw" ? "已撤回" : action === "publish" ? "已发布" : "已保存为草稿");
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {status !== "published" && (
        <Button size="sm" disabled={loading} onClick={() => run("publish")}>
          发布
        </Button>
      )}
      {status === "published" && (
        <Button size="sm" variant="outline" disabled={loading} onClick={() => run("withdraw")}>
          撤回
        </Button>
      )}
      {status === "published" && (
        <Button size="sm" variant="outline" disabled={loading} onClick={() => run("save_draft")}>
          存为草稿
        </Button>
      )}
      {message && (
        <Text variant="caption" color="tertiary">
          {message}
        </Text>
      )}
    </div>
  );
}
