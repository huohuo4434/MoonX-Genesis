"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ReverifyReport = {
  scanned: number;
  verified: number;
  skipped: number;
  errors: string[];
};

export function WeeklyReverifyButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");

  async function run() {
    setRunning(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/reverify-weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: false }),
      });
      const data = await response.json() as { ok?: boolean; error?: string; report?: ReverifyReport };
      if (!response.ok || !data.ok) throw new Error(data.error || "重新验证失败");
      const report = data.report;
      setMessage(
        report
          ? `完成：扫描 ${report.scanned}，重算 ${report.verified}，已是新版 ${report.skipped}，错误 ${report.errors.length}。`
          : "重新验证完成。"
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "重新验证失败");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={running}
        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {running ? "正在重新核算…" : "立即重新核算旧周验证"}
      </button>
      {message ? <p className="mt-3 text-sm text-foreground-secondary">{message}</p> : null}
    </div>
  );
}
