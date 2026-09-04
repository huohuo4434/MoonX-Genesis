"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  restoreBlockers?: Array<{ code?: string; message?: string; detail?: string }>;
};

type AdminLiveErrorPayload = {
  ok?: boolean;
  account?: AdminLiveAccount;
  error?: string;
  blockers?: Array<{ code?: string; message?: string; detail?: string }>;
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
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const readGeneration = useRef(0);

  const load = useCallback(async () => {
    const generation = ++readGeneration.current;
    try {
      const response = await fetch("/api/admin/live-trading", { cache: "no-store", signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error("STATUS_UNAVAILABLE");
      const payload = toStatusPayload(await response.json());
      if (generation !== readGeneration.current) return null;
      if (payload.migrationRequired === true) {
        setData({ migrationRequired: true });
        return true;
      }
      if (!payload.account || !["LIVE", "MANAGE_ONLY", "PAUSED"].includes(payload.account.mode ?? "")
        || typeof payload.account.newEntriesEnabled !== "boolean"
        || typeof payload.account.positionManagementEnabled !== "boolean"
        || typeof payload.migrationRequired !== "boolean"
        || !Array.isArray(payload.restoreBlockers)
        || !payload.restoreBlockers.every((item) => item && typeof item === "object")) {
        throw new Error("INVALID_STATUS");
      }
      setData(payload);
      return true;
    } catch {
      if (generation !== readGeneration.current) return null;
      setData(null);
      return false;
    }
  }, []);

  useEffect(() => {
    void load().then((ok) => {
      if (ok !== null && !inFlight.current) setMessage(ok ? "状态已读取。" : "状态读取失败，请刷新页面；当前开关状态未知。");
    });
  }, [load]);

  const action = async (body: Record<string, unknown>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    readGeneration.current += 1;
    setBusy(true);
    setMessage("正在提交，请勿重复点击……");
    let resultMessage = "请求未能确认，请核对最新状态；不要假定操作已经完成。";
    try {
      const response = await fetch("/api/admin/live-trading", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      });
      const payload = toErrorPayload(await response.json().catch(() => ({})));
      if (response.ok && body.action === "SET_MODE" && (payload.ok !== true
        || payload.account?.mode !== body.mode
        || payload.account?.newEntriesEnabled !== (body.mode === "LIVE")
        || payload.account?.positionManagementEnabled !== true)) throw new Error("UNCONFIRMED_MODE");
      const blockerText = payload.blockers
        ?.map((item) => item.message || item.detail || item.code)
        .filter(Boolean)
        .join("；");
      resultMessage = response.ok
        ? body.mode === "LIVE"
          ? "开仓许可请求已确认；以下为最新状态，实际下单仍须通过实验期限、策略与风控检查。"
          : body.mode === "MANAGE_ONLY"
            ? "关闭新开仓请求已确认；以下为最新状态，已有仓位继续托管，未执行一键平仓。"
            : "托管操作已完成。"
        : `操作未完成：${payload.error ?? response.status}${blockerText ? `；${blockerText}` : ""}`;
    } catch {
      // A lost response does not establish whether the server applied the change.
    } finally {
      const refreshed = await load();
      setMessage(`${resultMessage}${refreshed ? "" : " 最新状态读取失败，请刷新核对。"}`);
      inFlight.current = false;
      setBusy(false);
    }
  };

  const account = data?.account ?? null;
  const audit = data?.audit ?? null;
  const issues = audit?.issues ?? [];
  const orphans = audit?.orphanPositions ?? [];
  const restoreBlockers = data?.restoreBlockers ?? [];
  const blockerCount = restoreBlockers.length;
  const entryPermissionOn = account?.mode === "LIVE" && account.newEntriesEnabled === true;
  const cannotEnable = busy || !account || data?.migrationRequired !== false || !Array.isArray(data?.restoreBlockers) || blockerCount > 0 || entryPermissionOn;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 text-white">
      <section className="rounded-3xl border border-white/10 bg-slate-950/80 p-6">
        <p className="text-xs tracking-[0.25em] text-violet-300">UNIFIED LIVE CONTROL</p>
        <h1 className="mt-3 text-3xl font-semibold">AI自动交易开关</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          开启：允许现有策略用真实资金开仓。关闭：停止新开仓，已有仓位继续管理，不自动平仓。
        </p>
        <div role="status" aria-live="polite" className="mt-4 rounded-2xl bg-white/5 p-4 text-sm">{message}</div>
        {account && blockerCount > 0 ? (
          <p role="alert" className="mt-4 text-lg font-semibold text-red-300">
            实盘状态：暂不能开新单{entryPermissionOn ? "（开关已开，但运行条件未通过）" : ""}
          </p>
        ) : null}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            className="rounded-2xl bg-emerald-600 px-6 py-5 text-xl font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            disabled={cannotEnable}
            aria-describedby="live-control-notice"
            onClick={() => {
              if (cannotEnable) return;
              // The explicitly labelled button is the administrator's confirmation; never run on mount.
              void action({ action: "SET_MODE", mode: "LIVE", confirmation: "LIVE1000" });
            }}
          >一键开启</button>
          <button
            className="rounded-2xl bg-red-600 px-6 py-5 text-xl font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            disabled={busy}
            onClick={() => void action({ action: "SET_MODE", mode: "MANAGE_ONLY" })}
          >一键关闭</button>
        </div>
        <p id="live-control-notice" className="mt-3 text-sm leading-6 text-slate-300">
          点击“一键开启”即确认允许现有1000U实盘引擎开仓。开关不等于已经成交，也不会自动续期实验；实验到期或风控未通过时仍不下单。
          <a className="ml-2 underline" href="/admin/bitget-demo">查看实际运行与实验期限</a>
        </p>
        {data?.migrationRequired ? <p role="alert" className="mt-3 text-red-300">数据库迁移尚未完成，暂不能开启。</p> : null}
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-xl bg-white/5 p-4">
            开仓许可
            <br />
            <b>{!account ? "未知" : entryPermissionOn ? "已开启" : "已关闭"}</b>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            新开仓
            <br />
            <b>{!account ? "未知" : blockerCount > 0 ? "被运行条件阻断" : entryPermissionOn ? "等待策略与风控检查" : "暂停"}</b>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            已有仓管理
            <br />
            <b>{!account ? "未知" : account.positionManagementEnabled ? "已启用" : "未启用"}</b>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            开启前检查
            <br />
            <b>{!account ? "未取得完整状态" : `${blockerCount}项阻断`}</b>
          </div>
        </div>
        {blockerCount > 0 ? (
          <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
            <b>暂不能开启：</b>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {restoreBlockers.map((item, index) => (
                <li key={`${item.code ?? "BLOCKER"}-${index}`}>
                  {item.message || item.detail || item.code || "安全闸门未通过"}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <details className="mt-6 rounded-3xl border border-white/10 p-4">
        <summary className="cursor-pointer text-slate-300">高级诊断与仓位托管（平时不用展开）</summary>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            className="rounded-xl border border-white/15 px-4 py-2"
            disabled={busy || !audit}
            onClick={() => action({ action: "RUN_AUDIT" })}
          >
            执行托管对账（可能补充保护单）
          </button>
        </div>

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
                    disabled={busy || !audit}
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
              {audit ? "当前未发现待认领交易所仓位。" : "状态未取得，不能判断仓位情况。"}
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
          {!issues.length && <div className="text-slate-400">{audit ? "暂无托管问题，仍需保持定时对账。" : "状态未取得，不能判断托管情况。"}</div>}
        </div>
      </section>
      </details>
    </main>
  );
}
