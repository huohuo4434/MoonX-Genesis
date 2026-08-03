"use client";

import { FormEvent, useState } from "react";
import { Button, Card, Heading, Input, Text } from "@/components/ui";
import type { DeviceListItem } from "@/lib/auth/device-security";

type EventItem = { id: string; eventType: string; createdAt: string; actorUserId: string | null; detail: unknown };

export function AdminDeviceSecurityPanel() {
  const [userId, setUserId] = useState("");
  const [devices, setDevices] = useState<DeviceListItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(event?: FormEvent) {
    event?.preventDefault();
    if (!userId.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const query = encodeURIComponent(userId.trim());
      const [deviceResponse, eventResponse] = await Promise.all([
        fetch(`/api/admin/security/devices?userId=${query}`, { cache: "no-store" }),
        fetch(`/api/admin/security/events?userId=${query}`, { cache: "no-store" }),
      ]);
      const deviceBody = (await deviceResponse.json()) as { devices?: DeviceListItem[]; setupRequired?: boolean };
      const eventBody = (await eventResponse.json()) as { events?: EventItem[] };
      setDevices(deviceBody.devices ?? []);
      setEvents(eventBody.events ?? []);
      if (deviceBody.setupRequired) setMessage("设备安全数据库迁移尚未部署。");
    } catch {
      setMessage("读取失败，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  async function action(body: Record<string, string>) {
    const response = await fetch("/api/admin/security/devices", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: userId.trim(), ...body }),
    });
    setMessage(response.ok ? "安全操作已完成并写入审计。" : "操作失败。");
    await load();
  }

  return (
    <div className="space-y-6">
      <Card padding="lg">
        <Heading as="h1" size="h2">会员设备安全</Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 block">
          按Supabase用户ID查看绑定设备、租约争抢和管理员操作。页面不显示完整IP、Cookie或设备token。
        </Text>
        <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={load}>
          <Input value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="输入用户 ID" aria-label="用户ID" />
          <Button type="submit" isLoading={busy}>查询</Button>
        </form>
        {message ? <Text variant="body-sm" className="mt-3 block">{message}</Text> : null}
      </Card>

      <Card padding="lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Heading as="h2" size="h3">绑定设备</Heading>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => void action({ action: "clear-lease" })}>解除当前租约</Button>
            <Button size="sm" variant="danger" onClick={() => void action({ action: "revoke-all" })}>强制退出全部设备</Button>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {devices.map((device) => (
            <div key={device.id} className="flex flex-col gap-3 rounded-md border border-border/[0.08] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Text variant="body-sm" weight="semibold">{device.displayName}{device.revoked ? " · 已撤销" : ""}</Text>
                <Text variant="caption" color="tertiary" className="mt-1 block">最后活动：{new Date(device.lastSeenAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</Text>
              </div>
              {!device.revoked ? <Button size="sm" variant="outline" onClick={() => void action({ deviceId: device.id })}>撤销设备</Button> : null}
            </div>
          ))}
          {!devices.length ? <Text variant="body-sm" color="secondary">暂无设备或尚未查询。</Text> : null}
        </div>
      </Card>

      <Card padding="lg">
        <Heading as="h2" size="h3">最近安全事件</Heading>
        <div className="mt-4 space-y-2">
          {events.map((item) => (
            <div key={item.id} className="rounded-md border border-border/[0.08] p-3">
              <Text variant="body-sm" weight="semibold">{item.eventType}</Text>
              <Text variant="caption" color="tertiary" className="mt-1 block">
                {new Date(item.createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}{item.actorUserId ? ` · 操作人 ${item.actorUserId}` : ""}
              </Text>
            </div>
          ))}
          {!events.length ? <Text variant="body-sm" color="secondary">暂无事件或尚未查询。</Text> : null}
        </div>
      </Card>
    </div>
  );
}
