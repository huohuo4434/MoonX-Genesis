"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Heading, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type SessionPayload = {
  authenticated?: boolean;
  email?: string | null;
  isAdmin?: boolean;
  isActiveMember?: boolean;
};

export function MemberWelcomeGuide() {
  const { locale, href } = useLocale();
  const en = locale === "en";
  const [open, setOpen] = useState(false);
  const [storageKey, setStorageKey] = useState("");

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    fetch("/api/auth/session-lite", {
      cache: "no-store",
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => response.ok ? response.json() as Promise<SessionPayload> : null)
      .then((payload) => {
        if (cancelled || !payload?.authenticated || !payload.isActiveMember || payload.isAdmin) return;
        const email = (payload.email ?? "member").toLowerCase();
        const key = `moox_member_welcome_v1:${email}`;
        setStorageKey(key);
        try {
          if (window.localStorage.getItem(key) !== "seen") setOpen(true);
        } catch {
          setOpen(true);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  function close() {
    if (storageKey) {
      try {
        window.localStorage.setItem(storageKey, "seen");
      } catch {
        // Private browsing may block storage. Closing still works for this visit.
      }
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="moox-member-welcome-title"
        className="w-full max-w-xl rounded-2xl border border-border/[0.14] bg-background p-5 shadow-2xl sm:p-7"
      >
        <Heading id="moox-member-welcome-title" as="h2" size="h2">
          {en ? "Welcome to MOOX" : "欢迎加入MOOX"}
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 block">
          {en
            ? "You do not need to read every research note first. Follow these four steps."
            : "不用从头阅读所有研究材料，先按照下面四步使用即可。"}
        </Text>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            [en ? "1. Today" : "第1步：查看今日方向", en ? "Read the current direction and expected path." : "先看当前偏多、偏空还是震荡。"],
            [en ? "2. Weekly" : "第2步：查看本周阶段", en ? "Understand whether the week is rising, pulling back or ranging." : "判断这周正在上涨、回落还是震荡。"],
            [en ? "3. AI Strategy Desk" : "第3步：查看AI是否确认", en ? "Check whether the entry conditions are actually met." : "确认系统是否真正等到入场条件。"],
            [en ? "4. Verification" : "第4步：查看历史验证", en ? "Review locked records after their observation windows." : "用连续样本查看判断和执行表现。"],
          ].map(([title, body]) => (
            <div key={title} className="rounded-xl border border-border/[0.1] p-3">
              <Text variant="body-sm" weight="semibold">{title}</Text>
              <Text variant="caption" color="secondary" className="mt-1 block">{body}</Text>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="primary" onClick={close}>
            <Link href={href("/guide")}>{en ? "Start the 1-minute guide" : "开始1分钟引导"}</Link>
          </Button>
          <Button asChild variant="outline" onClick={close}>
            <Link href={href("/#moonx-view")}>{en ? "Go directly to Today" : "直接查看今日"}</Link>
          </Button>
          <Button variant="ghost" onClick={close}>{en ? "Close" : "暂时关闭"}</Button>
        </div>
      </div>
    </div>
  );
}
