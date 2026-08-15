"use client";

import { useCallback, useEffect, useState } from "react";
import type { MemberPaperSnapshot, MemberTradingInstrument, MemberTradingPlan } from "@/types/member-trading-plan";

type TokenView = {
  id: string; label: string; prefix: string; active: boolean; expiresAt: string;
  lastUsedAt: string | null; createdAt: string; revokedAt: string | null;
};

const endpoint = {
  plan: "/api/v1/member/trading/plans/current",
  paper: "/api/v1/member/trading/paper",
  tokens: "/api/v1/member/trading/api-keys",
  instruments: "/api/v1/member/trading/instruments",
};

function money(value: number | null | undefined) {
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString("zh-CN", { maximumFractionDigits: 4 }) : "—";
}

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `请求失败（${response.status}）`);
  return body as T;
}

export function MemberTradingOnboarding() {
  const [symbol, setSymbol] = useState("");
  const [instruments, setInstruments] = useState<MemberTradingInstrument[]>([]);
  const [plan, setPlan] = useState<MemberTradingPlan | null>(null);
  const [paper, setPaper] = useState<MemberPaperSnapshot | null>(null);
  const [tokens, setTokens] = useState<TokenView[]>([]);
  const [revealedToken, setRevealedToken] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const refresh = useCallback(async (nextSymbol = symbol) => {
    setBusy("refresh"); setMessage("");
    try {
      const [planResponse, paperResponse, tokenResponse] = await Promise.all([
        fetch(`${endpoint.plan}?symbol=${encodeURIComponent(nextSymbol)}`, { cache: "no-store" }),
        fetch(endpoint.paper, { cache: "no-store" }),
        fetch(endpoint.tokens, { cache: "no-store" }),
      ]);
      setPlan(await readJson<MemberTradingPlan>(planResponse));
      setPaper(await readJson<MemberPaperSnapshot>(paperResponse));
      setTokens((await readJson<{ tokens: TokenView[] }>(tokenResponse)).tokens);
    } catch (error) { setMessage(error instanceof Error ? error.message : "读取失败"); }
    finally { setBusy(""); }
  }, [symbol]);

  useEffect(() => {
    void (async () => {
      try {
        const result = await readJson<{ instruments: MemberTradingInstrument[] }>(await fetch(endpoint.instruments, { cache: "no-store" }));
        setInstruments(result.instruments);
        const first = result.instruments.find((row) => row.availability === "AVAILABLE")?.canonicalSymbol ?? result.instruments[0]?.canonicalSymbol;
        if (first) { setSymbol(first); await refresh(first); }
      } catch (error) { setMessage(error instanceof Error ? error.message : "品种列表读取失败"); }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function paperAction(action: "ENTER" | "EXIT", positionId?: string, positionSymbol?: string) {
    if (action === "ENTER" && !plan) return;
    setBusy(action); setMessage("");
    try {
      const body = action === "ENTER" ? {
        action, symbol: plan!.symbol, idempotencyKey: `web-enter-${crypto.randomUUID()}`,
        expectedPlanId: plan!.planId, expectedPlanVersion: plan!.version, expectedRevisionId: plan!.revisionId,
      } : { action, symbol: positionSymbol!, positionId: positionId!, idempotencyKey: `web-exit-${crypto.randomUUID()}` };
      setPaper(await readJson<MemberPaperSnapshot>(await fetch(endpoint.paper, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })));
      setMessage(action === "ENTER" ? "Paper入场已记录。" : "Paper退出已结算。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Paper操作失败"); }
    finally { setBusy(""); }
  }

  async function createToken() {
    setBusy("token"); setMessage(""); setRevealedToken("");
    try {
      const result = await readJson<{ token: string; credential: TokenView; warning: string }>(await fetch(endpoint.tokens, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: `本地Bitget Agent ${new Date().toLocaleDateString("zh-CN")}`, expiresInDays: 90 }),
      }));
      setRevealedToken(result.token); setMessage(result.warning); await refresh(symbol);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Token创建失败"); }
    finally { setBusy(""); }
  }

  async function revokeToken(id: string) {
    setBusy(id); setMessage("");
    try {
      await readJson(await fetch(endpoint.tokens, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }));
      setTokens((current) => current.map((token) => token.id === id ? { ...token, active: false, revokedAt: new Date().toISOString() } : token));
      setMessage("只读Token已撤销，本地Agent将无法继续读取新计划。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "撤销失败"); }
    finally { setBusy(""); }
  }

  const ready = Boolean(plan?.risk.memberLocalAgentEligible && plan?.risk.tradingEligible);
  const openPositions = paper?.positions.filter((position) => position.status === "OPEN") ?? [];

  return <section className="mt-12 space-y-6" data-testid="member-local-trading-control">
    <div className="rounded-3xl border border-amber-300/30 bg-neutral-950 p-6 text-neutral-100">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">会员本地交易控制 · Windows小白版</p>
      <h2 className="mt-2 text-2xl font-bold">不用写代码：下载、粘贴Token、双击PAPER</h2>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-neutral-300">MOOX只提供已发布并锁定的只读计划。ZIP里没有您的Token，也没有任何Bitget密钥。Bitget Key、Secret、Passphrase只能留在您自己的电脑，本站没有也不会提供上传这些密钥的输入框。</p>
      <a className="mt-5 inline-flex rounded-xl bg-amber-300 px-5 py-3 text-base font-bold text-black" download href="/downloads/MOOX-Bitget-Windows.zip">下载Windows一键包（推荐）</a>
      <ol className="mt-5 grid gap-3 text-sm text-neutral-300 md:grid-cols-3">
        <li className="rounded-xl bg-white/5 p-4"><b className="text-white">1. 下载并解压ZIP</b><br />先打开“README-先看我.txt”；没有Node.js就按说明安装一次。</li>
        <li className="rounded-xl bg-white/5 p-4"><b className="text-white">2. 创建Token并粘贴</b><br />在本页创建一次性只读Token，粘贴到“MOOX配置.txt”的等号右边。</li>
        <li className="rounded-xl bg-white/5 p-4"><b className="text-white">3. 双击启动PAPER</b><br />双击“1-启动PAPER.bat”。它不连接Bitget，也不会下真实订单。</li>
      </ol>
      <p className="mt-4 text-sm text-amber-200">本包没有LIVE按钮。DRY_RUN也只做连接检查；LIVE仍要求在本机命令行手工双确认并先成功完成DRY_RUN。</p>
      <details className="mt-4 text-sm text-neutral-400"><summary className="cursor-pointer">高级用户：单独下载原始文件</summary><div className="mt-3 flex flex-wrap gap-3"><a className="rounded-xl border border-neutral-700 px-4 py-2" download href="/downloads/moox-bitget-local-agent.mjs">Agent源码</a><a className="rounded-xl border border-neutral-700 px-4 py-2" download href="/downloads/moox-bitget-local-agent.env.example">环境变量模板</a><a className="rounded-xl border border-neutral-700 px-4 py-2" download href="/downloads/moox-bitget-local-agent-guide.md">高级说明</a></div></details>
    </div>

    <div className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-3xl border border-white/10 bg-neutral-950 p-6 text-neutral-100">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-bold">当前统一计划</h3><div className="flex gap-2"><select aria-label="交易品种" className="rounded-lg border border-neutral-700 bg-black px-3 py-2" value={symbol} onChange={(event) => { setSymbol(event.target.value); void refresh(event.target.value); }}>{instruments.map((row) => <option key={row.canonicalSymbol} value={row.canonicalSymbol}>{row.displayName} · {row.canonicalSymbol} · {row.availability === "AVAILABLE" ? "可Paper/本地" : "仅研究"}</option>)}</select><button className="rounded-lg border border-neutral-700 px-3 py-2" disabled={Boolean(busy) || !symbol} onClick={() => void refresh(symbol)}>读取</button></div></div>
        {plan ? <div className="mt-5 space-y-3 text-sm">
          <p className="text-lg font-bold">{plan.symbol} · {plan.state} · V{plan.version}</p>
          <p>正式方向：<b>{plan.authority.direction}</b>　缠论阶段：<b>{plan.chan.stageLabel}</b></p>
          <p>{plan.instrument.displayName} · {plan.instrument.availability === "AVAILABLE" ? `Bitget精确合约 ${plan.instrument.bitgetSymbol}` : "Bitget无同名在线合约 · RESEARCH_ONLY / UNAVAILABLE"}</p>
          <p>现价 {money(plan.execution.currentPrice)}　确认 {money(plan.execution.confirmationAboveOrBelow)}</p>
          {plan.execution.levelStatus === "VALID" && plan.execution.takeProfits ? <><p>失效/止损 {money(plan.execution.stopLoss)}</p><p>止盈：{plan.execution.takeProfits.map(money).join(" / ")}</p></> : <p className="text-amber-300">执行点位已隐藏：{plan.execution.statusReason}</p>}
          <p className={ready ? "text-emerald-300" : "text-amber-300"}>{ready ? "正式锁定、条件满足且行情新鲜：允许Paper与本地Agent候选。" : "当前不满足执行门禁：保持等待。"}</p>
          <button className="rounded-xl bg-emerald-400 px-4 py-2 font-bold text-black disabled:opacity-40" disabled={!ready || Boolean(busy)} onClick={() => void paperAction("ENTER")}>按此版本Paper入场</button>
        </div> : <p className="mt-5 text-neutral-400">正在读取正式计划……</p>}
      </div>

      <div className="rounded-3xl border border-white/10 bg-neutral-950 p-6 text-neutral-100">
        <h3 className="text-xl font-bold">个人Paper账户</h3>
        {paper ? <><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><p>权益<br /><b>{money(paper.account.equity)}</b></p><p>已实现<br /><b>{money(paper.account.realizedPnl)}</b></p><p>未实现<br /><b>{money(paper.account.unrealizedPnl)}</b></p><p>最大回撤<br /><b>{money(paper.account.maxDrawdownPct)}%</b></p></div>
          <div className="mt-5 space-y-2">{openPositions.length ? openPositions.map((position) => <div key={position.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3 text-sm"><span>{position.symbol} {position.direction} · {money(position.quantity)} · 浮盈亏 {money(position.unrealizedPnl)}</span><button className="rounded-lg border border-rose-400/50 px-3 py-1 text-rose-200" disabled={Boolean(busy)} onClick={() => void paperAction("EXIT", position.id, position.symbol)}>Paper退出</button></div>) : <p className="text-sm text-neutral-400">暂无开放Paper持仓。</p>}</div>
          <details className="mt-4 text-sm"><summary className="cursor-pointer text-neutral-300">最近Paper事件（{paper.events.length}）</summary><div className="mt-2 space-y-1 text-neutral-400">{paper.events.slice(0, 10).map((event) => <p key={event.id}>{new Date(event.createdAt).toLocaleString("zh-CN")} · {event.eventType} · {money(event.quantity)} @ {money(event.price)}</p>)}</div></details>
        </> : <p className="mt-5 text-neutral-400">正在读取Paper账户……</p>}
      </div>
    </div>

    <div className="rounded-3xl border border-white/10 bg-neutral-950 p-6 text-neutral-100">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-bold">本地Agent只读Token</h3><p className="mt-1 text-sm text-neutral-400">权限固定为 plans:read；不能操作Paper、不能下单、不能读取或保存交易所密钥。</p></div><button className="rounded-xl bg-sky-300 px-4 py-2 text-sm font-bold text-black" disabled={Boolean(busy)} onClick={() => void createToken()}>创建90天Token</button></div>
      {revealedToken && <div className="mt-4 rounded-xl border border-amber-300/40 bg-amber-300/10 p-4"><p className="font-bold text-amber-200">只显示一次：复制后，用记事本打开ZIP里的“MOOX配置.txt”，粘贴到 MOOX_SIGNAL_TOKEN= 的等号右边：</p><code className="mt-2 block break-all text-sm">{revealedToken}</code><button className="mt-2 rounded-lg border border-amber-300/50 px-3 py-1 text-sm" onClick={() => void navigator.clipboard.writeText(revealedToken)}>复制Token</button></div>}
      <div className="mt-4 space-y-2">{tokens.map((token) => <div key={token.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/5 p-3 text-sm"><span>{token.label} · {token.prefix} · 到期 {new Date(token.expiresAt).toLocaleDateString("zh-CN")} · {token.active ? "有效" : "已撤销"}</span>{token.active && <button className="rounded-lg border border-rose-400/50 px-3 py-1 text-rose-200" disabled={Boolean(busy)} onClick={() => void revokeToken(token.id)}>撤销</button>}</div>)}</div>
      {message && <p role="status" className="mt-4 text-sm text-amber-200">{message}</p>}
    </div>
  </section>;
}
