"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, Heading, Input, Text } from "@/components/ui";
import type { DeviceAccessDecision } from "@/lib/auth/device-security";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function MemberDeviceGate({
  decision,
  nextPath,
}: {
  decision: DeviceAccessDecision | null;
  nextPath: string;
}) {
  const { locale } = useLocale();
  const en = locale === "en";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordRequired, setPasswordRequired] = useState(!decision || decision.reason === "COOKIE_REQUIRED" || decision.reason === "DEVICE_REVOKED");
  const reason = decision?.reason ?? "COOKIE_REQUIRED";

  async function claim() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/account/devices/claim", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password || undefined }),
      });
      const body = (await response.json().catch(() => null)) as DeviceAccessDecision | { reason?: string; error?: string } | null;
      if (response.ok) {
        window.location.assign(nextPath);
        return;
      }
      const bodyReason = body && "reason" in body ? body.reason : null;
      if (bodyReason === "PASSWORD_REQUIRED") setPasswordRequired(true);
      setError(
        bodyReason === "DEVICE_LIMIT"
          ? (en ? "Two devices are already linked. Remove an old device first." : "该账号已绑定两台设备，请先移除一台旧设备。")
          : bodyReason === "PASSWORD_REQUIRED"
            ? (body && "error" in body ? body.error ?? (en ? "Enter your password to confirm this device." : "请重新输入登录密码确认新设备。") : en ? "Enter your password to confirm this device." : "请重新输入登录密码确认新设备。")
          : body && "error" in body
            ? body.error ?? (en ? "Unable to confirm device" : "设备确认失败")
            : en ? "Unable to confirm this device. Please try again later." : "设备确认失败，请稍后重试。"
      );
    } catch {
      setError(en ? "Network request failed. Please try again later." : "网络连接失败，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  const title =
    reason === "ACTIVE_ELSEWHERE"
      ? en ? "Account in use on another device" : "账号正在另一台设备使用"
      : reason === "DEVICE_LIMIT"
        ? en ? "Two-device limit reached" : "已达到两台设备上限"
        : reason === "SETUP_REQUIRED"
          ? en ? "Device-security database setup is incomplete" : "设备安全功能尚未完成数据库部署"
          : en ? "Confirm this device to view member content" : "确认本设备后查看会员内容";

  const description =
    reason === "ACTIVE_ELSEWHERE"
      ? en
        ? `${decision?.activeElsewhereName ?? "Another device"} currently holds member-content access. Choosing “Use this device” will invalidate it on the next heartbeat.`
        : `${decision?.activeElsewhereName ?? "另一台设备"}当前持有会员内容使用权。选择“改用本设备”后，旧设备会在下次心跳时失效。`
      : reason === "DEVICE_LIMIT"
        ? en ? "A third device cannot access member content. Remove an unused device in account security." : "第三台设备不会获得会员内容权限。请进入账户安全，移除不再使用的旧设备。"
        : reason === "SETUP_REQUIRED"
          ? en ? "The code-side device guard is active, but the database migration is not deployed. Sign-in and purchases are unaffected." : "网站代码已启用设备守卫，但数据库迁移尚未部署。账户登录和购买不受影响。"
          : en ? "First use or an older login session needs a secure device credential. No invasive browser fingerprint is collected." : "首次使用或旧登录会话需要生成安全设备凭证，不会采集侵入式浏览器指纹。";

  return (
    <Card padding="lg" className="mx-auto max-w-2xl">
      <Heading as="h2" size="h3">{title}</Heading>
      <Text variant="body-sm" color="secondary" className="mt-3 block">{description}</Text>
      {passwordRequired && reason !== "SETUP_REQUIRED" && reason !== "DEVICE_LIMIT" ? (
        <label className="mt-4 block max-w-sm">
          <span className="mb-1 block text-caption text-foreground-tertiary">{en ? "Confirm login password" : "登录密码确认"}</span>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder={en ? "Enter your current password" : "输入当前账户密码"}
          />
          <Text variant="caption" color="tertiary" className="mt-1 block">
            {en ? "Used only to confirm the new device. The password is not stored in device records." : "仅用于确认新设备，不会写入数据库或设备记录。"}
          </Text>
        </label>
      ) : null}
      {error ? <Text variant="body-sm" className="mt-3 block text-red-400">{error}</Text> : null}
      <div className="mt-5 flex flex-wrap gap-3">
        {(reason === "ACTIVE_ELSEWHERE" || reason === "COOKIE_REQUIRED" || reason === "DEVICE_REVOKED") ? (
          <Button onClick={claim} isLoading={busy} disabled={passwordRequired && password.length < 8}>{en ? "Use this device" : "改用本设备"}</Button>
        ) : null}
        <Button asChild variant="outline"><Link href="/account#account-security">{en ? "Manage login devices" : "管理登录设备"}</Link></Button>
        <Button asChild variant="ghost"><Link href="/pricing">{en ? "View membership plans" : "查看会员方案"}</Link></Button>
      </div>
    </Card>
  );
}
