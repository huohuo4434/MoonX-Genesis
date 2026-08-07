"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AsteroidWatchlistFeature.module.css";

export default function AsteroidWatchlistFeature() {
  const pathname = usePathname();
  const english = pathname === "/en" || pathname.startsWith("/en/");
  const detailHref = "/featured-stocks/asteroid";
  const pricingHref = "/pricing";

  return (
    <section className={styles.shell} aria-label={english ? "Asteroid tactical watch" : "太空狗战术观察"}>
      <div className={styles.feature}>
        <div className={styles.eyebrow}>
          <span className={styles.badge}>{english ? "Target ladder update" : "9月底目标梯度更新"}</span>
          <span>{english ? "Target stress test · Aug 7" : "目标压力测试 · 2026-08-07"}</span>
        </div>
        <div className={styles.layout}>
          <div>
            <h2 className={styles.title}>
              {english
                ? "ASTEROID: target ladder refreshed — base case first, FOMO case last"
                : "太空狗：9月底目标梯度已重算，先看基准目标，再逐级激活强势情景"}
            </h2>
            <p className={styles.summary}>
              {english
                ? "MOOX added a four-level Sep-end market-cap stress test. The member report separates the base, strong, trend and extreme-FOMO scenarios, with two Liu Yao frameworks plus activation and invalidation rules."
                : "MOOX已加入9月底四档目标市值压力测试：4000万基准、5000万正常强势、7000万趋势强势、8000万极端FOMO；会员内展示每档卦象、双框架判断、激活条件与失效风险。"}
            </p>
          </div>
          <div className={styles.metrics}>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>{english ? "Core zone" : "核心区间"}</div>
              <div className={styles.metricValue}>{english ? "40M–50M" : "4000万–5000万"}</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>{english ? "Trend case" : "趋势情景"}</div>
              <div className={styles.metricValue}>{english ? "70M" : "7000万"}</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>{english ? "Tail case" : "尾部情景"}</div>
              <div className={styles.metricValue}>{english ? "80M FOMO" : "8000万FOMO"}</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>{english ? "Risk" : "风险等级"}</div>
              <div className={styles.metricValueDanger}>{english ? "Very high" : "极高"}</div>
            </div>
          </div>
        </div>
        <div className={styles.actions}>
          <Link className={styles.primary} href={detailHref}>
            {english ? "Open ASTEROID target ladder" : "查看太空狗目标梯度"}
          </Link>
          <Link className={styles.secondary} href={pricingHref}>
            {english ? "Unlock member research" : "解锁会员完整研究"}
          </Link>
        </div>
      </div>
    </section>
  );
}
