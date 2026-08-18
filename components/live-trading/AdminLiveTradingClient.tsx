"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  UnifiedLiveCustodyAudit,
  UnifiedLiveHorizon,
  UnifiedLiveMode,
} from "@/types/unified-live-trading";

type AdminLiveAccount = {
  mode?: UnifiedLiveMode | string | null;
  newEntriesEnabled?: boolean | null;
  positionManagementEnabled?: boolean | null;
};

type AdminLiveStatusPayload = {
  migrationRequired?: boolean;
  account?: AdminLiveAccount | null;
  audit?: UnifiedLiveCustodyAudit | null;
};

type AdminLiveErrorPayload = {
  error?: string;
};

const HORIZONS: ReadonlyArray<{ value: UnifiedLiveHorizon; label: string }> = [
  { value: "SHORT", label: "认领为短线" },
  { value: "MEDIUM", label: "认领为中线" },
  { value: "LONG", label: "认领为长线" },
];

function toStatusPayload(value: unknown): AdminLiveStatusPayload {
  return value && typeof value === "object" ? (value as AdminLiveStatusPayload) : {};
}

function toErrorPayload(value: unknown): AdminLiveErrorPayload {
  return value && typeof value === "object" ? (value as AdminLiveErrorPayload) : {};
}

export default function AdminLiveTradingClient() {
  const [data, setData] = useState<AdminLiveStatusPayload | null>(null);
  const [message, setMessage] = useState("正在读取统一实盘托管状态……");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/live-trading", { cache: "no-store" });
    if (!response.ok) {
      setMessage("无权访问或状态读取失败。");
      return;
    }
    const payload = toStatusPayload(await response.json());
    setData(payload);
    setMessage(payload.migrationRequired ? "必须先部署Prisma迁移。" : "状态已更新。");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const action = async (body: Record<string, unknown>) => {
    setMessage("正在执行只读/托管操作……");
    const response = await fetch("/api/admin/live-trading", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = toErrorPayload(await response.json().catch(() => ({})));
    setMessage(
      response.ok
        ? "操作完成。"
        : `操作被安全闸门阻止：${payload.error ?? response.status}`,
    );
    await load();
  };

  const account = data?.account ?? null;
  const audit = data?.audit ?? null;
  const issues = audit?.issues ?? [];
  const orphans = audit?.orphanPositions ?? [];
  const blockerCount = issues.filter((item) => item.severity === "BLOCKER").length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 text-white">
      <section className="rounded-3xl border border-white/10 bg-slate-950/80 p-6">
        <p className="text-xs tracking-[0.25em] text-violet-300">UNIFIED LIVE CONTROL</p>
        <h1 className="mt-3 text-3xl font-semibold">统一AI实盘与持仓托管</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          唯一新开仓引擎为三周期策略。旧预测自动交易只保留审计，不再直接下单。暂停新开仓不得停止已有仓管理。
        </p>
        <div className="mt-4 rounded-2xl bg-white/5 p-4 text-sm">{message}</div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-xl bg-white/5 p-4">
            模式
            <br />
            <b>{account?.mode ?? "未初始化"}</b>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            新开仓
            <br />
            <b>{account?.newEntriesEnabled ? "允许" : "暂停"}</b>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            已有仓管理
            <br />
            <b>{account?.positionManagementEnabled ? "运行" : "停止"}</b>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            安全阻断
            <br />
            <b>{blockerCount}</b>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className="rounded-xl border border-white/15 px-4 py-2"
            onClick={() => action({ action: "RUN_AUDIT" })}
          >
            立即只读审计
          </button>
          <button
            className="rounded-xl bg-amber-500/20 px-4 py-2 text-amber-200"
            onClick={() => action({ action: "SET_MODE", mode: "MANAGE_ONLY" })}
          >
            只管理已有仓
          </button>
          <button
            className="rounded-xl bg-red-500/20 px-4 py-2 text-red-200"
            onClick={() => action({ action: "SET_MODE", mode: "PAUSED" })}
          >
            完全暂停
          </button>
          <button
            className="rounded-xl bg-emerald-500/20 px-4 py-2 text-emerald-200"
            onClick={() => action({ action: "SET_MODE", mode: "LIVE" })}
          >
            申请切换LIVE
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-slate-950/80 p-6">
        <h2 className="text-xl font-semibold">待认领交易所仓位</h2>
        <p className="mt-2 text-sm text-slate-400">
          认领只建立短线/中线/长线托管关系，不会因点击而自动开仓或平仓。
        </p>
        <div className="mt-4 space-y-3">
          {orphans.map((position) => (
            <div
              key={position.positionKey}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/5 p-4"
            >
              <div>
                {position.symbol} · {position.side} · 数量 {position.quantity} · 入场 {position.entryPrice}
              </div>
              <div className="flex gap-2">
                {HORIZONS.map((horizon) => (
                  <button
                    key={horizon.value}
                    className="rounded-lg border border-violet-400/30 px-3 py-1 text-sm"
                    onClick={() =>
                      action({
                        action: "CLAIM_POSITION",
                        positionKey: position.positionKey,
                        horizon: horizon.value,
                      })
                    }
                  >
                    {horizon.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {!orphans.length && (
            <div className="rounded-xl bg-white/5 p-6 text-slate-400">
              当前未发现待认领交易所仓位。
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-slate-950/80 p-6">
        <h2 className="text-xl font-semibold">托管问题</h2>
        <div className="mt-4 space-y-2">
          {issues.map((issue, index) => (
            <div
              key={`${issue.code}-${index}`}
              className="rounded-xl bg-white/5 p-3 text-sm"
            >
              <b>
                {issue.severity} · {issue.code}
              </b>
              <div className="mt-1 text-slate-400">
                {issue.symbol ? `${issue.symbol} · ` : ""}
                {issue.detail}
              </div>
            </div>
          ))}
          {!issues.length && <div className="text-slate-400">暂无问题，仍需保持定时对账。</div>}
        </div>
      </section>
    </main>
  );
}
