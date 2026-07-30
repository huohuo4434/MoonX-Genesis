/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Textarea, Text } from "@/components/ui";
import type { MasterRule } from "@prisma/client";

const CATEGORY_OPTIONS = [
  "USEFUL_GOD",
  "MONTH_DAY",
  "WORLD_RESPONSE",
  "WEALTH",
  "BROTHER",
  "OFFICIAL",
  "CHILD",
  "PARENT",
  "HIDDEN_SPIRIT",
  "MOVING_LINE",
  "ADVANCE_RETREAT",
  "RETURN_GENERATE_OVERCOME",
  "TIME_WINDOW",
  "MARKET_MAPPING",
  "EXCEPTION",
  "VALIDATION",
] as const;

function parseJsonLoose<T>(text: string, fallback: T): T {
  const trimmed = text.trim();
  if (!trimmed) return fallback;
  return JSON.parse(trimmed) as T;
}

export function MasterRuleFormClient({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: Partial<MasterRule> & { ruleCode?: string };
}) {
  const router = useRouter();
  const [ruleCode, setRuleCode] = useState(initial?.ruleCode ?? `MRule-${Date.now()}`);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState(initial?.category ?? "USEFUL_GOD");
  const [ruleText, setRuleText] = useState(initial?.ruleText ?? "");
  const [teacherOriginalText, setTeacherOriginalText] = useState(initial?.teacherOriginalText ?? "");

  const [structuredLogicText, setStructuredLogicText] = useState(
    initial?.structuredLogic ? JSON.stringify(initial.structuredLogic, null, 2) : "{}"
  );
  const [applicableMarketsText, setApplicableMarketsText] = useState(
    initial?.applicableMarkets ? JSON.stringify(initial.applicableMarkets, null, 2) : '["CUSTOM"]'
  );
  const [applicableForecastTypesText, setApplicableForecastTypesText] = useState(
    initial?.applicableForecastTypes ? JSON.stringify(initial.applicableForecastTypes, null, 2) : '["CUSTOM"]'
  );

  const [priorityText, setPriorityText] = useState(initial?.priority != null ? String(initial.priority) : "50");
  const [confidenceText, setConfidenceText] = useState(initial?.confidence != null ? String(initial.confidence) : "");
  const [status, setStatus] = useState(initial?.status ?? "DRAFT");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSave() {
    setBusy(true);
    setErr(null);
    try {
      const payload: any = {
        ruleCode,
        title,
        category,
        ruleText,
        teacherOriginalText,
        structuredLogic: parseJsonLoose(structuredLogicText, {}),
        applicableMarkets: parseJsonLoose(applicableMarketsText, ["CUSTOM"]),
        applicableForecastTypes: parseJsonLoose(applicableForecastTypesText, ["CUSTOM"]),
        priority: Number(priorityText),
        confidence: confidenceText ? Number(confidenceText) : null,
        status,
        createdBy: "admin",
        updatedBy: "admin",
      };

      if (mode === "create") {
        const res = await fetch("/api/admin/iching/rules", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "保存失败");
      } else {
        const res = await fetch(`/api/admin/iching/rules/${encodeURIComponent(ruleCode)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "更新失败");
      }

      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Text variant="body-sm" color="secondary">
          {mode === "create" ? "新增老师六爻规则（管理员可见）" : `编辑规则：${ruleCode}`}
        </Text>
        <Link className="text-caption text-primary underline underline-offset-2 hover:opacity-90" href="/admin/iching/rules">
          返回列表
        </Link>
      </div>

      {err ? (
        <Card padding="md" className="border border-danger/30 bg-danger/5">
          <Text variant="body-sm" color="secondary" className="whitespace-pre-wrap">
            {err}
          </Text>
        </Card>
      ) : null}

      <Card padding="lg" className="space-y-5">
        <Text variant="label" color="secondary">
          基础信息
        </Text>
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <Text variant="caption" color="tertiary">
              ruleCode
            </Text>
            <Input className="mt-2" value={ruleCode} onChange={(e) => setRuleCode(e.target.value)} disabled={mode === "edit"} />
          </label>
          <label>
            <Text variant="caption" color="tertiary">
              状态
            </Text>
            <select className="mt-2 w-full rounded-md border border-input bg-surface px-3 py-2 text-body-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              {["DRAFT", "ACTIVE", "SUPERSEDED", "ARCHIVED"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="md:col-span-2">
            <Text variant="caption" color="tertiary">
              标题
            </Text>
            <Input className="mt-2" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <label>
            <Text variant="caption" color="tertiary">
              类别
            </Text>
            <select className="mt-2 w-full rounded-md border border-input bg-surface px-3 py-2 text-body-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label>
            <Text variant="caption" color="tertiary">
              priority
            </Text>
            <Input className="mt-2" value={priorityText} onChange={(e) => setPriorityText(e.target.value)} />
          </label>

          <label>
            <Text variant="caption" color="tertiary">
              confidence (可空)
            </Text>
            <Input className="mt-2" value={confidenceText} onChange={(e) => setConfidenceText(e.target.value)} />
          </label>
        </div>
      </Card>

      <Card padding="lg" className="space-y-5">
        <Text variant="label" color="secondary">
          规则正文 + 老师原文
        </Text>
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <Text variant="caption" color="tertiary">
              ruleText
            </Text>
            <Textarea className="mt-2" rows={8} value={ruleText} onChange={(e) => setRuleText(e.target.value)} />
          </label>
          <label>
            <Text variant="caption" color="tertiary">
              teacherOriginalText（原话保留）
            </Text>
            <Textarea className="mt-2" rows={8} value={teacherOriginalText} onChange={(e) => setTeacherOriginalText(e.target.value)} />
          </label>
        </div>
      </Card>

      <Card padding="lg" className="space-y-5">
        <Text variant="label" color="secondary">
          structuredLogic / 适用范围（JSON）
        </Text>
        <div className="grid gap-4">
          <label>
            <Text variant="caption" color="tertiary">
              structuredLogic
            </Text>
            <Textarea className="mt-2" rows={6} value={structuredLogicText} onChange={(e) => setStructuredLogicText(e.target.value)} />
          </label>
          <label>
            <Text variant="caption" color="tertiary">
              applicableMarkets
            </Text>
            <Textarea className="mt-2" rows={4} value={applicableMarketsText} onChange={(e) => setApplicableMarketsText(e.target.value)} />
          </label>
          <label>
            <Text variant="caption" color="tertiary">
              applicableForecastTypes
            </Text>
            <Textarea className="mt-2" rows={4} value={applicableForecastTypesText} onChange={(e) => setApplicableForecastTypesText(e.target.value)} />
          </label>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button disabled={busy} onClick={handleSave}>
          {mode === "create" ? "保存规则" : "更新规则"}
        </Button>
        <Button disabled={busy} variant="secondary" onClick={() => router.refresh()}>
          刷新
        </Button>
      </div>
    </div>
  );
}

