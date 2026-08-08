"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SPCX_PUBLIC_RESEARCH, type SpcxLanguage } from "@/lib/data/spcx-public-20260808";
import styles from "./SpcxWatchlist.module.css";

type DailyItem = {
  date: string;
  biasZh: string;
  biasEn: string;
  pathZh: string;
  pathEn: string;
  actionZh: string;
  actionEn: string;
};

type WeeklyItem = {
  start: string;
  end: string;
  hexagramZh: string;
  labelZh: string;
  labelEn: string;
  pathZh: string;
  pathEn: string;
  risk: string;
};

type HorizonItem = {
  period: string;
  hexagramZh: string;
  directionZh: string;
  directionEn: string;
  pathZh: string;
  pathEn: string;
};

type MemberResponse = {
  research: {
    version: number;
    revisionOf: string;
    marketReview: {
      asOf: string;
      close: number;
      dayChangePct: number;
      weekChangePct: number;
      recentLowApprox: number;
      ipoPrice: number;
      unlockDate: string;
      unlockSupportObserved: number;
      reviewZh: string;
      reviewEn: string;
    };
    direction: { zh: string; en: string };
    consensus: { stars: number; meaningZh: string; meaningEn: string };
    revisionLogic: { zh: string[]; en: string[] };
    dailyPath: DailyItem[];
    weeklyPath: WeeklyItem[];
    monthly: HorizonItem;
    threeMonth: HorizonItem;
    oneYear: HorizonItem;
    fiveYear: HorizonItem;
    evidenceArchive: { zh: string[]; en: string[] };
    externalTechnicalView?: {
      asOf: string;
      sourceLabelZh: string;
      sourceLabelEn: string;
      summaryZh: string;
      summaryEn: string;
      levels: Array<{ label: string; value: string }>;
      ruleZh: string;
      ruleEn: string;
    };
    executionRules: { zh: string[]; en: string[] };
    verificationPlan: { zh: string; en: string };
  };
  technical: null | {
    asOf: string;
    source: string;
    currentClose: number;
    previousClose: number | null;
    dayChangePct: number | null;
    fiveSessionChangePct: number | null;
    atr14: number | null;
    supportZone: [number, number];
    secondarySupportZone: [number, number] | null;
    resistanceZone: [number, number];
    secondaryResistanceZone: [number, number] | null;
    trendZh: string;
    trendEn: string;
    confirmationZh: string;
    confirmationEn: string;
    invalidationZh: string;
    invalidationEn: string;
  };
};

export default function SpcxResearchPage({ language }: { language: SpcxLanguage }) {
  const english = language === "en";
  const [memberData, setMemberData] = useState<MemberResponse | null>(null);
  const [state, setState] = useState<"loading" | "member" | "locked" | "unavailable">("loading");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/member/spcx-research", {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.ok) {
          const payload = (await response.json()) as MemberResponse;
          setMemberData(payload);
          setState("member");
          return;
        }
        setState(response.status === 503 ? "unavailable" : "locked");
      })
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name !== "AbortError") setState("unavailable");
      });
    return () => controller.abort();
  }, []);

  const pricingHref = english ? "/en/pricing" : "/pricing";
  const backHref = english ? "/en/markets/watchlist" : "/markets/watchlist";
  const windows = SPCX_PUBLIC_RESEARCH.publicWindows;
  const stars = useMemo(() => "★".repeat(SPCX_PUBLIC_RESEARCH.consensusStars) + "☆", []);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.kicker}>{english ? "MOOX Featured Research · SPCX · V2" : "MOOX 重点研究 · SPCX · V2事件后复算"}</div>
        <h1 className={styles.heroTitle}>
          {english ? "The timing changed. The member dossier contains what that means next." : "时间节奏已经改变，下一步怎么走只在会员专题里给答案。"}
        </h1>
        <p className={styles.heroLead}>
          {english ? SPCX_PUBLIC_RESEARCH.publicSummaryEn : SPCX_PUBLIC_RESEARCH.publicSummaryZh}
        </p>
        <div className={styles.grid}>
          <div className={styles.card}>
            <h3>{english ? "V1 → V2 revision" : "V1 → V2 修订"}</h3>
            <p>{english ? SPCX_PUBLIC_RESEARCH.revisionNoteEn : SPCX_PUBLIC_RESEARCH.revisionNoteZh}</p>
          </div>
          <div className={styles.card}>
            <h3>{english ? "What changed" : "这次为什么重算"}</h3>
            <p>{english ? "Observed post-unlock price action moved materially faster than the original timing assumption. Exact pivots and the next-stage path are now member-only." : "解锁后的真实K线明显快于原时间假设，因此产生V2。具体枢轴、支撑压力和下一阶段路径不再公开。"}</p>
          </div>
          <div className={styles.card}>
            <h3>{english ? "Consensus" : "多周期共识"}</h3>
            <p>{stars} · {english ? "directional agreement, not guaranteed return" : "方向共识较强，不代表保证收益"}</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{english ? "Public research coverage" : "公开版研究覆盖"}</h2>
        <div className={styles.grid}>
          {windows.map((window) => (
            <article className={styles.card} key={window.period}>
              <div className={styles.phaseDate}>{window.period}</div>
              <p>{english ? window.en : window.zh}</p>
            </article>
          ))}
        </div>
      </section>

      {state === "member" && memberData ? (
        <MemberResearch english={english} data={memberData} />
      ) : (
        <section className={styles.locked}>
          <h2>{english ? "Daily / weekly / monthly research is member-only" : "逐日、周、月与后期完整分析仅会员可见"}</h2>
          <p>{english ? SPCX_PUBLIC_RESEARCH.teaserEn : SPCX_PUBLIC_RESEARCH.teaserZh}</p>
          <div className={styles.actions} style={{ justifyContent: "center" }}>
            <Link className={styles.primary} href={pricingHref}>
              {english ? "Unlock full SPCX roadmap" : "解锁 SPCX 完整路径"}
            </Link>
            <Link className={styles.secondary} href={backHref}>
              {english ? "Back to Research Watchlist" : "返回重点关注"}
            </Link>
          </div>
          <div className={styles.status}>
            {state === "loading"
              ? english ? "Checking membership…" : "正在核验会员状态…"
              : state === "unavailable"
                ? english ? "Membership check is temporarily unavailable. Protected research remains hidden." : "会员核验暂时不可用，受保护研究未被公开。"
                : english ? "A valid membership is required." : "需要有效会员权限。"}
          </div>
        </section>
      )}

      <p className={styles.disclaimer}>
        {english ? SPCX_PUBLIC_RESEARCH.disclaimerEn : SPCX_PUBLIC_RESEARCH.disclaimerZh}
      </p>
    </main>
  );
}

function MemberResearch({ english, data }: { english: boolean; data: MemberResponse }) {
  const research = data.research;
  const technical = data.technical;
  const revisionLogic = english ? research.revisionLogic.en : research.revisionLogic.zh;
  const execution = english ? research.executionRules.en : research.executionRules.zh;
  const evidence = english ? research.evidenceArchive.en : research.evidenceArchive.zh;

  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{english ? "Member conclusion" : "会员版最新结论"}</h2>
        <div className={styles.phaseGrid}>
          <article className={styles.card}>
            <h3>{english ? research.direction.en : research.direction.zh}</h3>
            <p>{english ? research.consensus.meaningEn : research.consensus.meaningZh}</p>
          </article>
          <article className={styles.card}>
            <h3>{english ? "Post-unlock review" : "解锁后K线复盘"}</h3>
            <p>{english ? research.marketReview.reviewEn : research.marketReview.reviewZh}</p>
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{english ? "Why V2 changes the timing" : "为什么V2把时间节奏前移"}</h2>
        <div className={styles.card}><ul>{revisionLogic.map((item) => <li key={item}>{item}</li>)}</ul></div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{english ? "Aug. 10–14 day-by-day path" : "8月10日—14日逐日路径"}</h2>
        <div className={styles.phaseGrid}>
          {research.dailyPath.map((day) => (
            <article className={styles.card} key={day.date}>
              <div className={styles.phaseDate}>{day.date}</div>
              <h3>{english ? day.biasEn : day.biasZh}</h3>
              <p>{english ? day.pathEn : day.pathZh}</p>
              <p><strong>{english ? "Execution: " : "执行："}</strong>{english ? day.actionEn : day.actionZh}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{english ? "Weekly roadmap" : "周级路径"}</h2>
        <div className={styles.phaseGrid}>
          {research.weeklyPath.map((phase) => (
            <article className={styles.card} key={`${phase.start}-${phase.end}`}>
              <div className={styles.phaseDate}>{phase.start} → {phase.end} · {phase.risk}</div>
              <h3>{english ? phase.labelEn : phase.labelZh}</h3>
              {!english ? <p><strong>{phase.hexagramZh}</strong></p> : null}
              <p>{english ? phase.pathEn : phase.pathZh}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{english ? "Month and later horizons" : "月度与后期分层"}</h2>
        <div className={styles.phaseGrid}>
          <HorizonCard english={english} titleZh="1个月" titleEn="1 month" item={research.monthly} />
          <HorizonCard english={english} titleZh="3个月" titleEn="3 months" item={research.threeMonth} />
          <HorizonCard english={english} titleZh="1年" titleEn="1 year" item={research.oneYear} />
          <HorizonCard english={english} titleZh="5年" titleEn="5 years" item={research.fiveYear} />
        </div>
      </section>

      {research.externalTechnicalView ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{english ? "External technical cross-check" : "外部技术交叉验证"}</h2>
          <div className={styles.card}>
            <div className={styles.phaseDate}>{research.externalTechnicalView.asOf} · {english ? research.externalTechnicalView.sourceLabelEn : research.externalTechnicalView.sourceLabelZh}</div>
            <p>{english ? research.externalTechnicalView.summaryEn : research.externalTechnicalView.summaryZh}</p>
            <div className={styles.techRow}>
              {research.externalTechnicalView.levels.map((item) => (
                <div className={styles.metric} key={`${item.label}-${item.value}`}>
                  <div className={styles.metricLabel}>{item.label}</div>
                  <div className={styles.metricValue}>{item.value}</div>
                </div>
              ))}
            </div>
            <p className={styles.phaseDate}>{english ? research.externalTechnicalView.ruleEn : research.externalTechnicalView.ruleZh}</p>
          </div>
        </section>
      ) : null}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{english ? "Live technical gate" : "实时K线技术门槛"}</h2>
        {technical ? (
          <>
            <div className={styles.techRow}>
              <div className={styles.metric}><div className={styles.metricLabel}>{english ? "Latest close" : "最新收盘"}</div><div className={styles.metricValue}>${technical.currentClose}</div></div>
              <div className={styles.metric}><div className={styles.metricLabel}>{english ? "1st support" : "第一支撑区"}</div><div className={styles.metricValue}>${technical.supportZone[0]}–${technical.supportZone[1]}</div></div>
              <div className={styles.metric}><div className={styles.metricLabel}>{english ? "1st resistance" : "第一压力区"}</div><div className={styles.metricValue}>${technical.resistanceZone[0]}–${technical.resistanceZone[1]}</div></div>
              <div className={styles.metric}><div className={styles.metricLabel}>ATR14</div><div className={styles.metricValue}>{technical.atr14 == null ? "—" : `$${technical.atr14}`}</div></div>
            </div>
            <div className={styles.phaseGrid} style={{ marginTop: 12 }}>
              <article className={styles.card}><h3>{english ? "Current structure" : "当前结构"}</h3><p>{english ? technical.trendEn : technical.trendZh}</p><p className={styles.phaseDate}>{technical.asOf} · {technical.source}</p></article>
              <article className={styles.card}><h3>{english ? "Confirmation" : "确认条件"}</h3><p>{english ? technical.confirmationEn : technical.confirmationZh}</p></article>
              <article className={styles.card}><h3>{english ? "Invalidation / downgrade" : "失效／降级条件"}</h3><p>{english ? technical.invalidationEn : technical.invalidationZh}</p></article>
              <article className={styles.card}><h3>{english ? "Second zones" : "第二支撑／压力"}</h3><p>{technical.secondarySupportZone ? `$${technical.secondarySupportZone[0]}–$${technical.secondarySupportZone[1]}` : "—"} / {technical.secondaryResistanceZone ? `$${technical.secondaryResistanceZone[0]}–$${technical.secondaryResistanceZone[1]}` : "—"}</p></article>
            </div>
          </>
        ) : (
          <div className={styles.card}>
            <h3>{english ? "Live quote temporarily unavailable" : "实时行情暂时不可用"}</h3>
            <p>{english ? "Live quotes are temporarily unavailable. Use the locked V2 research logic; exact anchors are not embedded in the public client bundle and will return when server-side quote data resumes." : "实时行情暂不可用。先按V2锁定研究逻辑执行；具体技术锚点不再内置到公共客户端，服务器行情恢复后会自动返回会员技术区间。"}</p>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{english ? "Original multi-horizon evidence" : "原始多周期卦组档案"}</h2>
        <div className={styles.card}><ul>{evidence.map((item) => <li key={item}>{item}</li>)}</ul></div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{english ? "Execution and verification" : "执行与验证"}</h2>
        <div className={styles.phaseGrid}>
          <article className={styles.card}><h3>{english ? "Execution rules" : "执行规则"}</h3><ul>{execution.map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article className={styles.card}><h3>{english ? "Verification plan" : "V1/V2验证计划"}</h3><p>{english ? research.verificationPlan.en : research.verificationPlan.zh}</p></article>
        </div>
      </section>
    </>
  );
}

function HorizonCard({ english, titleZh, titleEn, item }: { english: boolean; titleZh: string; titleEn: string; item: HorizonItem }) {
  return (
    <article className={styles.card}>
      <div className={styles.phaseDate}>{english ? titleEn : titleZh} · {item.period}</div>
      <h3>{english ? item.directionEn : item.directionZh}</h3>
      {!english ? <p><strong>{item.hexagramZh}</strong></p> : null}
      <p>{english ? item.pathEn : item.pathZh}</p>
    </article>
  );
}
