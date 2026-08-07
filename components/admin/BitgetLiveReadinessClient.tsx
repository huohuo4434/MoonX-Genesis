"use client";

import { useState } from "react";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";

type CheckRow = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

type ReadinessResult = {
  ok: boolean;
  mode: string;
  writeAttempted: boolean;
  finalSubmission: string;
  summary: string;
  securityMessage: string;
  checks: CheckRow[];
};

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`诊断返回格式异常（HTTP ${res.status}）`);
  }
}

export function BitgetLiveReadinessClient() {
  const [result, setResult] = useState<ReadinessResult | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/bitget-demo/live-readiness", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
      });
      const body = await parseJson<ReadinessResult & { error?: string }>(res);
      if (!res.ok || body.error) throw new Error(body.error || "诊断失败");
      setResult(body);
      setMessage(body.summary);
    } catch (error) {
      setResult(null);
      setMessage(error instanceof Error ? error.message : "诊断失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card padding="lg" className="space-y-4 border-sky-400/20 bg-sky-400/[0.025]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Heading size="h3">LIVE下单链路诊断</Heading>
          <Text variant="body-sm" color="secondary" className="mt-2 block max-w-4xl">
            一键检查实盘API密钥、交易权限、账户权益、服务器时钟、BTCUSDT合约参数和实时行情。此诊断只读取，不调用真实订单写接口。
          </Text>
        </div>
        <Badge variant="outline">只读诊断</Badge>
      </div>
      <Button type="button" variant="outline" onClick={() => void run()} isLoading={loading}>
        检查实盘下单前置链路（不下单）
      </Button>
      {message ? <Text variant="body-sm" className={result?.ok ? "text-emerald-300" : "text-amber-200"}>{message}</Text> : null}
      {result ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {result.checks.map((item) => (
              <div key={item.id} className={`rounded-lg border p-3 ${item.ok ? "border-emerald-400/20" : "border-red-400/25"}`}>
                <div className="flex items-center justify-between gap-2">
                  <Text variant="body-sm" weight="semibold">{item.label}</Text>
                  <Badge variant={item.ok ? "success" : "danger"}>{item.ok ? "通过" : "未通过"}</Badge>
                </div>
                <Text variant="caption" color="secondary" className="mt-2 block break-words">{item.detail}</Text>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary" className="block">真实订单写入</Text>
            <Text variant="body-sm" className="mt-1 block">未执行 · {result.finalSubmission}</Text>
            <Text variant="caption" color="secondary" className="mt-2 block">{result.securityMessage}</Text>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
