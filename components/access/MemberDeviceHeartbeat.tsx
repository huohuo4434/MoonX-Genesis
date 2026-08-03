"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function MemberDeviceHeartbeat() {
  const { locale } = useLocale();
  const en = locale === "en";
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
            ? (en ? "Member content has moved to another device. This page will recover after access is reclaimed." : "会员内容已切换到另一台设备，本页将在重新取得使用权后恢复。")
            : body?.reason === "DEVICE_LIMIT"
              ? (en ? "Two devices are linked. Remove an old device in account security." : "该账号已绑定两台设备，请先在账户安全中移除旧设备。")
              : body?.error ?? (en ? "The member-device status needs confirmation." : "会员设备状态需要重新确认。")
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
  }, [en]);

  if (!message) return null;
  return (
    <div className="sticky top-16 z-40 mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-body-sm text-amber-100">
      {message} <Link className="font-semibold underline" href="/account#account-security">{en ? "Manage login devices" : "管理登录设备"}</Link>
    </div>
  );
}
