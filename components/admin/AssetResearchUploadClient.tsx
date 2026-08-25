"use client";

import { useEffect, useState } from "react";
import {
  formatLiuyaoPeriod,
  getLiuyaoHorizonRule,
  LIUYAO_HORIZON_RULES,
  type LiuyaoHorizonKind,
} from "@/lib/research/liuyao-horizon-policy";

type UploadRecord = {
  id: string;
  assetSymbol: string;
  assetName: string;
  method: string;
  period: string;
  fileName: string;
  size: number;
  uploadedAt: string;
  status: "draft";
  evidenceReadiness?: { state: "FORWARD_LOCKED" | "WAIT"; hardWaitReasons: string[] };
  evidenceLockedAt?: string;
  integrityStatus?: "VERIFIED" | "LEGACY_UNVERIFIED" | "FAILED";
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function AssetResearchUploadClient() {
  const [file, setFile] = useState<File | null>(null);
  const [assetSymbol, setAssetSymbol] = useState("");
  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState("CRYPTO");
  const [method, setMethod] = useState("六爻");
  const [period, setPeriod] = useState("");
  const [liuyaoHorizon, setLiuyaoHorizon] = useState<LiuyaoHorizonKind>("WEEK");
  const [notes, setNotes] = useState("");
  const [evidenceKind, setEvidenceKind] = useState("LIUYAO");
  const [sourceLabel, setSourceLabel] = useState("");
  const [sourcePublishedAt, setSourcePublishedAt] = useState("");
  const [applicableStart, setApplicableStart] = useState("");
  const [applicableEnd, setApplicableEnd] = useState("");
  const [direction, setDirection] = useState("UP");
  const [confirmation, setConfirmation] = useState("");
  const [invalidation, setInvalidation] = useState("");
  const [primaryHexagram, setPrimaryHexagram] = useState("");
  const [mutualHexagram, setMutualHexagram] = useState("");
  const [changedHexagram, setChangedHexagram] = useState("");
  const [movingLines, setMovingLines] = useState("");
  const [isStaticHexagram, setIsStaticHexagram] = useState(false);
  const [qimenChart, setQimenChart] = useState("");
  const [qimenChartReviewed, setQimenChartReviewed] = useState(false);
  const [qimenWindowStart, setQimenWindowStart] = useState("");
  const [qimenWindowEnd, setQimenWindowEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [records, setRecords] = useState<UploadRecord[]>([]);

  async function refresh() {
    try {
      const res = await fetch("/api/admin/asset-research/upload", { cache: "no-store" });
      const json = (await res.json()) as { records?: UploadRecord[] };
      if (res.ok) setRecords(json.records ?? []);
    } catch {
      // keep page usable even if the list cannot be loaded
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function upload() {
    if (!file) {
      setMessage("请选择文件");
      return;
    }
    if (!period.trim()) {
      setMessage(evidenceKind === "LIUYAO" ? "请填写年、月、周或可选季卦的明确适用周期" : "请填写明确预测周期");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("assetSymbol", assetSymbol);
      fd.set("assetName", assetName);
      fd.set("assetType", assetType);
      fd.set("method", method);
      fd.set("period", evidenceKind === "LIUYAO" ? formatLiuyaoPeriod(liuyaoHorizon, period) : period.trim());
      fd.set("notes", notes);
      fd.set("evidenceKind", evidenceKind);
      fd.set("sourceLabel", sourceLabel);
      fd.set("sourcePublishedAt", sourcePublishedAt ? new Date(sourcePublishedAt).toISOString() : "");
      fd.set("applicableStart", applicableStart);
      fd.set("applicableEnd", applicableEnd);
      fd.set("direction", direction);
      fd.set("confirmation", confirmation);
      fd.set("invalidation", invalidation);
      fd.set("primaryHexagram", primaryHexagram);
      fd.set("mutualHexagram", mutualHexagram);
      fd.set("changedHexagram", changedHexagram);
      fd.set("movingLines", movingLines);
      fd.set("isStaticHexagram", String(isStaticHexagram));
      fd.set("qimenChart", qimenChart);
      fd.set("qimenChartReviewed", String(qimenChartReviewed));
      fd.set("qimenWindowStart", qimenWindowStart ? new Date(qimenWindowStart).toISOString() : "");
      fd.set("qimenWindowEnd", qimenWindowEnd ? new Date(qimenWindowEnd).toISOString() : "");
      const res = await fetch("/api/admin/asset-research/upload", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(json.error || "上传失败");
      setMessage(json.message || "上传成功");
      setFile(null);
      setNotes("");
      const input = document.getElementById("asset-research-file") as HTMLInputElement | null;
      if (input) input.value = "";
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "上传失败");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "min-h-11 w-full rounded-md border border-border/[0.16] bg-background px-3 text-body-sm text-foreground";

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border/[0.1] bg-card p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-body-sm">
            <span>资产代码</span>
            <input
              className={inputClass}
              value={assetSymbol}
              onChange={(e) => setAssetSymbol(e.target.value)}
              placeholder="例如 ETH、SOL、MU"
            />
          </label>
          <label className="space-y-1 text-body-sm">
            <span>资产名称</span>
            <input
              className={inputClass}
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder="例如 以太坊"
            />
          </label>
          <label className="space-y-1 text-body-sm">
            <span>资产类型</span>
            <select className={inputClass} value={assetType} onChange={(e) => setAssetType(e.target.value)}>
              <option value="CRYPTO">加密资产</option>
              <option value="STOCK">股票</option>
              <option value="INDEX">指数</option>
              <option value="COMMODITY">商品</option>
              <option value="ETF">ETF</option>
            </select>
          </label>
          <label className="space-y-1 text-body-sm">
            <span>分析方法</span>
            <select className={inputClass} value={evidenceKind} onChange={(e) => { setEvidenceKind(e.target.value); setMethod(e.target.options[e.target.selectedIndex]?.text ?? e.target.value); setDirection(e.target.value === "QIMEN" ? "TIMING_ONLY" : "NEUTRAL"); }}>
              <option value="LIUYAO">六爻</option>
              <option value="QIMEN">奇门遁甲</option>
              <option value="FUNDAMENTAL">基本面 / NANA</option>
              <option value="EXTERNAL_ANALYST">公开市场观点 / X</option>
              <option value="TECHNICAL">技术结构</option>
              <option value="MACRO">宏观</option>
              <option value="NEWS">新闻事件</option>
            </select>
          </label>
          {evidenceKind === "LIUYAO" ? (
            <label className="space-y-1 text-body-sm">
              <span>卦象周期层级</span>
              <select
                className={inputClass}
                value={liuyaoHorizon}
                onChange={(e) => setLiuyaoHorizon(e.target.value as LiuyaoHorizonKind)}
              >
                {LIUYAO_HORIZON_RULES.map((rule) => (
                  <option key={rule.kind} value={rule.kind}>{rule.labelZh} · {rule.requirementLabelZh}</option>
                ))}
              </select>
              <span className="block text-caption text-foreground-tertiary">
                {getLiuyaoHorizonRule(liuyaoHorizon).roleZh}
              </span>
            </label>
          ) : null}
          <label className="space-y-1 text-body-sm">
            <span>来源（仅内部审计）</span>
            <input className={inputClass} value={sourceLabel} onChange={(e) => setSourceLabel(e.target.value)} placeholder="账号、课程或原始文件标识" />
          </label>
          <label className="space-y-1 text-body-sm">
            <span>来源发布时间</span>
            <input className={inputClass} type="datetime-local" value={sourcePublishedAt} onChange={(e) => setSourcePublishedAt(e.target.value)} />
          </label>
          <label className="space-y-1 text-body-sm">
            <span>适用开始</span>
            <input className={inputClass} type="date" value={applicableStart} onChange={(e) => setApplicableStart(e.target.value)} />
          </label>
          <label className="space-y-1 text-body-sm">
            <span>适用结束</span>
            <input className={inputClass} type="date" value={applicableEnd} onChange={(e) => setApplicableEnd(e.target.value)} />
          </label>
          <label className="space-y-1 text-body-sm">
            <span>方向职责</span>
            <select className={inputClass} value={direction} onChange={(e) => setDirection(e.target.value)}>
              <option value="UP">偏多</option><option value="DOWN">偏空</option><option value="NEUTRAL">中性</option><option value="TIMING_ONLY">只做择时</option>
            </select>
          </label>
          <label className="space-y-1 text-body-sm md:col-span-2"><span>确认条件</span><textarea className="min-h-20 w-full rounded-md border border-border/[0.16] bg-background p-3 text-body-sm" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></label>
          <label className="space-y-1 text-body-sm md:col-span-2"><span>失效条件</span><textarea className="min-h-20 w-full rounded-md border border-border/[0.16] bg-background p-3 text-body-sm" value={invalidation} onChange={(e) => setInvalidation(e.target.value)} /></label>
          {evidenceKind === "LIUYAO" ? <>
            <label className="space-y-1 text-body-sm"><span>原卦</span><input className={inputClass} value={primaryHexagram} onChange={(e) => setPrimaryHexagram(e.target.value)} /></label>
            <label className="space-y-1 text-body-sm"><span>互卦</span><input className={inputClass} value={mutualHexagram} onChange={(e) => setMutualHexagram(e.target.value)} /></label>
            <label className="space-y-1 text-body-sm"><span>变卦（静卦填“无变卦”）</span><input className={inputClass} value={changedHexagram} onChange={(e) => setChangedHexagram(e.target.value)} /></label>
            <label className="space-y-1 text-body-sm"><span>动爻（1-6）</span><input className={inputClass} disabled={isStaticHexagram} value={movingLines} onChange={(e) => setMovingLines(e.target.value)} placeholder="例如 2,5" /></label>
            <label className="flex items-center gap-2 text-body-sm md:col-span-2"><input type="checkbox" checked={isStaticHexagram} onChange={(e) => { setIsStaticHexagram(e.target.checked); if (e.target.checked) { setMovingLines(""); setChangedHexagram("无变卦（静卦）"); } }} />明确声明为静卦（零动爻且无变卦）</label>
          </> : null}
          {evidenceKind === "QIMEN" ? <>
            <label className="space-y-1 text-body-sm md:col-span-2"><span>完整奇门盘（不可用摘要反推）</span><textarea className="min-h-32 w-full rounded-md border border-border/[0.16] bg-background p-3 text-body-sm" value={qimenChart} onChange={(e) => setQimenChart(e.target.value)} /></label>
            <label className="flex items-center gap-2 text-body-sm md:col-span-2"><input type="checkbox" checked={qimenChartReviewed} onChange={(e) => setQimenChartReviewed(e.target.checked)} />已对照原盘核对九宫、值符、值使、九星、八门、八神、天盘与地盘</label>
            <label className="space-y-1 text-body-sm"><span>择时窗口开始</span><input className={inputClass} type="datetime-local" value={qimenWindowStart} onChange={(e) => setQimenWindowStart(e.target.value)} /></label>
            <label className="space-y-1 text-body-sm"><span>择时窗口结束</span><input className={inputClass} type="datetime-local" value={qimenWindowEnd} onChange={(e) => setQimenWindowEnd(e.target.value)} /></label>
          </> : null}
          <label className="space-y-1 text-body-sm md:col-span-2">
            <span>预测周期</span>
            <input
              className={inputClass}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder={evidenceKind === "LIUYAO" ? getLiuyaoHorizonRule(liuyaoHorizon).periodPlaceholder : "例如 2026-08-31至2026-09-06"}
            />
            {evidenceKind === "LIUYAO" ? (
              <span className="block text-caption text-cyan-200">
                保存后标准格式：{formatLiuyaoPeriod(liuyaoHorizon, period) || `${getLiuyaoHorizonRule(liuyaoHorizon).labelZh}｜待填写明确日期`}
              </span>
            ) : null}
          </label>
          <label className="space-y-1 text-body-sm md:col-span-2">
            <span>补充说明</span>
            <textarea
              className="min-h-24 w-full rounded-md border border-border/[0.16] bg-background p-3 text-body-sm text-foreground"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="可填写起卦时间、老师来源、需要重点判断的问题"
            />
          </label>
          <label className="space-y-1 text-body-sm md:col-span-2">
            <span>材料文件</span>
            <input
              id="asset-research-file"
              className={inputClass}
              type="file"
              accept=".zip,.jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.txt,.md"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={upload}
          className="mt-4 min-h-11 rounded-md bg-primary px-5 text-body-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "正在上传" : "上传到待整理区"}
        </button>
        {message ? <p className="mt-3 text-body-sm text-foreground-secondary">{message}</p> : null}
        <p className="mt-3 text-caption text-foreground-tertiary">
          上传内容只进入后台草稿区，不会自动公开，也不会未经复核直接生成正式预测。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-h3 font-semibold">最近上传</h2>
        {records.length === 0 ? (
          <p className="text-body-sm text-foreground-secondary">暂无材料</p>
        ) : (
          records.slice(0, 20).map((r) => (
            <div key={r.id} className="rounded-lg border border-border/[0.1] bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <strong>{r.assetName}</strong>
                <span className="font-mono text-caption text-foreground-secondary">{r.assetSymbol}</span>
                <span className="rounded-full border border-border/[0.14] px-2 py-0.5 text-caption">{r.evidenceReadiness?.state === "FORWARD_LOCKED" ? "前瞻已锁定" : "WAIT"}</span>
              </div>
              <p className="mt-2 text-body-sm text-foreground-secondary">
                {r.method} · {r.period} · {r.fileName} · {formatBytes(r.size)}
              </p>
              <p className="mt-1 text-caption text-foreground-tertiary">
                {new Date(r.uploadedAt).toLocaleString("zh-CN")}
              </p>
              {r.evidenceReadiness?.hardWaitReasons.length ? <p className="mt-1 text-caption text-amber-300">缺口：{r.evidenceReadiness.hardWaitReasons.join("、")}</p> : null}
              <p className="mt-1 text-caption text-foreground-tertiary">完整性：{r.integrityStatus === "VERIFIED" ? "证据记录哈希一致（附件SHA-256已锁定）" : r.integrityStatus === "FAILED" ? "证据记录校验失败，已阻断" : "旧资料，未提供哈希"}</p>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
