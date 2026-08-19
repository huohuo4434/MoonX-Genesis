// MOOX_V7206_MEMBER_READONLY_ONBOARDING
"use client";

import { useCallback, useEffect, useState } from "react";
import type { MemberTradingInstrument, MemberTradingPlan } from "@/types/member-trading-plan";

type TokenView = { id: string; label: string; prefix: string; active: boolean; expiresAt: string; lastUsedAt: string | null; createdAt: string; revokedAt: string | null };
const endpoint = { plan: "/api/v1/member/trading/plans/current", tokens: "/api/v1/member/trading/api-keys", instruments: "/api/v1/member/trading/instruments" };

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body as { error?: string }).error || `请求失败（${response.status}）`);
  return body as T;
}
function price(value: number | null | undefined): string { return value == null || !Number.isFinite(value) ? "—" : Number(value).toLocaleString("zh-CN", { maximumFractionDigits: 6 }); }

const HORIZONS = [
  { title: "短线", period: "1—3天", note: "日盘与短周期结构，重点看确认位和快速失效。" },
  { title: "中线", period: "1—15天", note: "周度方向与日内节奏结合，等待4H/1H结构确认。" },
  { title: "长线", period: "1—3个月", note: "月度/季度背景为主，日线与4H只找分批位置。" },
  { title: "超长线", period: "约1年", note: "年度/长期研究做背景，阶段观点变化时重新评估。" },
] as const;

export function MemberTradingOnboarding() {
  const [symbol, setSymbol] = useState("");
  const [instruments, setInstruments] = useState<MemberTradingInstrument[]>([]);
  const [plan, setPlan] = useState<MemberTradingPlan | null>(null);
  const [tokens, setTokens] = useState<TokenView[]>([]);
  const [revealedToken, setRevealedToken] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const refresh = useCallback(async (nextSymbol = symbol) => {
    if (!nextSymbol) return;
    setBusy("refresh"); setMessage("");
    try {
      const [planResponse, tokenResponse] = await Promise.all([
        fetch(`${endpoint.plan}?symbol=${encodeURIComponent(nextSymbol)}`, { cache: "no-store" }),
        fetch(endpoint.tokens, { cache: "no-store" }),
      ]);
      setPlan(await readJson<MemberTradingPlan>(planResponse));
      setTokens((await readJson<{ tokens: TokenView[] }>(tokenResponse)).tokens);
    } catch (error) { setPlan(null); setMessage(error instanceof Error ? error.message : "读取失败"); }
    finally { setBusy(""); }
  }, [symbol]);

  useEffect(() => { void (async () => {
    try {
      const result = await readJson<{ instruments: MemberTradingInstrument[] }>(await fetch(endpoint.instruments, { cache: "no-store" }));
      setInstruments(result.instruments);
      const first = result.instruments.find((row) => row.availability === "AVAILABLE")?.canonicalSymbol ?? result.instruments[0]?.canonicalSymbol ?? "";
      if (first) { setSymbol(first); await refresh(first); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "品种列表读取失败"); }
  })(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function createToken() {
    setBusy("token"); setMessage(""); setRevealedToken("");
    try {
      const result = await readJson<{ token: string; credential: TokenView; warning: string }>(await fetch(endpoint.tokens, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: `只读监控 ${new Date().toLocaleDateString("zh-CN")}`, expiresInDays: 90 }) }));
      setRevealedToken(result.token); setMessage("Token只显示一次。复制后粘贴到一键包的 MOOX配置.txt。"); await refresh(symbol);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Token创建失败"); }
    finally { setBusy(""); }
  }
  async function revokeToken(id: string) {
    setBusy(id); setMessage("");
    try {
      await readJson(await fetch(endpoint.tokens, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }));
      setTokens((current) => current.map((token) => token.id === id ? { ...token, active: false, revokedAt: new Date().toISOString() } : token));
      setMessage("只读Token已撤销。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "撤销失败"); }
    finally { setBusy(""); }
  }

  return <section className="space-y-6">
    <div className="rounded-3xl border border-violet-300/20 bg-[#0a0c12] p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">MOOX AI RESEARCH DESK</p>
      <h2 className="mt-2 text-2xl font-semibold">AI交易研究台</h2>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-white/55">研究方向、确认位、失效位和历史表现集中在这里。真实交易由会员自己在交易所确认。</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{HORIZONS.map((row) => <div key={row.title} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"><p className="font-semibold">{row.title} · {row.period}</p><p className="mt-2 text-xs leading-6 text-white/45">{row.note}</p></div>)}</div>
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-3xl border border-white/10 bg-[#0a0c12] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-semibold">当前研究计划</h3><div className="flex gap-2"><select aria-label="研究品种" className="rounded-xl border border-white/10 bg-black px-3 py-2 text-sm" value={symbol} onChange={(event) => { setSymbol(event.target.value); void refresh(event.target.value); }}>{instruments.map((row) => <option key={row.assetId} value={row.canonicalSymbol ?? ""} disabled={!row.canonicalSymbol}>{row.displayName} · {row.canonicalSymbol ?? "仅研究"}</option>)}</select><button className="rounded-xl border border-white/10 px-3 py-2 text-sm" disabled={Boolean(busy) || !symbol} onClick={() => void refresh(symbol)}>刷新</button></div></div>
        {plan ? <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><div className="rounded-xl bg-white/[0.035] p-4"><p className="text-xs text-white/40">方向</p><p className="mt-2 text-xl font-semibold">{plan.authority.direction}</p></div><div className="rounded-xl bg-white/[0.035] p-4"><p className="text-xs text-white/40">缠论阶段</p><p className="mt-2 text-xl font-semibold">{plan.chan.stageLabel}</p></div><div className="rounded-xl bg-white/[0.035] p-4"><p className="text-xs text-white/40">当前价格 / 确认位</p><p className="mt-2">{price(plan.execution.currentPrice)} / {price(plan.execution.confirmationAboveOrBelow)}</p></div><div className="rounded-xl bg-white/[0.035] p-4"><p className="text-xs text-white/40">失效位 / 目标</p><p className="mt-2">{price(plan.execution.stopLoss)} / {plan.execution.takeProfits?.map(price).join(" · ") || "—"}</p></div></div> : <p className="mt-5 text-sm text-white/45">该品种暂无可读取计划。</p>}
      </div>

      <div className="rounded-3xl border border-cyan-300/15 bg-[#0a0c12] p-5 sm:p-6">
        <h3 className="text-xl font-semibold">一键只读监控</h3>
        <p className="mt-2 text-sm leading-7 text-white/50">只读MOOX研究计划，不连接Bitget、不下单。第一次只需“创建Token → 粘贴配置 → 双击启动”。</p>
        <div className="mt-5 flex flex-wrap gap-3"><a download href="/downloads/MOOX会员只读监控-一键部署.zip" className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-black">下载一键包</a><a download href="/downloads/MOOX会员只读监控详细说明.md" className="rounded-xl border border-white/10 px-4 py-2.5 text-sm">下载详细说明</a><button className="rounded-xl border border-violet-300/30 px-4 py-2.5 text-sm text-violet-100" disabled={Boolean(busy)} onClick={() => void createToken()}>创建90天只读Token</button></div>
        {revealedToken ? <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.05] p-3"><p className="text-xs text-amber-100">只显示一次：</p><code className="mt-2 block break-all text-xs text-white/75">{revealedToken}</code><button className="mt-2 text-xs text-cyan-200" onClick={() => void navigator.clipboard.writeText(revealedToken)}>复制Token</button></div> : null}
        <div className="mt-4 space-y-2">{tokens.filter((token) => token.active).slice(0, 4).map((token) => <div key={token.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] p-3 text-xs text-white/50"><span>{token.label} · {token.prefix} · 至 {new Date(token.expiresAt).toLocaleDateString("zh-CN")}</span><button className="text-rose-200" disabled={Boolean(busy)} onClick={() => void revokeToken(token.id)}>撤销</button></div>)}</div>
      </div>
    </div>
    {message ? <p role="status" className="text-sm text-amber-200">{message}</p> : null}
  </section>;
}
