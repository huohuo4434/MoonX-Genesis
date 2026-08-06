"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SPCX_PUBLIC_RESEARCH, type SpcxLanguage } from "@/lib/data/spcx-public-20260806";
import styles from "./SpcxWatchlist.module.css";

type MemberResponse = {
  research: {
    direction: Record<SpcxLanguage, string>;
    consensus: { stars: number; meaningZh: string; meaningEn: string };
    teacherPrivate01: { labelZh: string; labelEn: string; evidenceZh: string[]; evidenceEn: string[] };
    teacherRev322: { labelZh: string; labelEn: string; evidenceZh: string[]; evidenceEn: string[] };
    fusion: {
      agreementZh: string[];
      agreementEn: string[];
      conflictZh: string;
      conflictEn: string;
    };
    phases: Array<{
      start: string;
      end: string;
      labelZh: string;
      labelEn: string;
      pathZh: string;
      pathEn: string;
      risk: string;
    }>;
    executionRules: { zh: string[]; en: string[] };
    verificationPlan: { zh: string; en: string };
  };
  technical: null | {
    asOf: string;
    source: string;
    currentClose: number;
    atr14: number | null;
    supportZone: [number, number];
    resistanceZone: [number, number];
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
        <div className={styles.kicker}>{english ? "MOOX Featured Research · SPCX" : "MOOX 近期重点研究 · SPCX"}</div>
        <h1 className={styles.heroTitle}>
          {english ? "Supply shock first. Rebound window later." : "先经历供给冲击，再等待反弹窗口。"}
        </h1>
        <p className={styles.heroLead}>
          {english ? SPCX_PUBLIC_RESEARCH.publicSummaryEn : SPCX_PUBLIC_RESEARCH.publicSummaryZh}
        </p>
        <div className={styles.grid}>
          <div className={styles.card}>
            <h3>{english ? "Locked research" : "锁定研究"}</h3>
            <p>{english ? "Aug 6, 2026 · version 1 · pending verification" : "2026-08-06 · 第1版 · 待验证"}</p>
          </div>
          <div className={styles.card}>
            <h3>{english ? "Consensus" : "方法共识"}</h3>
            <p>{stars} · {english ? "directional agreement, not guaranteed return" : "表示方向共识，不代表保证收益"}</p>
          </div>
          <div className={styles.card}>
            <h3>{english ? "Main watch window" : "核心观察窗口"}</h3>
            <p>{english ? "Late August through early September" : "8月下旬至9月初"}</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{english ? "What is public" : "公开部分"}</h2>
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
          <h2>{english ? "The decisive part is member-only" : "决定性的部分已锁定为会员内容"}</h2>
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
                ? english ? "Membership check is temporarily unavailable. No protected research has been exposed." : "会员核验暂时不可用，受保护研究未被公开。"
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
  const teacher01 = english ? research.teacherPrivate01.evidenceEn : research.teacherPrivate01.evidenceZh;
  const teacher02 = english ? research.teacherRev322.evidenceEn : research.teacherRev322.evidenceZh;
  const agreements = english ? research.fusion.agreementEn : research.fusion.agreementZh;
  const execution = english ? research.executionRules.en : research.executionRules.zh;
  const technical = data.technical;

  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{english ? "Member conclusion" : "会员结论"}</h2>
        <div className={styles.card}>
          <h3>{english ? research.direction.en : research.direction.zh}</h3>
          <p>{english ? research.consensus.meaningEn : research.consensus.meaningZh}</p>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{english ? "Two teachers, kept separate" : "两位老师分别分析"}</h2>
        <div className={styles.phaseGrid}>
          <article className={styles.card}>
            <h3>{english ? research.teacherPrivate01.labelEn : research.teacherPrivate01.labelZh}</h3>
            <ul>{teacher01.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article className={styles.card}>
            <h3>{english ? research.teacherRev322.labelEn : research.teacherRev322.labelZh}</h3>
            <ul>{teacher02.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{english ? "Fusion and conflict" : "综合共识与冲突"}</h2>
        <div className={styles.phaseGrid}>
          <article className={styles.card}>
            <h3>{english ? "Agreement" : "一致部分"}</h3>
            <ul>{agreements.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article className={styles.card}>
            <h3>{english ? "Conflict resolution" : "冲突处理"}</h3>
            <p>{english ? research.fusion.conflictEn : research.fusion.conflictZh}</p>
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{english ? "Locked weekly path" : "锁定周级路径"}</h2>
        <div className={styles.phaseGrid}>
          {research.phases.map((phase) => (
            <article className={styles.card} key={`${phase.start}-${phase.end}`}>
              <div className={styles.phaseDate}>{phase.start} → {phase.end} · {phase.risk}</div>
              <h3>{english ? phase.labelEn : phase.labelZh}</h3>
              <p>{english ? phase.pathEn : phase.pathZh}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{english ? "Live technical gate" : "实时技术确认门槛"}</h2>
        {technical ? (
          <>
            <div className={styles.techRow}>
              <div className={styles.metric}><div className={styles.metricLabel}>{english ? "Latest close" : "最新收盘"}</div><div className={styles.metricValue}>${technical.currentClose}</div></div>
              <div className={styles.metric}><div className={styles.metricLabel}>ATR14</div><div className={styles.metricValue}>{technical.atr14 == null ? "—" : `$${technical.atr14}`}</div></div>
              <div className={styles.metric}><div className={styles.metricLabel}>{english ? "Support zone" : "支撑区"}</div><div className={styles.metricValue}>${technical.supportZone[0]}–${technical.supportZone[1]}</div></div>
              <div className={styles.metric}><div className={styles.metricLabel}>{english ? "Resistance zone" : "压力区"}</div><div className={styles.metricValue}>${technical.resistanceZone[0]}–${technical.resistanceZone[1]}</div></div>
            </div>
            <div className={styles.phaseGrid} style={{ marginTop: 12 }}>
              <div className={styles.card}><h3>{english ? "Confirmation" : "确认条件"}</h3><p>{english ? technical.confirmationEn : technical.confirmationZh}</p></div>
              <div className={styles.card}><h3>{english ? "Invalidation / delay" : "失效或延后条件"}</h3><p>{english ? technical.invalidationEn : technical.invalidationZh}</p></div>
            </div>
          </>
        ) : (
          <div className={styles.card}><p>{english ? "Live quote data is temporarily unavailable. The locked Liu Yao path remains unchanged, but execution must wait for technical data." : "实时行情暂时不可用。锁定的六爻路径不改写，但执行必须等待技术数据恢复。"}</p></div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{english ? "Execution and verification" : "执行与验证"}</h2>
        <div className={styles.phaseGrid}>
          <article className={styles.card}><h3>{english ? "Execution rules" : "执行规则"}</h3><ul>{execution.map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article className={styles.card}><h3>{english ? "Verification plan" : "验证计划"}</h3><p>{english ? research.verificationPlan.en : research.verificationPlan.zh}</p></article>
        </div>
      </section>
    </>
  );
}
