"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AiTradingDeskClient } from "@/components/member/AiTradingDeskClient";
import { Card, Text } from "@/components/ui";
import type { AiTradingDeskSnapshot } from "@/types/ai-trading-desk";
import { readTradingSnapshot } from "@/lib/presentation/read-trading-snapshot";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const ConnectionGuide = dynamic(() => import("./MemberTradingOnboarding").then(m => m.MemberTradingOnboarding));

export function MemberTradingSetup() {
  const en = useLocale().locale === "en";
  const [open, setOpen] = useState(false);
  return <details className="mt-6 rounded-xl border border-white/10 p-4" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer font-medium">{en ? "Optional local connection guide (Chinese original)" : "个人账户接入教程（需要时展开）"}</summary>
    <p className="my-3 text-sm text-foreground-secondary">{en ? "The system ledger above is not your personal account. Subscription or viewing a plan does not enable copy trading. Keep exchange credentials on your own device." : "上方是系统账本，不是你的个人账户。购买会员或查看计划不会开启跟单；交易所密钥只留在自己的设备。"}</p>
    {open ? <ConnectionGuide /> : null}
  </details>;
}

export function MemberAiTradingDashboardLazy() {
  const [snapshot, setSnapshot] = useState<AiTradingDeskSnapshot | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const en = useLocale().locale === "en";

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    readTradingSnapshot(controller.signal)
      .then(next => { if (!controller.signal.aborted) setSnapshot(next); })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "读取失败");
      });
    return () => controller.abort();
  }, [attempt]);

  if (snapshot) return <AiTradingDeskClient initial={snapshot} />;
  return (
    <Card padding="lg" className="border-cyan-300/15 bg-cyan-300/[0.025]">
      <div className="h-1.5 w-28 animate-pulse rounded-full bg-cyan-300/40" />
      <Text variant="body-sm" color={error ? "secondary" : "tertiary"} className="mt-4 block">
        {error ? (en ? "Trading data is unavailable. Retry; no account state is assumed." : "交易数据暂时不可用，请重试；不据此判断账户状态。") : (en ? "Reading execution status and plans…" : "正在读取执行状态和计划……")}
      </Text>
      {error ? <button type="button" className="mt-3 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70" onClick={() => setAttempt(n => n + 1)}>{en ? "Retry" : "重试读取"}</button> : null}
    </Card>
  );
}
