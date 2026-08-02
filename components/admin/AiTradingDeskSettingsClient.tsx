"use client";

import { FormEvent, useState } from "react";
import { Button, Card, Heading, Input, Text } from "@/components/ui";
import type { AiTradingDeskSettings } from "@/types/ai-trading-desk";

export function AiTradingDeskSettingsClient({ initial }: { initial: AiTradingDeskSettings }) {
  const [settings, setSettings] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/ai-trading-desk/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: form.get("enabled") === "on",
          showCurrentPositions: form.get("showCurrentPositions") === "on",
          showTradeHistory: form.get("showTradeHistory") === "on",
          showAbsolutePnl: form.get("showAbsolutePnl") === "on",
          historyLimit: Number(form.get("historyLimit")),
        }),
      });
      const text = await response.text();
      const json = JSON.parse(text) as AiTradingDeskSettings & { error?: string };
      if (!response.ok || json.error) throw new Error(json.error || "保存失败");
      setSettings(json);
      setMessage("AI交易公开台设置已保存并重新同步。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card padding="lg" className="space-y-4">
      <div>
        <Heading size="h3">会员AI交易公开台</Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 block">
          控制会员栏目展示范围。API密钥、账户总资产和真实持仓数量始终不会公开。
        </Text>
      </div>
      <form className="space-y-4" onSubmit={save}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex items-center gap-2 rounded-lg border border-white/10 p-3 text-sm">
            <input name="enabled" type="checkbox" defaultChecked={settings.enabled} />
            开启会员公开台
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-white/10 p-3 text-sm">
            <input name="showCurrentPositions" type="checkbox" defaultChecked={settings.showCurrentPositions} />
            展示当前持仓
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-white/10 p-3 text-sm">
            <input name="showTradeHistory" type="checkbox" defaultChecked={settings.showTradeHistory} />
            展示历史成交
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-white/10 p-3 text-sm">
            <input name="showAbsolutePnl" type="checkbox" defaultChecked={settings.showAbsolutePnl} />
            展示USDT绝对盈亏
          </label>
        </div>
        <div className="max-w-xs">
          <label className="text-sm text-white/60" htmlFor="historyLimit">历史成交条数</label>
          <Input id="historyLimit" name="historyLimit" type="number" min={5} max={100} defaultValue={settings.historyLimit} className="mt-2" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" isLoading={loading}>保存公开台设置</Button>
          {message ? <Text variant="body-sm" color="secondary">{message}</Text> : null}
        </div>
      </form>
    </Card>
  );
}
