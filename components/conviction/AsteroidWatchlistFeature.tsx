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
          <span className={styles.badge}>{english ? "High-volatility tactical watch" : "本周高波动战术观察"}</span>
          <span>{english ? "Rolling calibration · Aug 6" : "滚动校准 · 2026-08-06"}</span>
        </div>
        <div className={styles.layout}>
          <div>
            <h2 className={styles.title}>
              {english
                ? "ASTEROID: repair is under way — the next decision window is approaching"
                : "太空狗：冲高后的修复正在进行，下一轮方向窗口正在接近"}
            </h2>
            <p className={styles.summary}>
              {english
                ? "The Aug 4 spike and fast retracement arrived about one day early. Aug 5–6 shifted into repair. MOOX now tracks the full Aug 3–16 daily path with two Liu Yao frameworks, a light Qimen environment check, confirmation rules and invalidation risks."
                : "8月4日提前完成第一轮冲高与快速回撤，5日至6日进入修复。MOOX已加入8月3日至16日逐日路径、双框架六爻交叉分析、奇门环境验证、确认条件与失效风险。"}
            </p>
          </div>
          <div className={styles.metrics}>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>{english ? "Current phase" : "当前阶段"}</div>
              <div className={styles.metricValue}>{english ? "Post-spike repair" : "冲高后修复"}</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>{english ? "Consensus" : "方法共识"}</div>
              <div className={styles.metricValue}>★★★★☆</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>{english ? "Next window" : "下一窗口"}</div>
              <div className={styles.metricValue}>{english ? "Aug 11 PM → Aug 13" : "8月11日下午 → 13日"}</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>{english ? "Risk" : "风险等级"}</div>
              <div className={styles.metricValueDanger}>{english ? "Very high" : "极高"}</div>
            </div>
          </div>
        </div>
        <div className={styles.actions}>
          <Link className={styles.primary} href={detailHref}>
            {english ? "Open daily ASTEROID roadmap" : "查看太空狗逐日路径"}
          </Link>
          <Link className={styles.secondary} href={pricingHref}>
            {english ? "Unlock member research" : "解锁会员完整研究"}
          </Link>
        </div>
      </div>
    </section>
  );
}
