"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SPCX_PUBLIC_RESEARCH } from "@/lib/data/spcx-public-20260808";
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
          <span className={styles.badge}>{english ? "Post-unlock revision · V2" : "解锁后复算 · V2"}</span>
          <span>{english ? "Revised Aug 8, 2026" : "2026-08-08 已按实际K线修订"}</span>
        </div>
        <h2 className={styles.title}>
          {english ? SPCX_PUBLIC_RESEARCH.publicHeadlineEn : SPCX_PUBLIC_RESEARCH.publicHeadlineZh}
        </h2>
        <p className={styles.summary}>
          {english ? SPCX_PUBLIC_RESEARCH.publicSummaryEn : SPCX_PUBLIC_RESEARCH.publicSummaryZh}
        </p>
        <div className={styles.metrics}>
          <div className={styles.metric}>
            <div className={styles.metricLabel}>{english ? "Observed close" : "8/7 实际收盘"}</div>
            <div className={styles.metricValue}>$133.11</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricLabel}>{english ? "Next-week path" : "下周主路径"}</div>
            <div className={styles.metricValue}>{english ? "Confirm / pullback → second leg" : "确认／回踩 → 再上"}</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricLabel}>{english ? "Consensus" : "多周期共识"}</div>
            <div className={styles.metricValue}>★★★★☆</div>
          </div>
        </div>
        <div className={styles.actions}>
          <Link className={styles.primary} href={detailHref}>
            {english ? "Open revised SPCX research" : "查看 SPCX V2 重点研究"}
          </Link>
          <Link className={styles.secondary} href={pricingHref}>
            {english ? "Unlock member roadmap" : "解锁会员完整路径"}
          </Link>
        </div>
      </div>
    </section>
  );
}
