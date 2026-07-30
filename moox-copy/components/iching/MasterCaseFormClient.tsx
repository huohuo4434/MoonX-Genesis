"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Textarea, Text } from "@/components/ui";

export function MasterCaseFormClient() {
  const router = useRouter();
  const [id] = useState(`case-${Date.now()}`);
  const [researchId, setResearchId] = useState("");
  const [caseTitle, setCaseTitle] = useState("");
  const [assetId, setAssetId] = useState("SPX");
  const [forecastStartAt, setForecastStartAt] = useState("");
  const [forecastEndAt, setForecastEndAt] = useState("");
  const [teacherConclusion, setTeacherConclusion] = useState("");
  const [actualResult, setActualResult] = useState("");
  const [validationScoreText, setValidationScoreText] = useState("");
  const [validationStatus, setValidationStatus] = useState("");
  const [lessons, setLessons] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSave() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/iching/cases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id,
          researchId,
          caseTitle,
          assetId,
          forecastStartAt,
          forecastEndAt,
          teacherConclusion: teacherConclusion || null,
          actualResult: actualResult || null,
          validationScore: validationScoreText ? Number(validationScoreText) : null,
          validationStatus: validationStatus || null,
          lessons: lessons || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "保存失败");
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
          新建六爻历史案例
        </Text>
        <Link className="text-caption text-primary underline underline-offset-2 hover:opacity-90" href="/admin/iching/cases">
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
          基本字段
        </Text>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2">
            <Text variant="caption" color="tertiary">
              researchId（关联 IChingResearch）
            </Text>
            <Input className="mt-2" value={researchId} onChange={(e) => setResearchId(e.target.value)} />
          </label>
          <label className="md:col-span-2">
            <Text variant="caption" color="tertiary">
              caseTitle
            </Text>
            <Input className="mt-2" value={caseTitle} onChange={(e) => setCaseTitle(e.target.value)} />
          </label>
          <label>
            <Text variant="caption" color="tertiary">
              assetId
            </Text>
            <Input className="mt-2" value={assetId} onChange={(e) => setAssetId(e.target.value)} />
          </label>
          <label>
            <Text variant="caption" color="tertiary">
              forecastStartAt
            </Text>
            <Input className="mt-2" type="date" value={forecastStartAt} onChange={(e) => setForecastStartAt(e.target.value)} />
          </label>
          <label>
            <Text variant="caption" color="tertiary">
              forecastEndAt
            </Text>
            <Input className="mt-2" type="date" value={forecastEndAt} onChange={(e) => setForecastEndAt(e.target.value)} />
          </label>
        </div>
      </Card>

      <Card padding="lg" className="space-y-5">
        <Text variant="label" color="secondary">
          老师结论 / 实际结果 / 经验总结
        </Text>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2">
            <Text variant="caption" color="tertiary">
              teacherConclusion
            </Text>
            <Textarea className="mt-2" rows={4} value={teacherConclusion} onChange={(e) => setTeacherConclusion(e.target.value)} />
          </label>
          <label className="md:col-span-2">
            <Text variant="caption" color="tertiary">
              actualResult
            </Text>
            <Textarea className="mt-2" rows={4} value={actualResult} onChange={(e) => setActualResult(e.target.value)} />
          </label>
          <label>
            <Text variant="caption" color="tertiary">
              validationScore
            </Text>
            <Input className="mt-2" value={validationScoreText} onChange={(e) => setValidationScoreText(e.target.value)} placeholder="例如：80" />
          </label>
          <label>
            <Text variant="caption" color="tertiary">
              validationStatus
            </Text>
            <Input className="mt-2" value={validationStatus} onChange={(e) => setValidationStatus(e.target.value)} placeholder="HIT/PARTIAL/MISS..." />
          </label>
          <label className="md:col-span-2">
            <Text variant="caption" color="tertiary">
              lessons
            </Text>
            <Textarea className="mt-2" rows={4} value={lessons} onChange={(e) => setLessons(e.target.value)} />
          </label>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button disabled={busy} onClick={handleSave}>
          保存案例
        </Button>
      </div>
    </div>
  );
}

