"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Textarea, Text } from "@/components/ui";

export function IChingValidationFormClient() {
  const router = useRouter();
  const [id] = useState(`val-${Date.now()}`);
  const [researchId, setResearchId] = useState("");
  const [actualDirection, setActualDirection] = useState("");
  const [actualPath, setActualPath] = useState("");
  const [result, setResult] = useState("UNVERIFIABLE");
  const [validationNotes, setValidationNotes] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");

  const [directionScoreText, setDirectionScoreText] = useState("");
  const [pathScoreText, setPathScoreText] = useState("");
  const [timingScoreText, setTimingScoreText] = useState("");
  const [levelScoreText, setLevelScoreText] = useState("");
  const [totalScoreText, setTotalScoreText] = useState("");

  // optional OHLC
  const [actualOpenText, setActualOpenText] = useState("");
  const [actualHighText, setActualHighText] = useState("");
  const [actualLowText, setActualLowText] = useState("");
  const [actualCloseText, setActualCloseText] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSave() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/iching/validations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id,
          researchId,
          actualDirection: actualDirection || null,
          actualOpen: actualOpenText ? Number(actualOpenText) : null,
          actualHigh: actualHighText ? Number(actualHighText) : null,
          actualLow: actualLowText ? Number(actualLowText) : null,
          actualClose: actualCloseText ? Number(actualCloseText) : null,
          actualPath: actualPath || null,
          result: result || null,
          directionScore: directionScoreText ? Number(directionScoreText) : null,
          pathScore: pathScoreText ? Number(pathScoreText) : null,
          timingScore: timingScoreText ? Number(timingScoreText) : null,
          levelScore: levelScoreText ? Number(levelScoreText) : null,
          totalScore: totalScoreText ? Number(totalScoreText) : null,
          validationNotes: validationNotes || null,
          verifiedBy: verifiedBy || null,
          verifiedAt: new Date().toISOString(),
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
          新建六爻验证结果（仅管理员可见）
        </Text>
        <Link className="text-caption text-primary underline underline-offset-2 hover:opacity-90" href="/admin/iching/validation">
          返回列表
        </Link>
      </div>

      {err ? (
        <Card padding="md" className="border border-danger/30 bg-danger/5">
          <Text variant="body-sm" color="secondary">
            {err}
          </Text>
        </Card>
      ) : null}

      <Card padding="lg" className="space-y-4">
        <Text variant="label" color="secondary">
          基本信息
        </Text>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2">
            <Text variant="caption" color="tertiary">
              researchId
            </Text>
            <Input className="mt-2" value={researchId} onChange={(e) => setResearchId(e.target.value)} />
          </label>
          <label>
            <Text variant="caption" color="tertiary">
              result (HIT/PARTIAL/MISS/UNVERIFIABLE)
            </Text>
            <Input className="mt-2" value={result} onChange={(e) => setResult(e.target.value)} />
          </label>
          <label>
            <Text variant="caption" color="tertiary">
              verifiedBy
            </Text>
            <Input className="mt-2" value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} />
          </label>

          <label className="md:col-span-2">
            <Text variant="caption" color="tertiary">
              actualDirection
            </Text>
            <Input className="mt-2" value={actualDirection} onChange={(e) => setActualDirection(e.target.value)} />
          </label>

          <label className="md:col-span-2">
            <Text variant="caption" color="tertiary">
              actualPath
            </Text>
            <Input className="mt-2" value={actualPath} onChange={(e) => setActualPath(e.target.value)} />
          </label>
        </div>
      </Card>

      <Card padding="lg" className="space-y-4">
        <Text variant="label" color="secondary">
          分数与备注
        </Text>
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <Text variant="caption" color="tertiary">
              directionScore
            </Text>
            <Input className="mt-2" value={directionScoreText} onChange={(e) => setDirectionScoreText(e.target.value)} />
          </label>
          <label>
            <Text variant="caption" color="tertiary">
              pathScore
            </Text>
            <Input className="mt-2" value={pathScoreText} onChange={(e) => setPathScoreText(e.target.value)} />
          </label>
          <label>
            <Text variant="caption" color="tertiary">
              timingScore
            </Text>
            <Input className="mt-2" value={timingScoreText} onChange={(e) => setTimingScoreText(e.target.value)} />
          </label>
          <label>
            <Text variant="caption" color="tertiary">
              levelScore
            </Text>
            <Input className="mt-2" value={levelScoreText} onChange={(e) => setLevelScoreText(e.target.value)} />
          </label>
          <label className="md:col-span-2">
            <Text variant="caption" color="tertiary">
              totalScore
            </Text>
            <Input className="mt-2" value={totalScoreText} onChange={(e) => setTotalScoreText(e.target.value)} />
          </label>

          <label className="md:col-span-2">
            <Text variant="caption" color="tertiary">
              validationNotes
            </Text>
            <Textarea className="mt-2" rows={4} value={validationNotes} onChange={(e) => setValidationNotes(e.target.value)} />
          </label>
        </div>
      </Card>

      <Card padding="lg" className="space-y-4">
        <Text variant="label" color="secondary">
          OHLC（可为空）
        </Text>
        <div className="grid gap-4 md:grid-cols-4">
          <label>
            <Text variant="caption" color="tertiary">
              open
            </Text>
            <Input className="mt-2" value={actualOpenText} onChange={(e) => setActualOpenText(e.target.value)} />
          </label>
          <label>
            <Text variant="caption" color="tertiary">
              high
            </Text>
            <Input className="mt-2" value={actualHighText} onChange={(e) => setActualHighText(e.target.value)} />
          </label>
          <label>
            <Text variant="caption" color="tertiary">
              low
            </Text>
            <Input className="mt-2" value={actualLowText} onChange={(e) => setActualLowText(e.target.value)} />
          </label>
          <label>
            <Text variant="caption" color="tertiary">
              close
            </Text>
            <Input className="mt-2" value={actualCloseText} onChange={(e) => setActualCloseText(e.target.value)} />
          </label>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button disabled={busy} onClick={handleSave}>
          保存验证结果
        </Button>
      </div>
    </div>
  );
}

