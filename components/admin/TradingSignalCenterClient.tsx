"use client";

import { FormEvent, useMemo, useState } from "react";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";
import type { TradeSignalDashboardSnapshot, TradeSignalRecord, TradeSignalStatus } from "@/types/trading-signal";

const inputClass = "min-h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-body-sm text-white outline-none focus:border-primary/60";
const METHODS = ["六爻", "技术结构", "周期", "奇门", "八字", "基本面", "市场情绪"];

function numberOrNull(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function stars(level: number) {
  return `${"★".repeat(level)}${"☆".repeat(5 - level)}`;
}

export function TradingSignalCenterClient({ initial }: { initial: TradeSignalDashboardSnapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiToken, setApiToken] = useState("");

  const openSignals = useMemo(
    () => snapshot.signals.filter((signal) => signal.status !== "CLOSED" && signal.status !== "CANCELLED"),
    [snapshot.signals]
  );

  async function refresh() {
    const res = await fetch("/api/admin/trading-signals", { cache: "no-store" });
    const json = (await res.json()) as TradeSignalDashboardSnapshot & { error?: string };
    if (!res.ok) throw new Error(json.error || "刷新失败");
    setSnapshot(json);
  }

  async function submitSignal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const form = new FormData(event.currentTarget);
      const methodVotes = METHODS.map((method) => {
        const direction = String(form.get(`method_${method}_direction`) ?? "NEUTRAL");
        const weight = Number(form.get(`method_${method}_weight`) ?? 0);
        const evidence = String(form.get(`method_${method}_evidence`) ?? "").trim();
        return { method, direction, weight, confidence: Math.min(100, Math.max(0, weight)), evidence };
      }).filter((item) => item.weight > 0 || item.evidence);

      const body = {
        assetId: String(form.get("assetId")),
        symbol: String(form.get("symbol")),
        assetName: String(form.get("assetName")),
        market: String(form.get("market")),
        timeframe: String(form.get("timeframe")),
        direction: String(form.get("direction")),
        status: String(form.get("status")),
        starLevel: Number(form.get("starLevel")),
        consensusScore: Number(form.get("consensusScore")),
        entryMode: String(form.get("entryMode")),
        entryLow: numberOrNull(form.get("entryLow")),
        entryHigh: numberOrNull(form.get("entryHigh")),
        triggerPrice: numberOrNull(form.get("triggerPrice")),
        stopLoss: numberOrNull(form.get("stopLoss")),
        stopConfirmTimeframe: String(form.get("stopConfirmTimeframe")),
        target1: numberOrNull(form.get("target1")),
        target2: numberOrNull(form.get("target2")),
        target3: numberOrNull(form.get("target3")),
        quantity: numberOrNull(form.get("quantity")),
        notionalAmount: numberOrNull(form.get("notionalAmount")),
        positionSizePct: numberOrNull(form.get("positionSizePct")),
        maxRiskPct: numberOrNull(form.get("maxRiskPct")),
        validFrom: new Date(String(form.get("validFrom"))).toISOString(),
        validUntil: form.get("validUntil") ? new Date(String(form.get("validUntil"))).toISOString() : null,
        rationale: String(form.get("rationale")),
        executionPlan: String(form.get("executionPlan")),
        invalidation: String(form.get("invalidation")),
        sourceForecastId: null,
        apiVisible: form.get("apiVisible") === "on",
        paperOnly: true,
        methods: methodVotes,
      };

      const res = await fetch("/api/admin/trading-signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "保存失败");
      event.currentTarget.reset();
      await refresh();
      setMessage("交易信号已保存");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(signal: TradeSignalRecord, status: TradeSignalStatus) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/trading-signals/${signal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, apiVisible: status === "DRAFT" ? false : signal.apiVisible }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "更新失败");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "更新失败");
    } finally {
      setLoading(false);
    }
  }

  async function closeSignal(signal: TradeSignalRecord) {
    const entry = window.prompt("实际入场价", String(signal.triggerPrice ?? signal.entryHigh ?? signal.entryLow ?? ""));
    if (!entry) return;
    const exit = window.prompt("实际退出价");
    if (!exit) return;
    const res = await fetch(`/api/admin/trading-signals/${signal.id}/result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryPrice: Number(entry), exitPrice: Number(exit), note: "管理员结算" }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) setMessage(json.error || "结算失败");
    else await refresh();
  }

  async function paperExecute(signal: TradeSignalRecord, provider: "WEBHOOK" | "ALPACA_PAPER" | "OKX_DEMO") {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/trading-signals/${signal.id}/paper-execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "模拟执行失败");
      await refresh();
      setMessage(`${provider} 模拟执行已发送`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "模拟执行失败");
    } finally {
      setLoading(false);
    }
  }

  async function createApiKey() {
    const label = window.prompt("API密钥名称，例如 MOSS模拟盘");
    if (!label) return;
    const res = await fetch("/api/admin/signal-api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, permissions: ["read", "write"] }),
    });
    const json = (await res.json()) as { token?: string; error?: string };
    if (!res.ok || !json.token) setMessage(json.error || "创建失败");
    else setApiToken(json.token);
  }

  return (
    <div className="space-y-8">
      {!snapshot.databaseReady ? (
        <Card padding="md" className="border-amber-500/30 bg-amber-500/5">
          <Text variant="body-sm" className="text-amber-200">数据库尚未连接，页面可以构建，但暂时不能保存信号。</Text>
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        <Card padding="md"><Text variant="caption" color="tertiary">待触发</Text><Heading size="h3">{snapshot.armedCount}</Heading></Card>
        <Card padding="md"><Text variant="caption" color="tertiary">执行中</Text><Heading size="h3">{snapshot.activeCount}</Heading></Card>
        <Card padding="md"><Text variant="caption" color="tertiary">已结算</Text><Heading size="h3">{snapshot.closedCount}</Heading></Card>
        <Card padding="md"><Text variant="caption" color="tertiary">全部记录</Text><Heading size="h3">{snapshot.signals.length}</Heading></Card>
      </div>

      <Card padding="lg" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><Heading size="h3">信号API</Heading><Text variant="body-sm" color="secondary">生成密钥后，MOSS、Webhook或其他执行端可读取结构化信号。</Text></div>
          <Button variant="outline" onClick={createApiKey}>生成API密钥</Button>
        </div>
        {apiToken ? <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 font-mono text-sm break-all">{apiToken}<div className="mt-2 text-xs text-amber-200">只显示这一次，请立即保存。</div></div> : null}
        <div className="rounded-md bg-black/20 p-3 font-mono text-xs text-white/65">GET /api/v1/signals<br/>Authorization: Bearer YOUR_KEY</div>
      </Card>

      <Card padding="lg">
        <Heading size="h3" className="mb-4">新建交易信号</Heading>
        <form onSubmit={submitSignal} className="space-y-5">
          <div className="grid gap-3 md:grid-cols-4">
            <input className={inputClass} name="assetId" placeholder="资产ID：mu" required />
            <input className={inputClass} name="symbol" placeholder="代码：MU" required />
            <input className={inputClass} name="assetName" placeholder="名称：美光科技" required />
            <input className={inputClass} name="market" placeholder="市场：US_STOCK" required />
            <select className={inputClass} name="timeframe" defaultValue="1W"><option value="4H">4小时</option><option value="1D">日线</option><option value="1W">一周</option><option value="1M">一月</option></select>
            <select className={inputClass} name="direction" defaultValue="LONG"><option value="LONG">做多</option><option value="SHORT">做空</option><option value="NEUTRAL">观望</option></select>
            <select className={inputClass} name="status" defaultValue="DRAFT"><option value="DRAFT">草稿</option><option value="PUBLISHED">已发布</option><option value="ARMED">等待触发</option></select>
            <select className={inputClass} name="entryMode" defaultValue="BREAKOUT"><option value="BREAKOUT">突破买入</option><option value="BUY_ZONE">买入区间</option><option value="PULLBACK">回踩买入</option><option value="MARKET">市价</option><option value="MANUAL">人工</option></select>
            <label className="text-xs text-white/45">星级<input className={`${inputClass} mt-1`} name="starLevel" type="number" min="1" max="5" defaultValue="3" required /></label>
            <label className="text-xs text-white/45">共识分<input className={`${inputClass} mt-1`} name="consensusScore" type="number" min="0" max="100" defaultValue="60" required /></label>
            <label className="text-xs text-white/45">有效开始<input className={`${inputClass} mt-1`} name="validFrom" type="datetime-local" required /></label>
            <label className="text-xs text-white/45">有效截止<input className={`${inputClass} mt-1`} name="validUntil" type="datetime-local" /></label>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {[["entryLow","入场下沿"],["entryHigh","入场上沿"],["triggerPrice","突破触发价"],["stopLoss","止损价"],["target1","目标1"],["target2","目标2"],["target3","目标3"],["quantity","下单数量"],["notionalAmount","下单金额"],["positionSizePct","仓位%"],["maxRiskPct","最大风险%"]].map(([name,label]) => <input key={name} className={inputClass} name={name} type="number" step="any" placeholder={label} />)}
            <select className={inputClass} name="stopConfirmTimeframe" defaultValue="4H"><option value="4H">4H确认止损</option><option value="1D">日线确认止损</option><option value="INTRADAY">盘中触发止损</option></select>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <textarea className={`${inputClass} min-h-28`} name="rationale" placeholder="为什么发出这个信号" />
            <textarea className={`${inputClass} min-h-28`} name="executionPlan" placeholder="买入、加仓、减仓、止盈计划" />
            <textarea className={`${inputClass} min-h-28`} name="invalidation" placeholder="什么情况证明判断错误，必须退出" />
          </div>
          <div className="space-y-2">
            <Text variant="body-sm" weight="semibold">多方法投票</Text>
            {METHODS.map((method) => <div key={method} className="grid gap-2 md:grid-cols-[100px_140px_120px_1fr]"><div className="py-2 text-sm">{method}</div><select className={inputClass} name={`method_${method}_direction`} defaultValue="NEUTRAL"><option value="LONG">看涨</option><option value="SHORT">看跌</option><option value="NEUTRAL">中性</option></select><input className={inputClass} name={`method_${method}_weight`} type="number" min="0" max="100" defaultValue="0" placeholder="权重"/><input className={inputClass} name={`method_${method}_evidence`} placeholder="依据"/></div>)}
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="apiVisible" />允许API输出</label>
          <Button type="submit" isLoading={loading}>保存交易信号</Button>
          {message ? <Text variant="body-sm" className="ml-3 inline text-primary">{message}</Text> : null}
        </form>
      </Card>

      <section className="space-y-3">
        <Heading size="h3">当前交易信号</Heading>
        {openSignals.map((signal) => <Card key={signal.id} padding="lg" className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><Text variant="body" weight="semibold">{signal.assetName} {signal.symbol}</Text><Text variant="caption" color="tertiary" className="mt-1 block">{signal.timeframe} · {signal.entryMode} · V{signal.version}</Text></div><div className="flex gap-2"><Badge variant="outline">{signal.status}</Badge><Badge variant="outline">{signal.direction}</Badge><Badge variant="outline">{stars(signal.starLevel)} {signal.consensusScore}</Badge></div></div>
          <div className="grid gap-3 text-sm md:grid-cols-4"><div>入场：{signal.entryLow ?? "—"}—{signal.entryHigh ?? "—"}</div><div>触发：{signal.triggerPrice ?? "—"}</div><div>止损：{signal.stopLoss ?? "—"}</div><div>目标：{[signal.target1,signal.target2,signal.target3].filter(Boolean).join(" / ") || "—"}</div></div>
          <Text variant="body-sm" color="secondary">{signal.executionPlan || signal.rationale || "尚未填写执行计划"}</Text>
          <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => changeStatus(signal,"ARMED")}>等待触发</Button><Button size="sm" variant="outline" onClick={() => changeStatus(signal,"ACTIVE")}>标记持仓</Button><Button size="sm" variant="outline" onClick={() => paperExecute(signal,"WEBHOOK")}>Webhook模拟</Button><Button size="sm" variant="outline" onClick={() => paperExecute(signal,"ALPACA_PAPER")}>Alpaca模拟</Button><Button size="sm" variant="outline" onClick={() => paperExecute(signal,"OKX_DEMO")}>OKX模拟</Button><Button size="sm" variant="secondary" onClick={() => closeSignal(signal)}>结算收益</Button><Button size="sm" variant="danger" onClick={() => changeStatus(signal,"CANCELLED")}>取消</Button></div>
        </Card>)}
        {!openSignals.length ? <Card padding="lg"><Text variant="body-sm" color="secondary">暂无交易信号。先建立第一条模拟信号。</Text></Card> : null}
      </section>

      <section className="space-y-3">
        <Heading size="h3">按星级统计</Heading>
        <div className="grid gap-3 md:grid-cols-5">{snapshot.starStats.map((stat) => <Card key={stat.starLevel} padding="md"><Text variant="body" weight="semibold">{stars(stat.starLevel)}</Text><Text variant="caption" color="tertiary" className="mt-2 block">样本 {stat.sampleCount}</Text><Text variant="body-sm" className="mt-2 block">胜率：{stat.winRate == null ? "样本积累中" : `${stat.winRate}%`}</Text><Text variant="caption" color="tertiary" className="mt-1 block">平均收益 {stat.averageReturnPct ?? "—"}%</Text></Card>)}</div>
      </section>
    </div>
  );
}
