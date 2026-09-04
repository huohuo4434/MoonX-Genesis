"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type RecordItem = { asset: string; assetName: string; targetDate: string; direction: string; source: string };
type Payload = { ok: boolean; published: boolean; targetDate: string; records: RecordItem[]; message: string };

function findInsertBefore(): Element | null {
  const headings = [...document.querySelectorAll("h1,h2,h3")];
  return headings.find((node) => /第一次使用MOOX|重点关注资产|最近验证/.test(node.textContent ?? ""))?.closest("section") ?? document.querySelector("footer");
}

export function TomorrowViewFallback() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [payload, setPayload] = useState<Payload | null>(null);

  useEffect(() => {
    if (window.location.pathname !== "/") return;
    if (!document.querySelector("[data-home-dashboard]")) return;
    // Mobile V7.20.7 home is intentionally concise; do not add a second network
    // request and late layout insertion on phones. Desktop keeps the legacy view.
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    const existing = [...document.querySelectorAll("h1,h2,h3")].some((node) => (node.textContent ?? "").trim() === "明日观点");
    if (existing) return;
    const node = document.createElement("div");
    node.dataset.tomorrowFallback = "true";
    const before = findInsertBefore();
    if (before?.parentElement) before.parentElement.insertBefore(node, before);
    else document.body.appendChild(node);
    setHost(node);
    fetch("/api/moox/tomorrow-view", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: Payload) => setPayload(data))
      .catch(() => setPayload({ ok: false, published: false, targetDate: "", records: [], message: "明日观点暂时无法读取；今日和历史预测未被删除" }));
    return () => node.remove();
  }, []);

  if (!host) return null;
  return createPortal(
    <section className="mx-auto my-12 w-full max-w-6xl px-5 md:px-8" data-tomorrow-view-restored="true">
      <div className="rounded-3xl border border-violet-400/20 bg-violet-400/[0.045] p-6 md:p-8">
        <div className="text-xs font-semibold tracking-[0.18em] text-violet-300">下一交易日</div>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold text-white">明日观点</h2>
            <p className="mt-2 text-sm text-slate-400">今日、明日和历史版本各自永久保留；页面只展示同一资产同一目标日的当前有效锁定版本。</p>
          </div>
          {payload?.targetDate ? <div className="text-sm text-slate-300">目标日期：{payload.targetDate}</div> : null}
        </div>
        {!payload ? <p className="mt-6 text-sm text-slate-400">正在读取明日观点……</p> : null}
        {payload && !payload.records.length ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm leading-7 text-slate-300">{payload.message}</div>
        ) : null}
        {payload?.records.length ? (
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {payload.records.map((item) => (
              <article key={`${item.asset}-${item.targetDate}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-white">{item.assetName} <span className="text-xs text-slate-500">{item.asset}</span></div>
                  <span className="rounded-full border border-violet-400/25 px-2.5 py-1 text-xs font-semibold text-violet-200">{item.direction}</span>
                </div>
                <div className="mt-3 text-xs text-slate-500">{item.source === "LOCKED_DAILY" ? "正式日度锁定" : "周卦拆解补位"}</div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>,
    host,
  );
}
