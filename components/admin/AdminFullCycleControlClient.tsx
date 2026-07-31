"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, Text } from "@/components/ui";
import type {
  AdminFullCycleSnapshot,
  AdminLevelTimeframe,
} from "@/types/admin-full-cycle";

type View = "forecast" | "key-date" | "levels" | "breakout";

const EFFECTS = ["上涨候选", "下跌风险", "转折", "波动放大", "阶段高点", "阶段低点", "突破确认"];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(dateKey: string, days: number) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
}

function fieldClass() {
  return "min-h-11 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-body-sm text-white outline-none focus:border-primary/60";
}

function splitZones(value: string): string[] {
  return value
    .split(/\n|；|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function AdminFullCycleControlClient({ initial }: { initial: AdminFullCycleSnapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [view, setView] = useState<View>("forecast");
  const [assetId, setAssetId] = useState(initial.assets[0]?.id ?? "bitcoin");
  const [horizon, setHorizon] = useState<"DAY" | "WEEK" | "MONTH">("DAY");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [keyMode, setKeyMode] = useState<"branch" | "exact">("branch");
  const [keyStart, setKeyStart] = useState(todayKey());
  const [keyEnd, setKeyEnd] = useState(addDays(todayKey(), 31));
  const [keyDate, setKeyDate] = useState(todayKey());
  const [selectedBranches, setSelectedBranches] = useState<string[]>(["亥", "卯", "未"]);
  const [effect, setEffect] = useState("上涨候选");
  const [source, setSource] = useState("QIMEN");
  const [keyLabel, setKeyLabel] = useState("老师提示的关键窗口");
  const [keyNote, setKeyNote] = useState("");

  const [timeframe, setTimeframe] = useState<AdminLevelTimeframe>("4H");
  const [effectiveDate, setEffectiveDate] = useState(todayKey());
  const [supports, setSupports] = useState("");
  const [resistances, setResistances] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [invalidation, setInvalidation] = useState("");
  const [levelNote, setLevelNote] = useState("");

  const [eventDate, setEventDate] = useState(todayKey());
  const [closePrice, setClosePrice] = useState("");
  const [eventNote, setEventNote] = useState("");

  const asset = snapshot.assets.find((item) => item.id === assetId) ?? snapshot.assets[0];
  const rows = useMemo(
    () => snapshot.forecasts.filter((item) => item.assetId === assetId && item.horizon === horizon),
    [snapshot.forecasts, assetId, horizon]
  );
  const keyDates = useMemo(
    () => snapshot.keyDates.filter((item) => item.assetId === assetId),
    [snapshot.keyDates, assetId]
  );
  const zones = useMemo(
    () => snapshot.priceZones.filter((item) => item.assetId === assetId),
    [snapshot.priceZones, assetId]
  );
  const events = useMemo(
    () => snapshot.breakoutEvents.filter((item) => item.assetId === assetId),
    [snapshot.breakoutEvents, assetId]
  );

  async function refresh() {
    const res = await fetch("/api/admin/full-cycle", { cache: "no-store" });
    const json = (await res.json()) as AdminFullCycleSnapshot & { error?: string };
    if (!res.ok) throw new Error(json.error || "刷新失败");
    setSnapshot(json);
  }

  async function post(body: Record<string, unknown>) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/full-cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "保存失败");
      await refresh();
      setMessage("已保存");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  function toggleBranch(branch: string) {
    setSelectedBranches((current) =>
      current.includes(branch) ? current.filter((item) => item !== branch) : [...current, branch]
    );
  }

  return (
    <div className="space-y-6">
      <Card padding="md" className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <label className="space-y-1">
            <span className="text-caption text-white/45">资产</span>
            <select value={assetId} onChange={(event) => setAssetId(event.target.value)} className={fieldClass()}>
              {snapshot.assets.map((item) => (
                <option key={item.id} value={item.id} className="bg-[#111318]">
                  {item.name} · {item.symbol} · {item.assetClass === "CORE" ? "七大市场" : "重点关注"}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            {([
              ["forecast", "全周期预测"],
              ["key-date", "关键日"],
              ["levels", "支撑压力"],
              ["breakout", "突破复核"],
            ] as const).map(([key, label]) => (
              <Button key={key} variant={view === key ? "primary" : "outline"} onClick={() => setView(key)}>
                {label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-caption text-white/45">
          <Badge variant="outline">{asset?.market}</Badge>
          <span>数据库：{snapshot.databaseReady ? "已连接" : "未连接"}</span>
          <span>刷新：{new Date(snapshot.generatedAt).toLocaleString("zh-CN")}</span>
          {message ? <span className="text-primary">{message}</span> : null}
        </div>
      </Card>

      {view === "forecast" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant={horizon === "DAY" ? "primary" : "outline"} onClick={() => setHorizon("DAY")}>
              一周内逐日
            </Button>
            <Button variant={horizon === "WEEK" ? "primary" : "outline"} onClick={() => setHorizon("WEEK")}>
              一月内逐周
            </Button>
            <Button variant={horizon === "MONTH" ? "primary" : "outline"} onClick={() => setHorizon("MONTH")}>
              一年内逐月
            </Button>
          </div>
          {rows.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {rows.map((row) => (
                <Card key={row.id} padding="md" className="space-y-2 border-white/[0.08] bg-[#0c0e12]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Text variant="body" weight="semibold">{row.periodStart === row.periodEnd ? row.periodStart : `${row.periodStart} → ${row.periodEnd}`}</Text>
                    <div className="flex gap-2"><Badge variant="outline">{row.direction}</Badge><Badge variant="outline">{row.status}</Badge></div>
                  </div>
                  <Text variant="body-sm" className="text-white/75">{row.path}</Text>
                  <Text variant="caption" className="block text-white/45">{row.probabilityLabel} · {row.sourceLabel} · {row.version ? `V${row.version}` : "未锁版"}</Text>
                </Card>
              ))}
            </div>
          ) : (
            <Card padding="lg"><Text variant="body-sm" color="secondary">该周期暂无已形成的正式预测。原始材料仍可在六爻研究库和老师知识库查看。</Text></Card>
          )}
        </section>
      ) : null}

      {view === "key-date" ? (
        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Card padding="lg" className="space-y-4">
            <div className="flex gap-2">
              <Button variant={keyMode === "branch" ? "primary" : "outline"} onClick={() => setKeyMode("branch")}>按干支规则换算</Button>
              <Button variant={keyMode === "exact" ? "primary" : "outline"} onClick={() => setKeyMode("exact")}>直接录入公历日</Button>
            </div>
            {keyMode === "branch" ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1"><span className="text-caption text-white/45">开始日期</span><input type="date" value={keyStart} onChange={(e) => setKeyStart(e.target.value)} className={fieldClass()} /></label>
                  <label className="space-y-1"><span className="text-caption text-white/45">结束日期</span><input type="date" value={keyEnd} onChange={(e) => setKeyEnd(e.target.value)} className={fieldClass()} /></label>
                </div>
                <div className="space-y-2"><span className="text-caption text-white/45">干支日</span><div className="flex flex-wrap gap-2">{BRANCHES.map((branch) => <button type="button" key={branch} onClick={() => toggleBranch(branch)} className={`h-9 min-w-9 rounded-md border px-2 text-body-sm ${selectedBranches.includes(branch) ? "border-primary bg-primary text-primary-foreground" : "border-white/10 text-white/60"}`}>{branch}</button>)}</div></div>
              </>
            ) : (
              <label className="space-y-1"><span className="text-caption text-white/45">公历日期</span><input type="date" value={keyDate} onChange={(e) => setKeyDate(e.target.value)} className={fieldClass()} /></label>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1"><span className="text-caption text-white/45">关键日类型</span><select value={effect} onChange={(e) => setEffect(e.target.value)} className={fieldClass()}>{EFFECTS.map((item) => <option key={item} className="bg-[#111318]">{item}</option>)}</select></label>
              <label className="space-y-1"><span className="text-caption text-white/45">来源</span><select value={source} onChange={(e) => setSource(e.target.value)} className={fieldClass()}><option className="bg-[#111318]">QIMEN</option><option className="bg-[#111318]">LIUYAO</option><option className="bg-[#111318]">BAZI</option><option className="bg-[#111318]">TECHNICAL</option><option className="bg-[#111318]">ADMIN</option></select></label>
            </div>
            <label className="space-y-1"><span className="text-caption text-white/45">显示标题</span><input value={keyLabel} onChange={(e) => setKeyLabel(e.target.value)} className={fieldClass()} /></label>
            <label className="space-y-1"><span className="text-caption text-white/45">备注</span><textarea value={keyNote} onChange={(e) => setKeyNote(e.target.value)} className={`${fieldClass()} min-h-24`} /></label>
            <Button disabled={loading || (keyMode === "branch" && selectedBranches.length === 0)} onClick={() => post(keyMode === "branch" ? { action: "save-branch-key-dates", assetId, startDate: keyStart, endDate: keyEnd, branches: selectedBranches, effect, source, label: keyLabel, note: keyNote } : { action: "save-exact-key-date", assetId, date: keyDate, effect, source, label: keyLabel, note: keyNote })}>{loading ? "保存中…" : "保存关键日"}</Button>
            <Text variant="caption" className="block text-white/40">干支换算由固定历法模块完成，基准为用户卦图校验的「2026-07-30＝乙巳日」。换算失败时不生成错误公历日期。</Text>
          </Card>
          <div className="space-y-3">
            {keyDates.length ? keyDates.map((item) => (
              <Card key={item.id} padding="md" className="border-amber-400/15 bg-amber-400/[0.03]">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><Text variant="body" weight="semibold" className="text-amber-200">{item.date} {item.ganzhi ? `· ${item.ganzhi}` : ""}</Text><Text variant="body-sm" className="mt-1 block text-white/75">{item.label} · {item.effect}</Text></div><Badge variant="outline">{item.source}</Badge></div>
                {item.branchRule ? <Text variant="caption" className="mt-2 block text-white/45">原始干支规则：{item.branchRule}</Text> : null}
                {item.note ? <Text variant="caption" className="mt-1 block text-white/50">{item.note}</Text> : null}
              </Card>
            )) : <Card padding="lg"><Text variant="body-sm" color="secondary">该资产尚未录入关键日。没有老师原始依据时，不自动编造日期。</Text></Card>}
          </div>
        </section>
      ) : null}

      {view === "levels" ? (
        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Card padding="lg" className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1"><span className="text-caption text-white/45">确认周期</span><select value={timeframe} onChange={(e) => setTimeframe(e.target.value as AdminLevelTimeframe)} className={fieldClass()}><option className="bg-[#111318]">4H</option><option className="bg-[#111318]">1D</option><option className="bg-[#111318]">1W</option></select></label>
              <label className="space-y-1"><span className="text-caption text-white/45">生效日期</span><input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className={fieldClass()} /></label>
            </div>
            <label className="space-y-1"><span className="text-caption text-white/45">支撑区间（每行一个，例如 62800—63600）</span><textarea value={supports} onChange={(e) => setSupports(e.target.value)} className={`${fieldClass()} min-h-28`} /></label>
            <label className="space-y-1"><span className="text-caption text-white/45">压力区间（每行一个）</span><textarea value={resistances} onChange={(e) => setResistances(e.target.value)} className={`${fieldClass()} min-h-28`} /></label>
            <label className="space-y-1"><span className="text-caption text-white/45">突破确认条件</span><input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="例如：连续两根4H收盘站稳压力区上沿" className={fieldClass()} /></label>
            <label className="space-y-1"><span className="text-caption text-white/45">失效条件</span><input value={invalidation} onChange={(e) => setInvalidation(e.target.value)} className={fieldClass()} /></label>
            <label className="space-y-1"><span className="text-caption text-white/45">备注</span><textarea value={levelNote} onChange={(e) => setLevelNote(e.target.value)} className={`${fieldClass()} min-h-20`} /></label>
            <Button disabled={loading || (!splitZones(supports).length && !splitZones(resistances).length)} onClick={() => post({ action: "save-price-zone", assetId, timeframe, effectiveDate, supportLevels: splitZones(supports), resistanceLevels: splitZones(resistances), confirmation, invalidation, note: levelNote })}>{loading ? "保存中…" : "保存支撑压力区"}</Button>
          </Card>
          <div className="space-y-3">
            {zones.length ? zones.map((item) => (
              <Card key={item.id} padding="md" className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2"><Text variant="body" weight="semibold">{item.timeframe} · 生效于 {item.effectiveDate}</Text><Badge variant="outline">已启用</Badge></div>
                <Text variant="body-sm" className="block text-emerald-300/80">支撑：{item.supportLevels.join("；") || "—"}</Text>
                <Text variant="body-sm" className="block text-rose-300/80">压力：{item.resistanceLevels.join("；") || "—"}</Text>
                {item.confirmation ? <Text variant="caption" className="block text-white/50">确认：{item.confirmation}</Text> : null}
                {item.invalidation ? <Text variant="caption" className="block text-white/50">失效：{item.invalidation}</Text> : null}
              </Card>
            )) : <Card padding="lg"><Text variant="body-sm" color="secondary">尚未录入支撑压力区。</Text></Card>}
          </div>
        </section>
      ) : null}

      {view === "breakout" ? (
        <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <Card padding="lg" className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1"><span className="text-caption text-white/45">确认周期</span><select value={timeframe} onChange={(e) => setTimeframe(e.target.value as AdminLevelTimeframe)} className={fieldClass()}><option className="bg-[#111318]">4H</option><option className="bg-[#111318]">1D</option><option className="bg-[#111318]">1W</option></select></label>
              <label className="space-y-1"><span className="text-caption text-white/45">事件日期</span><input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={fieldClass()} /></label>
            </div>
            <label className="space-y-1"><span className="text-caption text-white/45">确认收盘价</span><input inputMode="decimal" value={closePrice} onChange={(e) => setClosePrice(e.target.value)} className={fieldClass()} /></label>
            <label className="space-y-1"><span className="text-caption text-white/45">备注</span><textarea value={eventNote} onChange={(e) => setEventNote(e.target.value)} className={`${fieldClass()} min-h-20`} /></label>
            <Button disabled={loading || !Number(closePrice)} onClick={() => post({ action: "evaluate-breakout", assetId, timeframe, eventDate, closePrice: Number(closePrice), note: eventNote })}>{loading ? "判断中…" : "检查突破与卦象一致性"}</Button>
            <Text variant="caption" className="block text-white/40">4H和日线的自动行情监控受Vercel Hobby频率限制。本页先完成管理员确认闭环；日线可由每日任务自动接入，4H确认暂由管理员输入收盘价。</Text>
          </Card>
          <div className="space-y-3">
            {events.length ? events.map((item) => (
              <Card key={item.id} padding="md" className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2"><Text variant="body" weight="semibold">{item.eventDate} · {item.timeframe} · 收盘 {item.closePrice}</Text><Badge variant="outline">{item.eventType}</Badge></div>
                <Text variant="body-sm" className={item.alignment === "ALIGNED" ? "text-emerald-300" : item.alignment === "CONFLICT" ? "text-rose-300" : "text-amber-200"}>一致性：{item.alignment}</Text>
                <Text variant="caption" className="block leading-relaxed text-white/55">卦象/研究：{item.evidence}</Text>
                <Text variant="caption" className="block text-white/40">只生成未来修订候选，不覆盖已经正式发布的原预测。</Text>
              </Card>
            )) : <Card padding="lg"><Text variant="body-sm" color="secondary">尚无突破复核记录。</Text></Card>}
          </div>
        </section>
      ) : null}
    </div>
  );
}
