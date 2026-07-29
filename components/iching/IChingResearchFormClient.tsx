/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Button, Input, Textarea, Text } from "@/components/ui";
import type { IChingResearch } from "@prisma/client";
import { ICHING_ASSET_OPTIONS, ICHING_FORECAST_TYPE_OPTIONS, ICHING_PRIORITY_OPTIONS, ICHING_RESEARCH_STATUS_OPTIONS, ICHING_SPECIAL_TYPES } from "@/lib/iching-research/asset-options";

type DraftResearchInput = Partial<IChingResearch> & { id: string };

function jsonToText(v: unknown, fallback = "") {
  if (v === null || v === undefined) return fallback;
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return fallback;
  }
}

function parseJsonLoose<T>(text: string, fallback: T): T {
  const trimmed = text.trim();
  if (!trimmed) return fallback;
  return JSON.parse(trimmed) as T;
}

function splitIntList(text: string, fallback: number[]): number[] {
  const t = text.trim();
  if (!t) return fallback;
  return t
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => Number(x))
    .filter((n) => Number.isInteger(n));
}

export function IChingResearchFormClient({
  mode,
  initial,
  onSaved,
}: {
  mode: "create" | "edit";
  initial: DraftResearchInput;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [id] = useState(initial.id);
  const [assetId, setAssetId] = useState(initial.assetId ?? "CUSTOM");
  const [forecastType, setForecastType] = useState(initial.forecastType ?? "CUSTOM");
  const [question, setQuestion] = useState(initial.question ?? "");
  const [castAt, setCastAt] = useState(() => {
    const raw = (initial.castAt instanceof Date ? initial.castAt.toISOString() : (initial.castAt as any)) ?? "";
    // datetime-local needs YYYY-MM-DDTHH:mm
    if (typeof raw === "string" && raw) return raw.slice(0, 16);
    return "";
  });
  const [forecastStartAt, setForecastStartAt] = useState(initial.forecastStartAt ?? "");
  const [forecastEndAt, setForecastEndAt] = useState(initial.forecastEndAt ?? "");

  const [sourceType, setSourceType] = useState<"MASTER" | "INTERNAL">(initial.sourceType as any ?? "INTERNAL");
  const [priority, setPriority] = useState(initial.priority ?? "NORMAL");
  const [researchStatus, setResearchStatus] = useState(initial.researchStatus ?? "WAITING_MASTER");

  const [hexagramName, setHexagramName] = useState(initial.hexagramName ?? "");
  const [changedHexagramName, setChangedHexagramName] = useState(initial.changedHexagramName ?? "");
  const [hexagramSpecialTypes, setHexagramSpecialTypes] = useState<string[]>(
    (initial.hexagramSpecialTypes as any) ?? []
  );
  const [movingLinesText, setMovingLinesText] = useState(() => {
    const mv = (initial.movingLines as any) ?? [];
    return Array.isArray(mv) ? mv.join(",") : "";
  });

  const [monthStemBranch, setMonthStemBranch] = useState(initial.monthStemBranch ?? "");
  const [dayStemBranch, setDayStemBranch] = useState(initial.dayStemBranch ?? "");
  const [emptyBranchesText, setEmptyBranchesText] = useState(jsonToText(initial.emptyBranches, "[]"));
  const [usefulGod, setUsefulGod] = useState(initial.usefulGod ?? "");
  const [worldLineText, setWorldLineText] = useState(jsonToText(initial.worldLine, "{}"));
  const [responseLineText, setResponseLineText] = useState(jsonToText(initial.responseLine, "{}"));
  const [lineDataText, setLineDataText] = useState(jsonToText(initial.lineData, "[]"));
  const [rawImageUrlsText, setRawImageUrlsText] = useState(jsonToText(initial.rawImageUrls, "[]"));
  const [rawTranscript] = useState(initial.rawTranscript ?? "");

  const [masterOriginalAnalysis, setMasterOriginalAnalysis] = useState(initial.masterOriginalAnalysis ?? "");
  const [masterStructuredSummary, setMasterStructuredSummary] = useState(initial.masterStructuredSummary ?? "");

  const [internalAnalysis, setInternalAnalysis] = useState(initial.internalAnalysis ?? "");
  const [analysisStepsText, setAnalysisStepsText] = useState(jsonToText(initial.analysisSteps, "[]"));
  const [timeWindowsText, setTimeWindowsText] = useState(jsonToText(initial.timeWindows, "[]"));

  const [masterDirectionConclusion] = useState(initial.masterDirectionConclusion ?? "");
  const [masterPathConclusion] = useState(initial.masterPathConclusion ?? "");
  const [masterConfidenceText] = useState(initial.masterConfidence != null ? String(initial.masterConfidence) : "");

  const [internalDirectionConclusion, setInternalDirectionConclusion] = useState(initial.internalDirectionConclusion ?? "");
  const [internalPathConclusion, setInternalPathConclusion] = useState(initial.internalPathConclusion ?? "");
  const [internalConfidenceText, setInternalConfidenceText] = useState(initial.internalConfidence != null ? String(initial.internalConfidence) : "");

  const [adoptedSource, setAdoptedSource] = useState(initial.adoptedSource ?? (sourceType === "MASTER" ? "MASTER" : "INTERNAL"));
  const [masterOverride, setMasterOverride] = useState(initial.masterOverride ?? (sourceType === "INTERNAL"));
  const [changeReason, setChangeReason] = useState("更新六爻研究内容");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const specialTypes = useMemo(() => {
    return new Set(hexagramSpecialTypes);
  }, [hexagramSpecialTypes]);

  function toggleSpecial(t: string) {
    setHexagramSpecialTypes((cur) => {
      const s = new Set(cur);
      if (s.has(t)) s.delete(t);
      else s.add(t);
      return Array.from(s);
    });
  }

  async function handleSave() {
    setErr(null);
    setBusy(true);
    try {
      const castAtIso = castAt
        ? // interpret datetime-local as local time then keep it stable
          new Date(castAt).toISOString()
        : new Date().toISOString();

      const payload: any = {
        id,
        assetId,
        question,
        forecastType,
        forecastStartAt,
        forecastEndAt,
        castAt: castAtIso,
        timezone: "Asia/Shanghai",
        sourceType,
        priority,
        researchStatus,
        hexagramName,
        changedHexagramName: changedHexagramName || null,
        hexagramSpecialTypes,
        movingLines: splitIntList(movingLinesText, []),
        monthStemBranch: monthStemBranch || null,
        dayStemBranch: dayStemBranch || null,
        emptyBranches: parseJsonLoose(emptyBranchesText, []),
        usefulGod: usefulGod || null,
        worldLine: parseJsonLoose(worldLineText, {}),
        responseLine: parseJsonLoose(responseLineText, {}),
        lineData: parseJsonLoose(lineDataText, []),
        rawImageUrls: parseJsonLoose(rawImageUrlsText, []),
        rawTranscript: rawTranscript || null,

        masterOriginalAnalysis: masterOriginalAnalysis || null,
        masterStructuredSummary: masterStructuredSummary || null,
        internalAnalysis: internalAnalysis || null,
        analysisSteps: parseJsonLoose(analysisStepsText, []),
        timeWindows: parseJsonLoose(timeWindowsText, []),

        // Adopted / teacher/internal conclusions
        masterDirectionConclusion: masterDirectionConclusion || null,
        masterPathConclusion: masterPathConclusion || null,
        masterConfidence: masterConfidenceText ? Number(masterConfidenceText) : null,

        internalDirectionConclusion: internalDirectionConclusion || null,
        internalPathConclusion: internalPathConclusion || null,
        internalConfidence: internalConfidenceText ? Number(internalConfidenceText) : null,

        adoptedSource,
        adoptedResearchId: initial.adoptedResearchId ?? null,
        masterOverride,
        knowledgeVersion: initial.knowledgeVersion ?? null,
        version: initial.version ?? 1,

        // Keep generic adopted fields empty by default
        directionConclusion: initial.directionConclusion ?? null,
        pathConclusion: initial.pathConclusion ?? null,
        confidence: initial.confidence ?? null,

        createdBy: initial.createdBy ?? "admin",
        updatedBy: "admin",
      };

      if (mode === "create") {
        const res = await fetch("/api/admin/iching/library", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "保存失败");
      } else {
        const res = await fetch(`/api/admin/iching/library/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...payload, changeReason, changedBy: "admin" }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "更新失败");
      }

      onSaved?.();
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateDraft() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/iching/library/${encodeURIComponent(id)}/generate-draft`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ changedBy: "admin" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "生成失败");
      onSaved?.();
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {mode === "edit" ? (
        <div className="flex items-center justify-between gap-3">
          <Text variant="body-sm" color="secondary">
            ID：<span className="font-mono">{id}</span>
          </Text>
          <Link className="text-caption text-primary underline underline-offset-2 hover:opacity-90" href="/admin/iching/library">
            返回列表
          </Link>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <Text variant="body-sm" color="secondary">
            新建六爻研究记录（管理员可见）
          </Text>
          <Link className="text-caption text-primary underline underline-offset-2 hover:opacity-90" href="/admin/iching/library">
            返回列表
          </Link>
        </div>
      )}

      {err ? (
        <Card padding="md" className="border border-danger/30 bg-danger/5">
          <Text variant="body-sm" color="secondary" className="whitespace-pre-wrap">
            {err}
          </Text>
        </Card>
      ) : null}

      <Card padding="lg" className="space-y-5">
        <Text variant="label" color="secondary">
          A. 基本信息
        </Text>
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <Text variant="caption" color="tertiary">
              资产
            </Text>
            <select className="mt-2 w-full rounded-md border border-input bg-surface px-3 py-2 text-body-sm" value={assetId} onChange={(e) => setAssetId(e.target.value)}>
              {ICHING_ASSET_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label>
            <Text variant="caption" color="tertiary">
              来源
            </Text>
            <select className="mt-2 w-full rounded-md border border-input bg-surface px-3 py-2 text-body-sm" value={sourceType} onChange={(e) => setSourceType(e.target.value as any)}>
              <option value="INTERNAL">INTERNAL</option>
              <option value="MASTER">MASTER</option>
            </select>
          </label>

          <label>
            <Text variant="caption" color="tertiary">
              预测周期
            </Text>
            <select className="mt-2 w-full rounded-md border border-input bg-surface px-3 py-2 text-body-sm" value={forecastType} onChange={(e) => setForecastType(e.target.value)}>
              {ICHING_FORECAST_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label>
            <Text variant="caption" color="tertiary">
              状态
            </Text>
            <select className="mt-2 w-full rounded-md border border-input bg-surface px-3 py-2 text-body-sm" value={researchStatus} onChange={(e) => setResearchStatus(e.target.value)}>
              {ICHING_RESEARCH_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label>
            <Text variant="caption" color="tertiary">
              起卦时间（datetime-local）
            </Text>
            <Input className="mt-2" type="datetime-local" value={castAt} onChange={(e) => setCastAt(e.target.value)} />
          </label>
          <label>
            <Text variant="caption" color="tertiary">
              月建 / 日辰输入从课程计算（本 UI 仅录入）
            </Text>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Input placeholder="月建，如 乙未" value={monthStemBranch} onChange={(e) => setMonthStemBranch(e.target.value)} />
              <Input placeholder="日辰，如 甲辰" value={dayStemBranch} onChange={(e) => setDayStemBranch(e.target.value)} />
            </div>
          </label>

          <label className="sm:col-span-2">
            <Text variant="caption" color="tertiary">
              问题（完整原始问题）
            </Text>
            <Textarea className="mt-2" rows={4} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="问题原文..." />
          </label>

          <label>
            <Text variant="caption" color="tertiary">
              预测开始
            </Text>
            <Input className="mt-2" type="date" value={forecastStartAt} onChange={(e) => setForecastStartAt(e.target.value)} />
          </label>
          <label>
            <Text variant="caption" color="tertiary">
              预测结束
            </Text>
            <Input className="mt-2" type="date" value={forecastEndAt} onChange={(e) => setForecastEndAt(e.target.value)} />
          </label>

          <label className="sm:col-span-2">
            <Text variant="caption" color="tertiary">
              用神（定用神）
            </Text>
            <Input className="mt-2" value={usefulGod} onChange={(e) => setUsefulGod(e.target.value)} placeholder="例如：妻财" />
          </label>

          <label className="sm:col-span-2">
            <Text variant="caption" color="tertiary">
              六爻优先级（priority）
            </Text>
            <select className="mt-2 w-full rounded-md border border-input bg-surface px-3 py-2 text-body-sm" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {ICHING_PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <Card padding="lg" className="space-y-5">
        <Text variant="label" color="secondary">
          B. 原始卦象
        </Text>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="sm:col-span-2">
            <Text variant="caption" color="tertiary">
              主卦
            </Text>
            <Input className="mt-2" value={hexagramName} onChange={(e) => setHexagramName(e.target.value)} placeholder="例如：雷泽归妹" />
          </label>
          <label className="sm:col-span-2">
            <Text variant="caption" color="tertiary">
              变卦（可为空）
            </Text>
            <Input className="mt-2" value={changedHexagramName} onChange={(e) => setChangedHexagramName(e.target.value)} placeholder="例如：山泽损（无变卦可留空）" />
          </label>
          <label className="sm:col-span-2">
            <Text variant="caption" color="tertiary">
              特殊类型（多选）
            </Text>
            <div className="mt-2 flex flex-wrap gap-3">
              {ICHING_SPECIAL_TYPES.map((t) => (
                <label key={t} className="flex items-center gap-2 text-body-sm">
                  <input type="checkbox" checked={specialTypes.has(t)} onChange={() => toggleSpecial(t)} />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </label>
          <label className="sm:col-span-2">
            <Text variant="caption" color="tertiary">
              动爻（movingLines，例如：1,5）
            </Text>
            <Input className="mt-2" value={movingLinesText} onChange={(e) => setMovingLinesText(e.target.value)} placeholder="例如：1,5" />
          </label>
          <label className="sm:col-span-2">
            <Text variant="caption" color="tertiary">
              旬空（JSON数组）
            </Text>
            <Textarea className="mt-2" rows={3} value={emptyBranchesText} onChange={(e) => setEmptyBranchesText(e.target.value)} />
          </label>
        </div>
      </Card>

      <Card padding="lg" className="space-y-5">
        <Text variant="label" color="secondary">
          C. 六爻逐爻数据（lineData JSON）
        </Text>
        <Text variant="body-sm" color="secondary">
          逐爻数据用于后台完全保存：不要只填卦名。lineData 必须是数组；每一爻至少包含必填键名（若缺失将直接阻止保存）。
        </Text>
        <Textarea className="mt-2" rows={12} value={lineDataText} onChange={(e) => setLineDataText(e.target.value)} />

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Text variant="caption" color="tertiary">
              世爻（worldLine JSON）
            </Text>
            <Textarea className="mt-2" rows={6} value={worldLineText} onChange={(e) => setWorldLineText(e.target.value)} />
          </div>
          <div>
            <Text variant="caption" color="tertiary">
              应爻（responseLine JSON）
            </Text>
            <Textarea className="mt-2" rows={6} value={responseLineText} onChange={(e) => setResponseLineText(e.target.value)} />
          </div>
        </div>
      </Card>

      <Card padding="lg" className="space-y-5">
        <Text variant="label" color="secondary">
          D. 原图（rawImageUrls）
        </Text>
        <Text variant="body-sm" color="secondary">
          当前实现仅保存 URL 数组（管理员后续可替换为对象存储上传接口）。不要自动删除旧图。
        </Text>
        <Textarea className="mt-2" rows={4} value={rawImageUrlsText} onChange={(e) => setRawImageUrlsText(e.target.value)} />
      </Card>

      <Card padding="lg" className="space-y-5">
        <Text variant="label" color="secondary">
          E. 老师内容（老师原文禁止自动改写）
        </Text>
        <div className="grid gap-4">
          <label>
            <Text variant="caption" color="tertiary">
              老师原文（masterOriginalAnalysis）
            </Text>
            <Textarea className="mt-2" rows={6} value={masterOriginalAnalysis} onChange={(e) => setMasterOriginalAnalysis(e.target.value)} placeholder="老师原话..." />
          </label>
          <label>
            <Text variant="caption" color="tertiary">
              老师结构化摘要（可为空；不得覆盖老师原文）
            </Text>
            <Textarea className="mt-2" rows={4} value={masterStructuredSummary} onChange={(e) => setMasterStructuredSummary(e.target.value)} />
          </label>
        </div>
      </Card>

      <Card padding="lg" className="space-y-5">
        <Text variant="label" color="secondary">
          F. 内部内容（internalAnalysis + 时间窗口 / 路径）
        </Text>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="sm:col-span-2">
            <Text variant="caption" color="tertiary">
              内部分析（逐步草稿也可写在这里）
            </Text>
            <Textarea className="mt-2" rows={6} value={internalAnalysis} onChange={(e) => setInternalAnalysis(e.target.value)} placeholder="内部研究分析..." />
          </label>
          <label>
            <Text variant="caption" color="tertiary">
              时间窗口（timeWindows JSON）
            </Text>
            <Textarea className="mt-2" rows={6} value={timeWindowsText} onChange={(e) => setTimeWindowsText(e.target.value)} />
          </label>
          <label>
            <Text variant="caption" color="tertiary">
              分析步骤（analysisSteps JSON）
            </Text>
            <Textarea className="mt-2" rows={6} value={analysisStepsText} onChange={(e) => setAnalysisStepsText(e.target.value)} />
          </label>

          <label>
            <Text variant="caption" color="tertiary">
              内部方向结论（allowed direction words）
            </Text>
            <Input className="mt-2" value={internalDirectionConclusion} onChange={(e) => setInternalDirectionConclusion(e.target.value)} placeholder="例如：震荡下跌" />
          </label>
          <label>
            <Text variant="caption" color="tertiary">
              内部路径结论
            </Text>
            <Input className="mt-2" value={internalPathConclusion} onChange={(e) => setInternalPathConclusion(e.target.value)} placeholder="例如：震荡上涨 → 冲高回落" />
          </label>
          <label>
            <Text variant="caption" color="tertiary">
              内部置信度（0-100）
            </Text>
            <Input className="mt-2" value={internalConfidenceText} onChange={(e) => setInternalConfidenceText(e.target.value)} placeholder="例如：60" />
          </label>
        </div>

        <div className="mt-4 border-t border-border/[0.08] pt-4">
          <Text variant="caption" color="tertiary">
            采用规则（管理员可见）
          </Text>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <label>
              <Text variant="caption" color="tertiary">
                最终采用：来源
              </Text>
              <select className="mt-2 w-full rounded-md border border-input bg-surface px-3 py-2 text-body-sm" value={adoptedSource} onChange={(e) => setAdoptedSource(e.target.value)}>
                <option value="NONE">NONE</option>
                <option value="MASTER">MASTER</option>
                <option value="INTERNAL">INTERNAL</option>
              </select>
            </label>
            <label>
              <Text variant="caption" color="tertiary">
                masterOverride（INTERNAL 默认 true）
              </Text>
              <select className="mt-2 w-full rounded-md border border-input bg-surface px-3 py-2 text-body-sm" value={masterOverride ? "true" : "false"} onChange={(e) => setMasterOverride(e.target.value === "true")}>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </label>
          </div>
        </div>
      </Card>

      <Card padding="lg" className="space-y-4">
        <Text variant="label" color="secondary">
          保存与操作
        </Text>
        {mode === "edit" ? (
          <label>
            <Text variant="caption" color="tertiary">
              版本变更原因（用于版本快照 IChingResearchVersion）
            </Text>
            <Input className="mt-2" value={changeReason} onChange={(e) => setChangeReason(e.target.value)} />
          </label>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button disabled={busy} onClick={handleSave}>
            {mode === "create" ? "保存记录" : "更新并生成版本快照"}
          </Button>
          <Button disabled={busy} variant="secondary" onClick={handleGenerateDraft}>
            生成分析草稿
          </Button>
        </div>
      </Card>
    </div>
  );
}

