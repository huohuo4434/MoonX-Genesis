"use client";

import { useState } from "react";
import { Button, Text } from "@/components/ui";

export function SignalDbSetupClient({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      <Button onClick={copy}>{copied ? "已复制" : "复制全部建表SQL"}</Button>
      <Text variant="caption" className="block text-white/45">
        在Supabase的SQL Editor中新建查询，粘贴并运行一次。
      </Text>
      <pre className="max-h-[520px] overflow-auto rounded-lg border border-white/10 bg-black/30 p-4 text-xs leading-relaxed text-white/65">
        {sql}
      </pre>
    </div>
  );
}
