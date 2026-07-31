"use client";

import { useEffect, useState } from "react";

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
  const [period, setPeriod] = useState("近期");
  const [notes, setNotes] = useState("");
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
    setBusy(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("assetSymbol", assetSymbol);
      fd.set("assetName", assetName);
      fd.set("assetType", assetType);
      fd.set("method", method);
      fd.set("period", period);
      fd.set("notes", notes);
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
            <select className={inputClass} value={method} onChange={(e) => setMethod(e.target.value)}>
              <option>六爻</option>
              <option>奇门遁甲</option>
              <option>八字</option>
              <option>周期</option>
              <option>技术结构</option>
              <option>综合</option>
            </select>
          </label>
          <label className="space-y-1 text-body-sm md:col-span-2">
            <span>预测周期</span>
            <input
              className={inputClass}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="例如 8月1日至9日、3个月、1年"
            />
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
                <span className="rounded-full border border-border/[0.14] px-2 py-0.5 text-caption">草稿</span>
              </div>
              <p className="mt-2 text-body-sm text-foreground-secondary">
                {r.method} · {r.period} · {r.fileName} · {formatBytes(r.size)}
              </p>
              <p className="mt-1 text-caption text-foreground-tertiary">
                {new Date(r.uploadedAt).toLocaleString("zh-CN")}
              </p>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
