"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SPCX_PUBLIC_RESEARCH } from "@/lib/data/spcx-public-20260806";
import styles from "./SpcxWatchlist.module.css";

export default function SpcxWatchlistFeature() {
  const pathname = usePathname();
  const english = pathname === "/en" || pathname.startsWith("/en/");
  const detailHref = english ? "/en/markets/watchlist/spcx" : "/markets/watchlist/spcx";
  const pricingHref = english ? "/en/pricing" : "/pricing";

  return (
    <section className={styles.shell} aria-label={english ? "SPCX featured research" : "SPCX重点研究"}>
      <div className={styles.feature}>
        <div className={styles.eyebrow}>
          <span className={styles.badge}>{english ? "Featured event watch" : "近期重点事件观察"}</span>
          <span>{english ? "Locked Aug 6, 2026" : "研究锁定于 2026-08-06"}</span>
        </div>
        <h2 className={styles.title}>
          {english ? "SPCX: the unlock may create a rebound setup — but not immediately" : "SPCX：解锁可能孕育反弹，但不是立刻一路上涨"}
        </h2>
        <p className={styles.summary}>
          {english ? SPCX_PUBLIC_RESEARCH.publicSummaryEn : SPCX_PUBLIC_RESEARCH.publicSummaryZh}
        </p>
        <div className={styles.metrics}>
          <div className={styles.metric}>
            <div className={styles.metricLabel}>{english ? "Research direction" : "研究方向"}</div>
            <div className={styles.metricValue}>{english ? "Absorb first → rebound later" : "先消化 → 后反弹"}</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricLabel}>{english ? "Consensus" : "方法共识"}</div>
            <div className={styles.metricValue}>★★★★☆</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricLabel}>{english ? "Primary window" : "核心窗口"}</div>
            <div className={styles.metricValue}>{english ? "Late Aug → early Sep" : "8月下旬 → 9月初"}</div>
          </div>
        </div>
        <div className={styles.actions}>
          <Link className={styles.primary} href={detailHref}>
            {english ? "Open the SPCX research" : "查看 SPCX 重点研究"}
          </Link>
          <Link className={styles.secondary} href={pricingHref}>
            {english ? "Unlock member roadmap" : "解锁会员完整路径"}
          </Link>
        </div>
      </div>
    </section>
  );
}
