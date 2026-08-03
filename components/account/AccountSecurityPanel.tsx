"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Heading, Input, Text } from "@/components/ui";
import type { DeviceListItem } from "@/lib/auth/device-security";

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AccountSecurityPanel({ memberEligible }: { memberEligible: boolean }) {
  const [devices, setDevices] = useState<DeviceListItem[]>([]);
  const [setupRequired, setSetupRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordRequired, setPasswordRequired] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/account/devices", { cache: "no-store", credentials: "include" });
      const body = (await response.json()) as { devices?: DeviceListItem[]; setupRequired?: boolean };
      const nextDevices = body.devices ?? [];
      setDevices(nextDevices);
      setSetupRequired(Boolean(body.setupRequired));
      if (memberEligible && nextDevices.length > 0 && !nextDevices.some((item) => item.current)) {
        setPasswordRequired(true);
      }
    } catch {
      setMessage("暂时无法读取登录设备。");
    } finally {
      setLoading(false);
    }
  }, [memberEligible]);

  useEffect(() => { void load(); }, [load]);

  async function claim() {
    setMessage(null);
    const response = await fetch("/api/account/devices/claim", {
      method: "POST",
      cache: "no-store",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: password || undefined }),
    });
    const body = (await response.json().catch(() => null)) as { reason?: string; error?: string } | null;
    if (response.ok) {
      setMessage("本设备已取得会员内容使用权。");
      setPassword("");
      setPasswordRequired(false);
    } else if (body?.reason === "PASSWORD_REQUIRED") {
      setPasswordRequired(true);
      setMessage(body?.error ?? "请重新输入登录密码确认新设备。");
    } else if (body?.reason === "DEVICE_LIMIT") setMessage("已绑定两台设备，请先移除一台旧设备。");
    else setMessage(body?.error ?? "本设备确认失败。");
    await load();
  }

  async function revoke(deviceId: string) {
    setMessage(null);
    const response = await fetch(`/api/account/devices/${encodeURIComponent(deviceId)}`, {
      method: "DELETE",
      credentials: "include",
    });
    setMessage(response.ok ? "设备已移除。" : "设备移除失败。");
    await load();
  }

  async function logoutOthers() {
    setMessage(null);
    const response = await fetch("/api/account/devices/logout-others", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: password || undefined }),
    });
    const body = (await response.json().catch(() => null)) as {
      count?: number;
      reason?: string;
      error?: string;
    } | null;
    if (response.ok) {
      setMessage(`已退出其他设备（${body?.count ?? 0}台）。`);
      setPassword("");
    } else if (body?.reason === "PASSWORD_REQUIRED") {
      setPasswordRequired(true);
      setMessage(body.error ?? "请重新输入登录密码确认此安全操作。");
    } else {
      setMessage(body?.error ?? "操作失败。");
    }
    await load();
  }

  return (
    <Card id="account-security" padding="lg" className="mt-6 max-w-3xl scroll-mt-24">
      <Heading as="h2" size="h3">登录设备与账户安全</Heading>
      <Text variant="body-sm" color="secondary" className="mt-2 block">
        付费会员最多绑定2台设备，同一时间仅1台设备可使用会员内容。设备切换缓冲约120秒，不会因正常更换网络直接封禁。
      </Text>

      {setupRequired ? (
        <Text variant="body-sm" className="mt-4 block text-amber-300">
          设备安全数据库迁移尚未部署。请按升级报告执行安全迁移后再启用限制。
        </Text>
      ) : null}
      {message ? <Text variant="body-sm" className="mt-4 block">{message}</Text> : null}

      <div className="mt-5 space-y-3">
        {loading ? <Text variant="body-sm" color="secondary">正在读取设备…</Text> : null}
        {!loading && !devices.length ? (
          <Text variant="body-sm" color="secondary">当前尚未绑定会员设备。</Text>
        ) : null}
        {devices.map((device) => (
          <div key={device.id} className="flex flex-col gap-3 rounded-md border border-border/[0.08] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Text variant="body-sm" weight="semibold">
                {device.displayName}{device.current ? " · 当前设备" : ""}{device.revoked ? " · 已移除" : ""}
              </Text>
              <Text variant="caption" color="tertiary" className="mt-1 block">
                最后活动：{formatTime(device.lastSeenAt)}{device.lastRegion ? ` · ${device.lastRegion}` : ""}
              </Text>
            </div>
            {!device.revoked ? (
              <Button size="sm" variant="outline" onClick={() => void revoke(device.id)}>移除设备</Button>
            ) : null}
          </div>
        ))}
      </div>

      {memberEligible && passwordRequired ? (
        <label className="mt-5 block max-w-sm">
          <span className="mb-1 block text-caption text-foreground-tertiary">登录密码确认</span>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="输入当前账户密码"
          />
        </label>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        {memberEligible ? <Button onClick={() => void claim()} disabled={passwordRequired && password.length < 8}>改用本设备</Button> : null}
        <Button variant="outline" onClick={() => void logoutOthers()}>退出其他设备</Button>
      </div>
      <Text variant="caption" color="tertiary" className="mt-4 block">
        网站只保存服务器生成设备凭证的哈希和粗粒度浏览器/系统名称，不采集Canvas或硬件指纹，也不按固定IP封禁。
      </Text>
    </Card>
  );
}
