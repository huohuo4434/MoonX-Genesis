"use client";
import { useCallback, useEffect, useState } from "react";
import { latestStoneFindings, sortStoneBatches, STONE_SOURCE_LABELS, STONE_STATUS_LABELS, type StoneSavedBatch } from "@/lib/stone-intelligence/core";

export function StoneIntelligenceClient() {
  const [batches, setBatches] = useState<StoneSavedBatch[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin/stone-intelligence", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "读取失败");
    setBatches(sortStoneBatches(data.batches)); setOffset(data.batches.length); setHasMore(data.hasMore); setLoaded(true); setError("");
  }, []);
  useEffect(() => { refresh().catch((e) => setError(e.message)); }, [refresh]);
  const latest = batches[0];
  const findings = latestStoneFindings(batches);
  async function loadMore() {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/stone-intelligence?offset=${offset}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "读取失败");
      setBatches((previous) => sortStoneBatches([...new Map([...previous, ...data.batches].map((b: StoneSavedBatch) => [b.key, b])).values()]));
      setOffset(offset + data.batches.length); setHasMore(data.hasMore); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "读取失败"); }
    finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/admin/stone-intelligence", { method: "POST", headers: { "Content-Type": "application/json" }, body: input });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "保存失败");
      await refresh(); setMessage(data.duplicate ? "已存在相同汇总，未重复写入。" : "已保存到管理员私有档案。请核对下方卡片。");
    } catch (e) { setError(e instanceof Error ? e.message : "请求失败"); }
    finally { setBusy(false); }
  }
  return <div className="space-y-5">
    {error && <p role="alert" className="rounded border border-red-500 p-3 text-red-500">{error} {batches.length ? "下方保留上次成功读取内容，不代表本轮已更新。" : ""}</p>}
    <div className="rounded-lg border border-border p-4 space-y-2"><div className="flex flex-wrap justify-between gap-3"><h2 className="font-semibold">跟踪状态</h2><button className="underline" onClick={() => refresh().catch((e) => setError(e.message))}>刷新消息</button></div>
      <p className="text-sm">最近成功记录：{latest ? new Date(latest.observedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }) + "（北京时间）" : loaded ? "尚无跟踪记录" : "读取中"}</p>
      <p className="text-sm text-foreground-secondary">计划每小时检查。依赖 Codex 所在设备与已登录浏览器可用；本页时间是实际记录，不是计划时间。历史尚未完整回看时不得当成全量统计。</p>
      {latest?.coverage.map((c) => <p className="text-sm" key={c.source}>{STONE_SOURCE_LABELS[c.source]} · {c.status === "CHECKED" ? "已检查所述范围" : c.status === "PARTIAL" ? "部分覆盖" : "读取受阻"} · {c.range}</p>)}
    </div>
    {latest && <section className="rounded-lg border border-border p-4"><h2 className="mb-2 font-semibold">本轮判断与发言者观察</h2><p className="whitespace-pre-wrap text-sm leading-7">{latest.assessment}</p></section>}
    <section className="grid gap-4 md:grid-cols-2">{findings.map((f) => <article key={f.id} className="rounded-lg border border-border p-4 space-y-2">
      <p className="text-xs text-foreground-secondary">{STONE_SOURCE_LABELS[f.source]} · {f.author} · {f.publishedTimeLabel}</p><h2 className="font-semibold">{f.asset} · {f.title}</h2><p className="text-xs font-semibold">{STONE_STATUS_LABELS[f.status]}</p><p className="text-sm leading-6">{f.summary}</p><p className="text-sm"><strong>后续核对：</strong>{f.followUp}</p><p className="text-sm"><strong>MOOX 对照：</strong>{f.alignment}</p><div className="flex flex-wrap gap-3 text-xs"><a href={f.sourceUrl} target="_blank" rel="noreferrer" className="underline">原始来源（需相应会籍）</a>{f.evidenceUrls.map((url, i) => <a href={url} key={url} target="_blank" rel="noreferrer" className="underline">核验依据 {i + 1}</a>)}</div>
    </article>)}</section>
    {loaded && !findings.length && <p>尚无重要摘要；没有新信息时不为凑数发布。</p>}
    {hasMore && <p className="text-sm">当前摘要仅合并已加载批次；更早的观察可能尚未显示。<button disabled={busy} className="ml-2 underline" onClick={loadMore}>加载更早档案</button></p>}
    <details className="rounded-lg border border-border p-4"><summary className="cursor-pointer">跟踪档案 · 已加载 {batches.length} 批</summary><p className="text-sm my-2">每次修订独立留档，旧批次不覆盖。{hasMore ? "还有更早档案，可以继续加载；当前不是全部历史。" : ""}</p>{batches.map((b) => <p className="text-xs py-1" key={b.key}>{b.observedAt} · {b.findings.length} 条摘要 · {b.assessment.slice(0, 120)}</p>)}</details>
    <details className="rounded-lg border border-border p-4"><summary className="cursor-pointer">管理员录入摘要（自动跟踪使用）</summary><p className="my-3 text-sm">只录入简短摘要、来源及核验状态。不录付费全文、聊天原文、账户持仓、联系方式或凭据。</p><textarea aria-label="Stone 摘要 JSON" className="h-60 w-full rounded border border-border bg-background p-3 font-mono text-xs" value={input} onChange={(e) => setInput(e.target.value)} /><button disabled={busy || !input.trim()} onClick={save} className="mt-3 rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">{busy ? "保存中…" : "保存管理员摘要"}</button><p role="status" className="mt-2 text-sm">{message}</p></details>
  </div>;
}
