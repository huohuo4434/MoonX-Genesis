"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Text } from "@/components/ui";
import { deriveLiuyaoStructure } from "@/lib/consultations/input-core";
import type { ConsultationInput, LiuyaoInput } from "@/types/member-consultation";

type Row = {
  id: string;
  kind: string;
  status: string;
  missing_fields: string[];
  created_at: string;
};

type Detail = {
  request: {
    id: string;
    kind: string;
    status: string;
    missingFields: string[];
    currentVersion: number | null;
    createdAt: string;
    updatedAt: string;
  };
  privateInput: ConsultationInput;
  latest: null | {
    version: number;
    authorKind: string;
    createdAt: string;
    content: string;
  };
};

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "待老师解答",
  HUMAN_REVIEW: "人工解答中",
  DRAFT_READY: "已有旧草稿",
  NEEDS_INFO: "等待会员补充",
  APPROVED: "已完成",
  REJECTED: "已拒绝",
  CANCELLED: "会员已取消",
  SYSTEM_FAILED: "处理失败",
};

function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

function lineLabel(value: 6 | 7 | 8 | 9) {
  if (value === 6) return "老阴（动）";
  if (value === 7) return "少阳";
  if (value === 8) return "少阴";
  return "老阳（动）";
}

function HexagramLine({ value, lineNumber }: { value: 6 | 7 | 8 | 9; lineNumber: number }) {
  const yang = value === 7 || value === 9;
  const movingMark = value === 6 ? "×" : value === 9 ? "○" : "";
  return (
    <div className="grid grid-cols-[3rem_minmax(8rem,13rem)_1fr] items-center gap-3 text-body-sm">
      <span className="text-white/45">{lineNumber}爻</span>
      <span className="flex items-center gap-2" aria-label={`${lineNumber}爻 ${lineLabel(value)}`}>
        {yang ? (
          <span className="block h-1.5 w-32 rounded-full bg-amber-200" />
        ) : (
          <span className="flex w-32 justify-between"><span className="h-1.5 w-14 rounded-full bg-sky-200" /><span className="h-1.5 w-14 rounded-full bg-sky-200" /></span>
        )}
        <span className="w-5 text-center font-semibold text-amber-300">{movingMark}</span>
      </span>
      <span className="text-white/65">{value} · {lineLabel(value)}</span>
    </div>
  );
}

function LiuyaoInputPanel({ input }: { input: LiuyaoInput }) {
  const structure = useMemo(() => deriveLiuyaoStructure(input), [input]);
  const topDown = input.linesBottomUp.map((value, index) => ({ value, lineNumber: index + 1 })).reverse();
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-4">
        <Text variant="caption" className="block text-amber-200/70">会员问题</Text>
        <Text variant="body" weight="semibold" className="mt-2 block whitespace-pre-wrap">{input.question}</Text>
        <div className="mt-3 grid gap-2 text-body-sm text-white/65 sm:grid-cols-2">
          <p><span className="text-white/40">占问范围：</span>{input.scope}</p>
          <p><span className="text-white/40">时间范围：</span>{input.horizon}</p>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Text variant="body-sm" weight="semibold">会员原始卦象</Text>
            <Text variant="caption" color="secondary" className="mt-1 block">从上爻到初爻显示；原始记录按初爻到上爻保存。</Text>
          </div>
          <div className="text-right text-body-sm">
            <p className="font-semibold text-amber-100">本卦：{structure.basicHexagram}</p>
            <p className="mt-1 text-white/60">变卦：{structure.changedHexagram ?? "无变卦（静卦）"}</p>
          </div>
        </div>
        <div className="mt-4 space-y-2 rounded-lg border border-white/[0.07] bg-black/25 p-4">
          {topDown.map((line) => <HexagramLine key={line.lineNumber} {...line} />)}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-caption text-white/55">
          <span>动爻：{structure.movingLines.length ? structure.movingLines.map((line) => `${line}爻`).join("、") : "无"}</span>
          <span>原始数字（初→上）：{input.linesBottomUp.join("、")}</span>
        </div>
      </section>

      <section className="grid gap-2 rounded-xl border border-white/10 p-4 text-body-sm text-white/65 sm:grid-cols-2">
        <p><span className="text-white/40">起卦时间：</span>{input.castAt}</p>
        <p><span className="text-white/40">时区：</span>{input.timezone}</p>
        <p><span className="text-white/40">地点：</span>{input.location}</p>
        <p><span className="text-white/40">起卦方法：</span>{input.castMethod}</p>
      </section>
    </div>
  );
}

function BaziInputPanel({ input }: { input: Extract<ConsultationInput, { kind: "BAZI" }> }) {
  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4 text-body-sm text-white/65">
      <Text variant="caption" className="block text-amber-200/70">会员问题</Text>
      <Text variant="body" weight="semibold" className="block whitespace-pre-wrap">{input.topic}</Text>
      <div className="grid gap-2 sm:grid-cols-2">
        <p><span className="text-white/40">时间范围：</span>{input.horizon}</p>
        <p><span className="text-white/40">出生日期：</span>{input.birthDate}</p>
        <p><span className="text-white/40">出生时间：</span>{input.birthTime ?? "会员标记为不确定"}</p>
        <p><span className="text-white/40">历法：</span>{input.calendarType === "LUNAR" ? "农历" : "公历"}{input.leapMonth ? "（闰月）" : ""}</p>
        <p><span className="text-white/40">时区：</span>{input.timezone}</p>
        <p><span className="text-white/40">地点：</span>{input.location}</p>
      </div>
    </div>
  );
}

export function AdminConsultationQueue() {
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<Detail | null>(null);
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/admin/consultations", { cache: "no-store" });
    const json = await response.json();
    if (response.ok) setRows(json.requests ?? []);
    else setMessage(json.error ?? "问卦列表读取失败");
  }

  useEffect(() => { void load(); }, []);

  async function loadDetail(id: string) {
    setSelected(id);
    setMessage("");
    const response = await fetch(`/api/admin/consultations?id=${encodeURIComponent(id)}`, { cache: "no-store" });
    const json = await response.json();
    if (!response.ok || !json.detail) {
      setDetailData(null);
      setMessage(json.error ?? "问卦详情读取失败");
      return;
    }
    setDetailData(json.detail as Detail);
    setContent(json.detail.latest?.content ?? "");
  }

  async function action(name: "EDIT" | "NEEDS_INFO" | "REJECT" | "APPROVE") {
    if (!selected) return;
    const response = await fetch("/api/admin/consultations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selected,
        action: name,
        content,
        missing: name === "NEEDS_INFO" ? ["请补充准确资料"] : undefined,
        reason: name === "REJECT" ? "资料不适合继续处理" : undefined,
      }),
    });
    const json = await response.json() as { error?: string; emailStatus?: "sent" | "email_failed" | "email_not_configured" | "not_requested"; emailError?: string };
    if (!response.ok) {
      setMessage(json.error ?? "操作失败");
      return;
    }
    const nextMessage = name === "EDIT"
      ? "人工草稿已保存，可以继续修改或最终批准。"
      : name === "APPROVE" && json.emailStatus === "sent"
        ? "最终批准已完成，解答已发送至会员邮箱。"
        : name === "APPROVE" && json.emailStatus && json.emailStatus !== "not_requested"
          ? `最终批准已完成，但邮件未发送：${json.emailError ?? json.emailStatus}。会员仍可在账户内查看。`
          : `${name} 已完成`;
    await load();
    await loadDetail(selected);
    setMessage(nextMessage);
  }

  const editable = detailData?.request.status === "SUBMITTED" || detailData?.request.status === "HUMAN_REVIEW" || detailData?.request.status === "DRAFT_READY";
  const approvable = detailData?.request.status === "HUMAN_REVIEW" || detailData?.request.status === "DRAFT_READY";
  const rejectable = editable || detailData?.request.status === "NEEDS_INFO";

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(18rem,0.75fr)_minmax(32rem,1.5fr)]">
      <div className="space-y-2">
        {rows.length ? rows.map((row) => (
          <button key={row.id} className="block w-full text-left" onClick={() => void loadDetail(row.id)}>
            <Card padding="md" className={selected === row.id ? "border-amber-300/30 bg-amber-300/[0.04]" : ""}>
              <Text variant="body-sm" weight="semibold">{row.kind === "LIUYAO" ? "六爻问卦" : "八字咨询"} · {statusLabel(row.status)}</Text>
              <Text variant="caption" color="secondary" className="block">匿名申请 {row.id.slice(0, 8)} · {new Date(row.created_at).toLocaleString()}</Text>
            </Card>
          </button>
        )) : <Card padding="md"><Text variant="body-sm" color="secondary">目前没有会员问卦。</Text></Card>}
      </div>

      {detailData ? (
        <div className="space-y-4">
          <Card padding="lg">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Text variant="body-sm" weight="semibold">匿名问卦详情</Text>
              <Text variant="caption" color="secondary">{statusLabel(detailData.request.status)}</Text>
            </div>
            <div className="mt-4">
              {detailData.privateInput.kind === "LIUYAO" ? <LiuyaoInputPanel input={detailData.privateInput} /> : <BaziInputPanel input={detailData.privateInput} />}
            </div>
          </Card>

          <Card padding="lg">
            <Text variant="body-sm" weight="semibold">人工解答工作区</Text>
            <Text variant="caption" color="secondary" className="mt-1 block">直接根据会员问题和原始卦象填写，不调用AI自动解卦。</Text>
            <textarea value={content} onChange={(event) => setContent(event.target.value)} className="mt-3 min-h-64 w-full rounded-md border bg-transparent p-3" placeholder="在这里直接输入你的解卦与答复……" />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button disabled={!editable} onClick={() => void action("EDIT")}>保存人工草稿</Button>
              <Button disabled={!editable} variant="outline" onClick={() => void action("NEEDS_INFO")}>要求补资料</Button>
              <Button disabled={!rejectable} variant="outline" onClick={() => void action("REJECT")}>拒绝并退回权益</Button>
              <Button disabled={!approvable} onClick={() => void action("APPROVE")}>易老师最终批准</Button>
            </div>
            {!approvable ? <Text variant="caption" color="secondary" className="mt-2 block">先保存人工草稿，确认内容后再最终批准。</Text> : null}
            {message ? <Text variant="caption" className="mt-2 block">{message}</Text> : null}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
