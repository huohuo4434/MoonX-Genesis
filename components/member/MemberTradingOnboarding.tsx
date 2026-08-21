// MOOX_V7206_MEMBER_READONLY_ONBOARDING
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { MemberTradingInstrument, MemberTradingPlan } from "@/types/member-trading-plan";
import { MEMBER_METHODOLOGIES, type MemberMethodologyId } from "@/types/member-methodology";

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
  const [methodology, setMethodology] = useState<MemberMethodologyId>("LIUYAO_CHAN");
  const [requireIpWhitelist, setRequireIpWhitelist] = useState(true);

  const refresh = useCallback(async (nextSymbol = symbol) => {
    if (!nextSymbol) return;
    setBusy("refresh"); setMessage("");
    try {
      const [planResponse, tokenResponse] = await Promise.all([
        fetch(`${endpoint.plan}?symbol=${encodeURIComponent(nextSymbol)}&methodology=${encodeURIComponent(methodology)}`, { cache: "no-store" }),
        fetch(endpoint.tokens, { cache: "no-store" }),
      ]);
      setPlan(await readJson<MemberTradingPlan>(planResponse));
      setTokens((await readJson<{ tokens: TokenView[] }>(tokenResponse)).tokens);
    } catch (error) { setPlan(null); setMessage(error instanceof Error ? error.message : "读取失败"); }
    finally { setBusy(""); }
  }, [symbol, methodology]);

  useEffect(() => { void (async () => {
    try {
      const result = await readJson<{ instruments: MemberTradingInstrument[] }>(await fetch(endpoint.instruments, { cache: "no-store" }));
      setInstruments(result.instruments);
      const first = result.instruments.find((row) => row.availability === "AVAILABLE")?.canonicalSymbol ?? result.instruments[0]?.canonicalSymbol ?? "";
      if (first) { setSymbol(first); await refresh(first); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "品种列表读取失败"); }
  })(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (symbol) void refresh(symbol); }, [methodology]); // eslint-disable-line react-hooks/exhaustive-deps

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

  return <section className="space-y-6" data-testid="member-local-trading-control">
    <div className="rounded-3xl border border-amber-300/25 bg-[linear-gradient(145deg,rgba(52,38,14,.72),rgba(8,9,14,.98))] p-5 sm:p-7">
      <p className="text-xs font-semibold tracking-[0.2em] text-amber-200">MOOX × BITGET LOCAL AGENT</p>
      <h1 className="mt-2 text-3xl font-semibold">会员AI交易安全接入</h1>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-white/60">Bitget API Key、Secret Key、Passphrase只粘贴到您自己电脑里的“MOOX配置.txt”，绝不上传MOOX网站。网站只签发可撤销的只读计划Token。</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link prefetch={false} href="/api/v1/member/trading/artifacts/windows" className="rounded-xl bg-amber-300 px-5 py-3 font-semibold text-black">下载Windows一键包（推荐）</Link>
        <Link prefetch={false} href="/api/v1/member/trading/artifacts/pdf" className="rounded-xl border border-white/15 px-5 py-3 text-sm">下载图文教程PDF</Link>
        <Link prefetch={false} href="/api/v1/member/trading/artifacts/video" className="rounded-xl border border-white/15 px-5 py-3 text-sm">下载教程视频</Link>
      </div>
      <div className="mt-5 grid gap-2 text-sm text-white/70 sm:grid-cols-3">
        <div>1. 下载并解压ZIP</div><div>2. 创建Token并粘贴</div><div>3. 双击启动PAPER</div>
      </div>
      <p className="mt-3 text-xs leading-6 text-amber-100/70">本包没有LIVE按钮。本站没有也不会提供上传这些交易所密钥的输入框；所有Bitget凭证只保存在会员自己的电脑或VPS。</p>
      <details className="mt-4 rounded-xl border border-white/10 p-4 text-sm text-white/60">
        <summary className="cursor-pointer text-white/80">高级用户：单独下载原始文件</summary>
        <div className="mt-3 flex flex-wrap gap-3"><Link prefetch={false} href="/api/v1/member/trading/artifacts/agent" className="underline">Agent程序</Link><Link prefetch={false} href="/api/v1/member/trading/artifacts/config" className="underline">配置模板</Link><Link prefetch={false} href="/api/v1/member/trading/artifacts/guide" className="underline">Markdown说明</Link></div>
      </details>
      <video className="mt-6 w-full rounded-2xl border border-white/10 bg-black" controls preload="metadata" poster="/api/v1/member/trading/artifacts/poster">
        <source src="/api/v1/member/trading/artifacts/video" type="video/mp4" />
      </video>
    </div>

    <div className="rounded-3xl border border-cyan-300/15 bg-[#0a0c12] p-5 sm:p-7">
      <h2 className="text-2xl font-semibold">IP 白名单开关</h2>
      <p className="mt-2 text-sm leading-7 text-white/55">Bitget 不强制所有 API Key 都绑定公网 IP。固定公网 IPv4 用户建议开启；家庭宽带、移动网络或动态 IP 用户可以关闭。这个选择只保存在您自己的配置文件中，网站不接收您的 Bitget 白名单内容。</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <button type="button" aria-pressed={requireIpWhitelist} onClick={() => setRequireIpWhitelist(true)} className={`rounded-2xl border p-4 text-left ${requireIpWhitelist ? "border-emerald-300/45 bg-emerald-400/[0.08]" : "border-white/[0.08] bg-white/[0.025]"}`}>
          <div className="font-semibold">绑定固定公网 IP（推荐）</div>
          <p className="mt-2 text-xs leading-6 text-white/50">把运行 Agent 的固定出口 IPv4 填入 Bitget 白名单；检测不到白名单时，LIVE 拒绝新开仓。</p>
        </button>
        <button type="button" aria-pressed={!requireIpWhitelist} onClick={() => setRequireIpWhitelist(false)} className={`rounded-2xl border p-4 text-left ${!requireIpWhitelist ? "border-amber-300/45 bg-amber-400/[0.08]" : "border-white/[0.08] bg-white/[0.025]"}`}>
          <div className="font-semibold">不绑定 IP（动态网络）</div>
          <p className="mt-2 text-xs leading-6 text-white/50">适合没有固定公网 IP 的会员。仍可接入，但 Key 泄露风险更高；必须关闭提现和划转权限并定期轮换 Key。</p>
        </button>
      </div>
      <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-4">
        <p className="text-xs text-white/45">请在本机 MOOX配置.txt 中填写：</p>
        <code className="mt-2 block text-sm text-cyan-100">MOOX_REQUIRE_IP_WHITELIST={requireIpWhitelist ? "true" : "false"}</code>
        <button type="button" className="mt-2 text-xs text-cyan-200" onClick={() => void navigator.clipboard.writeText(`MOOX_REQUIRE_IP_WHITELIST=${requireIpWhitelist ? "true" : "false"}`)}>复制这一行</button>
      </div>
      {!requireIpWhitelist ? <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.05] p-3 text-xs leading-6 text-amber-100">关闭白名单不会开启提现权限，也不会放宽止损、仓位、回撤、行情新鲜度和保护单检查。若电脑中毒或 Key 可能泄露，请立即在 Bitget 删除该 API Key。</p> : null}
    </div>

    <div className="rounded-3xl border border-white/10 bg-[#0a0c12] p-5 sm:p-7">
      <h2 className="text-2xl font-semibold">一步一步接入</h2>
      <ol className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[
          ["1", "安装Node.js", "安装Node.js 20或更高版本，保持默认选项。"],
          ["2", "下载并解压", "下载Windows一键包，完整解压后先看README。"],
          ["3", "创建MOOX Token", "点击下方创建90天Token；只显示一次，复制到MOOX_SIGNAL_TOKEN=后面。"],
          ["4", "先运行PAPER", "双击“1-启动PAPER.bat”。PAPER不连接Bitget，不会产生真实订单。"],
          ["5", "创建Bitget UTA API", "个人中心→API管理→创建API；只给uta_mgt读取和uta_trade交易，禁止提币与划转。"],
          ["6", "只在本机粘贴三项", "把API Key、Secret Key、Passphrase粘贴到本机MOOX配置.txt，绝不粘贴到网站或发给客服。"],
          ["7", "选择IP白名单", "有固定公网IPv4建议绑定；没有固定IP可选择关闭，并在本机配置 MOOX_REQUIRE_IP_WHITELIST=false。"],
          ["8", "运行DRY_RUN", "双击“2-检查DRY_RUN.bat”，检查权限、所选IP策略、账户模式和风险基线，不下单。"],
          ["9", "小仓试运行", "LIVE没有双击按钮，必须本机命令行双重确认；不熟悉命令行请停留在PAPER/DRY_RUN。"],
        ].map(([number, title, detail]) => <li key={number} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"><div className="text-xs text-amber-200">STEP {number}</div><div className="mt-1 font-semibold">{title}</div><p className="mt-2 text-xs leading-6 text-white/45">{detail}</p></li>)}
      </ol>
    </div>

    <div className="rounded-3xl border border-violet-300/15 bg-[#0a0c12] p-5 sm:p-7">
      <h2 className="text-2xl font-semibold">选择试运行方法</h2>
      <p className="mt-2 text-sm leading-6 text-white/50">六种方法都还在试运行。选择只决定当前订单必须具备哪些前置证据；任何方法都不能绕过止损、仓位、行情新鲜度和交易所保护单。</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{MEMBER_METHODOLOGIES.map((item) => <button key={item.id} onClick={() => { setMethodology(item.id); setMessage(`已选择${item.label}；请把 MOOX_METHOD=${item.id} 写入本机MOOX配置.txt。`); }} className={`rounded-2xl border p-4 text-left ${methodology === item.id ? "border-violet-300/50 bg-violet-400/10" : "border-white/[0.08] bg-white/[0.025]"}`}><div className="font-semibold">{item.label}</div><p className="mt-2 text-xs leading-6 text-white/45">{item.description}</p><code className="mt-2 block text-[11px] text-violet-200">MOOX_METHOD={item.id}</code></button>)}</div>
      {plan?.methodology ? <div className={`mt-4 rounded-2xl border p-4 text-sm ${plan.methodology.eligible ? "border-emerald-300/20 bg-emerald-400/[0.05] text-emerald-100" : "border-amber-300/20 bg-amber-400/[0.05] text-amber-100"}`}>{plan.methodology.label}：{plan.methodology.reason}</div> : null}
    </div>
    <div className="rounded-3xl border border-violet-300/20 bg-[#0a0c12] p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">MOOX AI RESEARCH DESK</p>
      <h2 className="mt-2 text-2xl font-semibold">AI交易研究台</h2>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-white/55">研究方向、确认位、失效位和历史表现集中在这里。真实交易由会员自己在交易所确认；没有精确在线合约时显示 RESEARCH_ONLY / UNAVAILABLE。</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{HORIZONS.map((row) => <div key={row.title} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"><p className="font-semibold">{row.title} · {row.period}</p><p className="mt-2 text-xs leading-6 text-white/45">{row.note}</p></div>)}</div>
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-3xl border border-white/10 bg-[#0a0c12] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-semibold">当前研究计划</h3><p className="mt-1 text-xs text-white/40">合约可用·正式计划满足后可执行；RESEARCH_ONLY / UNAVAILABLE 仅供研究</p></div><div className="flex gap-2"><select aria-label="研究品种" className="rounded-xl border border-white/10 bg-black px-3 py-2 text-sm" value={symbol} onChange={(event) => { setSymbol(event.target.value); void refresh(event.target.value); }}>{instruments.map((row) => <option key={row.assetId} value={row.canonicalSymbol ?? ""} disabled={!row.canonicalSymbol}>{row.displayName} · {row.canonicalSymbol ?? "仅研究"}</option>)}</select><button className="rounded-xl border border-white/10 px-3 py-2 text-sm" disabled={Boolean(busy) || !symbol} onClick={() => void refresh(symbol)}>刷新</button></div></div>
        {plan ? <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><div className="rounded-xl bg-white/[0.035] p-4"><p className="text-xs text-white/40">方向</p><p className="mt-2 text-xl font-semibold">{plan.authority.direction}</p></div><div className="rounded-xl bg-white/[0.035] p-4"><p className="text-xs text-white/40">缠论阶段</p><p className="mt-2 text-xl font-semibold">{plan.chan.stageLabel}</p></div>{plan.execution.levelStatus === "VALID" ? <><div className="rounded-xl bg-white/[0.035] p-4"><p className="text-xs text-white/40">当前价格 / 确认位</p><p className="mt-2">{price(plan.execution.currentPrice)} / {price(plan.execution.confirmationAboveOrBelow)}</p></div><div className="rounded-xl bg-white/[0.035] p-4"><p className="text-xs text-white/40">失效位 / 目标</p><p className="mt-2">{price(plan.execution.stopLoss)} / {plan.execution.takeProfits?.map(price).join(" · ") || "—"}</p></div></> : <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-4 text-amber-100 sm:col-span-2">执行点位未通过有效性检查，已隐藏并禁止执行。</div>}</div> : <p className="mt-5 text-sm text-white/45">该品种暂无可读取计划。</p>}
      </div>

      <div className="rounded-3xl border border-cyan-300/15 bg-[#0a0c12] p-5 sm:p-6">
        <h3 className="text-xl font-semibold">一键只读监控</h3>
        <p className="mt-2 text-sm leading-7 text-white/50">网站Token只读取MOOX计划；它不是Bitget密钥。第一次只需“创建Token → 粘贴配置 → 双击PAPER”。</p>
        <div className="mt-5 flex flex-wrap gap-3"><Link prefetch={false} href="/api/v1/member/trading/artifacts/windows" className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-black">下载Windows一键包（推荐）</Link><Link prefetch={false} href="/api/v1/member/trading/artifacts/guide" className="rounded-xl border border-white/10 px-4 py-2.5 text-sm">下载高级说明</Link><button className="rounded-xl border border-violet-300/30 px-4 py-2.5 text-sm text-violet-100" disabled={Boolean(busy)} onClick={() => void createToken()}>创建90天只读Token</button></div>
        {revealedToken ? <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.05] p-3"><p className="text-xs text-amber-100">只显示一次：</p><code className="mt-2 block break-all text-xs text-white/75">{revealedToken}</code><button className="mt-2 text-xs text-cyan-200" onClick={() => void navigator.clipboard.writeText(revealedToken)}>复制Token</button></div> : null}
        <div className="mt-4 space-y-2">{tokens.filter((token) => token.active).slice(0, 4).map((token) => <div key={token.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] p-3 text-xs text-white/50"><span>{token.label} · {token.prefix} · 至 {new Date(token.expiresAt).toLocaleDateString("zh-CN")}</span><button className="text-rose-200" disabled={Boolean(busy)} onClick={() => void revokeToken(token.id)}>撤销</button></div>)}</div>
      </div>
    </div>
    <div className="rounded-3xl border border-rose-300/20 bg-rose-400/[0.04] p-5 text-sm leading-7 text-rose-100"><b>试运行风险提示：</b>六种方法尚未形成长期稳定统计，不建议大仓位，不建议借贷，不建议高杠杆。默认单笔风险上限0.5%、单个仓位上限5%、总仓位上限20%、杠杆上限2倍；会员应根据自己的承受能力设置得更低。任何自动交易都可能亏损。</div>
    {message ? <p role="status" className="text-sm text-amber-200">{message}</p> : null}
  </section>;
}
