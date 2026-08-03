"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function MemberDeviceHeartbeat() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function pulse() {
      try {
        const response = await fetch("/api/member/device-heartbeat", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        });
        if (cancelled) return;
        if (response.ok) {
          setMessage(null);
          return;
        }
        const body = (await response.json().catch(() => null)) as { reason?: string; error?: string } | null;
        setMessage(
          body?.reason === "ACTIVE_ELSEWHERE"
            ? "会员内容已切换到另一台设备，本页将在重新取得使用权后恢复。"
            : body?.reason === "DEVICE_LIMIT"
              ? "该账号已绑定两台设备，请先在账户安全中移除旧设备。"
              : body?.error ?? "会员设备状态需要重新确认。"
        );
      } catch {
        // A transient network failure must not sign the user out.
      }
    }

    void pulse();
    const timer = window.setInterval(() => void pulse(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (!message) return null;
  return (
    <div className="sticky top-16 z-40 mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-body-sm text-amber-100">
      {message} <Link className="font-semibold underline" href="/account#account-security">管理登录设备</Link>
    </div>
  );
}
