"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";
import type { ConsultationKind, ConsultationPublicRequest, ConsultationStatus } from "@/types/member-consultation";

type Snapshot = { quota: { total: number; available: number; reserved: number; consumed: number }; requests: ConsultationPublicRequest[] };
type CoinValue = 6 | 7 | 8 | 9;
type CoinSelection = CoinValue | null;
type AnswerMap = Record<string, { content: string; disclosure: string }>;

const LINE_NAMES = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"] as const;
const COIN_OPTIONS: Array<{ value: CoinValue; coins: string; line: string; note: string }> = [
  { value: 6, coins: "0字 · 3背", line: "老阴", note: "动爻" },
  { value: 7, coins: "1字 · 2背", line: "少阳", note: "静爻" },
  { value: 8, coins: "2字 · 1背", line: "少阴", note: "静爻" },
  { value: 9, coins: "3字 · 0背", line: "老阳", note: "动爻" },
];

function statusLabel(status: ConsultationStatus): string {
  const labels: Record<ConsultationStatus, string> = {
    RESERVED: "已预留",
    SUBMITTED: "已提交",
    AI_DRAFTING: "资料整理中",
    DRAFT_READY: "等待老师复核",
    HUMAN_REVIEW: "老师解读中",
    NEEDS_INFO: "需要补充资料",
    REJECTED: "未受理",
    APPROVED: "已完成",
    CANCELLED: "已取消",
    SYSTEM_FAILED: "处理失败",
    INFO_EXPIRED: "补充期限已过",
    PURGE_PENDING: "等待删除",
    PURGED: "私密资料已删除",
  };
  return labels[status];
}

function kindLabel(kind: ConsultationKind): string {
  return kind === "LIUYAO" ? "六爻问卦" : "八字咨询";
}

function localDateTime(): string {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function MemberConsultationClient() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [kind, setKind] = useState<ConsultationKind>("LIUYAO");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [supplementId, setSupplementId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [lines, setLines] = useState<CoinSelection[]>([null, null, null, null, null, null]);
  const [calmSeconds, setCalmSeconds] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timezone, setTimezone] = useState("Asia/Shanghai");

  useEffect(() => {
    const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (resolved) setTimezone(resolved);
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    const timer = window.setInterval(() => {
      setCalmSeconds((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(timer);
          setTimerRunning(false);
          return 0;
        }
        return seconds - 1;
      });
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [timerRunning]);

  const calmComplete = calmSeconds === 0;
  const allLinesRecorded = lines.every((value): value is CoinValue => value !== null);
  const castSummary = useMemo(() => lines.map((value, index) => `${LINE_NAMES[index]} ${value === null ? "待记录" : (COIN_OPTIONS.find((item) => item.value === value)?.coins ?? value)}`).join("；"), [lines]);

  async function refresh() {
    const response = await fetch("/api/member/consultations", { cache: "no-store" });
    const json = await response.json() as Partial<Snapshot> & { error?: string };
    if (response.ok && json.quota && json.requests) setSnapshot({ quota: json.quota, requests: json.requests });
    else setMessage(json.error ?? "咨询服务暂不可用");
  }

  useEffect(() => { void refresh(); }, []);

  function startCalmTimer() {
    setCalmSeconds(60);
    setTimerRunning(true);
    setMessage("");
  }

  function updateLine(index: number, value: CoinValue) {
    setLines((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));
  }

  async function submit(form: FormData) {
    setBusy(true);
    setMessage("");
    if (kind === "LIUYAO" && !calmComplete) {
      setMessage("请先完成60秒静心，再按顺序录入六次投掷结果。");
      setBusy(false);
      return;
    }
    if (kind === "LIUYAO" && !allLinesRecorded) {
      setMessage("请从初爻到上爻完整记录六次投掷结果。");
      setBusy(false);
      return;
    }
    const common = {
      kind,
      timezone,
      location: String(form.get("location") ?? "").trim(),
      horizon: String(form.get("horizon") ?? "").trim(),
      replyEmail: String(form.get("replyEmail") ?? "").trim(),
      consent: form.get("consent") === "on",
    };
    const payload = kind === "LIUYAO"
      ? {
          ...common,
          question: String(form.get("question") ?? "").trim(),
          scope: String(form.get("scope") ?? "").trim() || "无补充背景",
          castAt: new Date(String(form.get("castAt") ?? localDateTime())).toISOString(),
          castMethod: "三枚相同钱币六次投掷；复杂面为背，简单面为字；自下而上记录",
          linesBottomUp: lines as [CoinValue, CoinValue, CoinValue, CoinValue, CoinValue, CoinValue],
        }
      : {
          ...common,
          calendarType: String(form.get("calendarType")),
          leapMonth: form.get("leapMonth") === "on",
          birthDate: String(form.get("birthDate")),
          birthTime: form.get("birthTime") ? String(form.get("birthTime")) : null,
          timePrecision: String(form.get("timePrecision")),
          sourceConfidence: String(form.get("sourceConfidence")),
          trueSolarTimeConsent: form.get("trueSolarTimeConsent") === "on",
          topic: String(form.get("topic")),
          gender: "UNSPECIFIED",
        };
    const response = await fetch(supplementId ? `/api/member/consultations/${supplementId}` : "/api/member/consultations", {
      method: supplementId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await response.json() as { error?: string };
    setMessage(response.ok
      ? (supplementId ? "补充资料已提交，不会再次扣减权益。" : "申请已提交。老师完成解读后会发到邮箱，并保留在会员中心。")
      : `提交失败：${json.error ?? "UNKNOWN"}`);
    if (response.ok) {
      setSupplementId(null);
      setCalmSeconds(60);
      setLines([null, null, null, null, null, null]);
      await refresh();
    }
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-violet-300/15 bg-[radial-gradient(circle_at_90%_0%,rgba(124,92,255,.15),transparent_34%),linear-gradient(145deg,#0f1220,#090a0e)] p-6 sm:p-8">
        <Badge variant="default">会员卜卦系统</Badge>
        <Heading as="h1" size="h2" className="mt-4">静心起卦，老师解答</Heading>
        <Text variant="body" color="secondary" className="mt-3 block max-w-3xl">一次只问一件事。六次投掷从初爻到上爻依次记录；钱币图案复杂的一面记为“背”，图案简单的一面记为“字”。</Text>
        <Text variant="caption" color="tertiary" className="mt-3 block">月度会员每个会员月可提交1个问题；其他套餐按账户已发放权益显示。会员提交问题和原始卦象后，由易老师人工解答。</Text>
      </header>

      <Card padding="md">
        <div className="flex flex-wrap items-center justify-between gap-3"><Text variant="body" weight="semibold">本期权益</Text><Badge variant={snapshot?.quota.available ? "success" : "outline"}>剩余 {snapshot?.quota.available ?? "—"}</Badge></div>
        <Text variant="body-sm" color="secondary" className="mt-2 block">审核中 {snapshot?.quota.reserved ?? "—"} · 已使用 {snapshot?.quota.consumed ?? "—"} · 累计发放 {snapshot?.quota.total ?? "—"}</Text>
      </Card>

      <Card padding="lg">
        <div className="flex flex-wrap gap-2"><Button type="button" variant={kind === "LIUYAO" ? "primary" : "outline"} onClick={() => setKind("LIUYAO")}>六爻问卦</Button><Button type="button" variant={kind === "BAZI" ? "primary" : "outline"} onClick={() => setKind("BAZI")}>八字咨询</Button></div>
        <form action={submit} className="mt-6 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-2"><span className="text-body-sm font-medium">接收邮箱</span><input name="replyEmail" type="email" required placeholder="老师解答完成后发送到这里" className="w-full rounded-xl border border-border/20 bg-background p-3" /></label><label className="space-y-2"><span className="text-body-sm font-medium">起卦地点</span><input name="location" required placeholder="例如：哈尔滨" className="w-full rounded-xl border border-border/20 bg-background p-3" /></label></div>
          <label className="space-y-2"><span className="text-body-sm font-medium">问题时间范围</span><input name="horizon" required placeholder="例如：2026年9月至12月" className="w-full rounded-xl border border-border/20 bg-background p-3" /></label>
          <input type="hidden" name="timezone" value={timezone} readOnly />

          {kind === "LIUYAO" ? (
            <>
              <label className="space-y-2"><span className="text-body-sm font-medium">所问之事</span><textarea name="question" required rows={3} placeholder="一次只问一件事，并尽量把问题写清楚" className="w-full rounded-xl border border-border/20 bg-background p-3" /></label>
              <label className="space-y-2"><span className="text-body-sm font-medium">补充背景</span><textarea name="scope" rows={2} placeholder="只写与问题直接相关的背景；没有可留空" className="w-full rounded-xl border border-border/20 bg-background p-3" /></label>
              <input type="hidden" name="castAt" value={localDateTime()} readOnly />

              <section className="rounded-2xl border border-violet-300/15 bg-violet-300/[0.035] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><Heading as="h2" size="h3">第一步：静心60秒</Heading><Text variant="body-sm" color="secondary" className="mt-1 block">保持安静，心中只默念所问之事，不要中途换问题。</Text></div><div className="font-mono text-3xl text-violet-100">{String(calmSeconds).padStart(2, "0")}</div></div>
                <div className="mt-4 flex flex-wrap gap-3"><Button type="button" onClick={startCalmTimer} disabled={timerRunning}>{timerRunning ? "静心中…" : calmComplete ? "重新计时" : "开始静心"}</Button>{calmComplete ? <Badge variant="success">静心完成，可以投掷</Badge> : null}</div>
              </section>

              <section className={`rounded-2xl border p-5 ${calmComplete ? "border-cyan-300/15 bg-cyan-300/[0.025]" : "border-border/[0.08] bg-muted/10 opacity-60"}`}>
                <Heading as="h2" size="h3">第二步：投掷六次</Heading>
                <Text variant="body-sm" color="secondary" className="mt-2 block">每次同时投掷3枚相同钱币。第一次是初爻，随后向上，最后一次是上爻。</Text>
                <div className="mt-5 space-y-4">{LINE_NAMES.map((lineName, index) => <div key={lineName} className="rounded-xl border border-border/[0.09] bg-background/55 p-4"><div className="mb-3 flex items-center justify-between gap-3"><span className="font-semibold">第{index + 1}次 · {lineName}</span><span className="text-caption text-foreground-tertiary">自下而上</span></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{COIN_OPTIONS.map((option) => <button key={option.value} type="button" disabled={!calmComplete} onClick={() => updateLine(index, option.value)} className={`min-h-14 rounded-xl border px-3 py-2 text-left transition ${lines[index] === option.value ? "border-violet-300/40 bg-violet-300/[0.09] text-violet-50" : "border-border/15 bg-card/50 text-foreground-secondary hover:border-border/30"}`}><span className="block text-body-sm font-semibold">{option.coins}</span><span className="mt-1 block text-caption opacity-70">{option.line} · {option.note}</span></button>)}</div></div>)}</div>
                <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/15 p-3 text-caption text-foreground-secondary">已记录：{castSummary}</div>
              </section>
            </>
          ) : (
            <section className="grid gap-3 sm:grid-cols-2"><select name="calendarType" className="rounded-xl border border-border/20 bg-background p-3"><option value="GREGORIAN">公历</option><option value="LUNAR">农历</option></select><label className="flex items-center gap-2 rounded-xl border border-border/20 p-3"><input type="checkbox" name="leapMonth" /> 闰月</label><input type="date" name="birthDate" required className="rounded-xl border border-border/20 bg-background p-3" /><select name="timePrecision" className="rounded-xl border border-border/20 bg-background p-3"><option value="EXACT">时间准确</option><option value="UNKNOWN">时间未知</option></select><input type="time" name="birthTime" className="rounded-xl border border-border/20 bg-background p-3" /><select name="sourceConfidence" className="rounded-xl border border-border/20 bg-background p-3"><option value="HIGH">来源高置信</option><option value="MEDIUM">来源中等</option><option value="LOW">来源待核</option></select><input name="topic" required placeholder="咨询主题" className="rounded-xl border border-border/20 bg-background p-3 sm:col-span-2" /><label className="flex items-start gap-2 rounded-xl border border-border/20 p-3 text-body-sm sm:col-span-2"><input type="checkbox" name="trueSolarTimeConsent" required className="mt-1" /> 同意校正真太阳时；未确认命盘前不推造四柱或大运</label></section>
          )}

          <label className="flex items-start gap-2 rounded-xl border border-border/20 p-4 text-body-sm"><input type="checkbox" name="consent" required className="mt-1" /><span>同意加密保存本次资料，并由MOOX研究系统辅助整理；最终答复由易老师本人复核，并发送到填写邮箱。</span></label>
          <Button disabled={busy || (!supplementId && snapshot?.quota.available === 0) || (kind === "LIUYAO" && (!calmComplete || !allLinesRecorded))}>{busy ? "提交中…" : supplementId ? "提交补充资料（不重复扣减）" : "提交并预留1次权益"}</Button>
        </form>
        {message ? <Text variant="body-sm" className="mt-4 block">{message}</Text> : null}
      </Card>

      <section>
        <Heading as="h2" size="h3">我的申请</Heading>
        <div className="mt-3 space-y-3">{snapshot?.requests.map((request) => { const answer = answers[request.id]; return <Card key={request.id} padding="md"><div className="flex flex-wrap items-center justify-between gap-2"><Text variant="body-sm" weight="semibold">{kindLabel(request.kind)}</Text><Badge variant={request.status === "APPROVED" ? "success" : request.status === "NEEDS_INFO" ? "warning" : "outline"}>{statusLabel(request.status)}</Badge></div><Text variant="caption" color="secondary" className="mt-2 block">{request.reviewerLabel}</Text>{request.missingFields.length ? <Text variant="caption" className="mt-1 block">需补充：{request.missingFields.join("、")}</Text> : null}{answer ? <><Text variant="body-sm" className="mt-3 block whitespace-pre-wrap">{answer.content}</Text><Text variant="caption" color="tertiary" className="mt-2 block">{answer.disclosure}</Text></> : null}<div className="mt-3 flex flex-wrap gap-2">{request.status === "APPROVED" && !answer ? <Button size="sm" variant="outline" onClick={async () => { const response = await fetch(`/api/member/consultations/${request.id}`, { cache: "no-store" }); const json = await response.json() as { content?: string; disclosure?: string }; if (response.ok && json.content && json.disclosure) setAnswers((current) => ({ ...current, [request.id]: { content: json.content!, disclosure: json.disclosure! } })); else setMessage("答复读取失败，请稍后重试。"); }}>查看老师答复</Button> : null}{request.status === "NEEDS_INFO" ? <Button size="sm" variant="outline" onClick={() => { setKind(request.kind); setSupplementId(request.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}>补充同一申请</Button> : null}{["APPROVED", "REJECTED", "CANCELLED", "SYSTEM_FAILED", "INFO_EXPIRED"].includes(request.status) ? <Button size="sm" variant="outline" onClick={async () => { if (!window.confirm("删除加密私密资料和答复？最小权益审计记录仍会保留。")) return; await fetch(`/api/member/consultations/${request.id}?purge=1`, { method: "DELETE" }); await refresh(); }}>删除私密资料</Button> : null}</div></Card>; })}</div>
      </section>
    </div>
  );
}
