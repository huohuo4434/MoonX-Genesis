"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, Heading, Input, Text, Textarea } from "@/components/ui";
import type {
  CommitteeInput,
  CommitteeRoleOpinion,
  CommitteeRun,
  CommitteeStance,
  PublishDecision,
} from "@/lib/ai-committee/types";

const emptyInput = (): CommitteeInput => ({
  asset: "",
  symbol: "",
  horizon: "未来7天",
  asOf: new Date().toLocaleString("zh-CN", { hour12: false }),
  marketContext: "",
  technicalEvidence: "",
  liuyaoQimenEvidence: "",
  macroEvidence: "",
  existingView: "",
  riskConstraints: "2倍以内杠杆；小仓分批；必须有失效条件；禁止自动执行。",
  sourceNotes: "",
});

const stanceLabel: Record<CommitteeStance, string> = {
  BULLISH: "偏多",
  BEARISH: "偏空",
  NEUTRAL: "中性",
  MIXED: "分歧",
};

const decisionLabel: Record<PublishDecision, string> = {
  APPROVED: "可进入人工发布",
  NEEDS_REVIEW: "需要人工复核",
  REJECTED: "拒绝发布",
};

function stanceVariant(stance: CommitteeStance): "success" | "danger" | "warning" | "outline" {
  if (stance === "BULLISH") return "success";
  if (stance === "BEARISH") return "danger";
  if (stance === "MIXED") return "warning";
  return "outline";
}

function decisionVariant(decision: PublishDecision): "success" | "danger" | "warning" {
  if (decision === "APPROVED") return "success";
  if (decision === "REJECTED") return "danger";
  return "warning";
}

function RoleCard({ opinion }: { opinion: CommitteeRoleOpinion }) {
  return (
    <Card padding="md" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Heading as="h3" size="h3">{opinion.roleName}</Heading>
        <Badge variant={stanceVariant(opinion.stance)}>{stanceLabel[opinion.stance]}</Badge>
        <Badge variant="outline">信心 {Math.round(opinion.confidence)}%</Badge>
      </div>
      <Text variant="body-sm">{opinion.thesis}</Text>
      <div>
        <Text variant="caption" color="tertiary">证据标签</Text>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {opinion.evidenceRefs.map((ref) => <Badge key={ref} variant="outline">{ref}</Badge>)}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Text variant="caption" color="tertiary">支持点</Text>
          <ul className="mt-1 space-y-1 text-body-sm text-foreground-secondary">
            {opinion.supportingPoints.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </div>
        <div>
          <Text variant="caption" color="tertiary">风险与反证</Text>
          <ul className="mt-1 space-y-1 text-body-sm text-foreground-secondary">
            {opinion.risks.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </div>
      </div>
      <Text variant="body-sm"><strong>失效条件：</strong>{opinion.invalidation}</Text>
      <Text variant="body-sm"><strong>建议：</strong>{opinion.proposedAction}</Text>
      {opinion.dataGaps.length ? (
        <Text variant="caption" color="tertiary">资料缺口：{opinion.dataGaps.join("；")}</Text>
      ) : null}
    </Card>
  );
}

export function AiCommitteeClient({ initialRuns }: { initialRuns: CommitteeRun[] }) {
  const [input, setInput] = useState<CommitteeInput>(() => emptyInput());
  const [result, setResult] = useState<CommitteeRun | null>(null);
  const [runs, setRuns] = useState(initialRuns);
  const [loading, setLoading] = useState<"run" | "preview" | null>(null);
  const [error, setError] = useState("");

  const failedGates = useMemo(
    () => result?.gates.filter((gate) => !gate.passed) ?? [],
    [result]
  );

  function update<K extends keyof CommitteeInput>(key: K, value: CommitteeInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  async function submit(action: "run" | "preview") {
    setLoading(action);
    setError("");
    try {
      const response = await fetch("/api/admin/ai-committee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, input }),
      });
      const json = (await response.json()) as { result?: CommitteeRun; error?: string };
      if (!response.ok || !json.result) throw new Error(json.error || "运行失败");
      const nextResult = json.result;
      setResult(nextResult);
      if (nextResult.mode === "MODEL") {
        setRuns((current) => [nextResult, ...current.filter((item) => item.id !== nextResult.id)].slice(0, 12));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "运行失败");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <Card padding="lg" className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <Text variant="caption" color="tertiary">资产名称</Text>
            <Input value={input.asset} onChange={(event) => update("asset", event.target.value)} placeholder="例如：闪迪" />
          </label>
          <label className="space-y-1.5">
            <Text variant="caption" color="tertiary">代码</Text>
            <Input value={input.symbol ?? ""} onChange={(event) => update("symbol", event.target.value)} placeholder="例如：SNDK" />
          </label>
          <label className="space-y-1.5">
            <Text variant="caption" color="tertiary">研究周期</Text>
            <Input value={input.horizon} onChange={(event) => update("horizon", event.target.value)} />
          </label>
          <label className="space-y-1.5">
            <Text variant="caption" color="tertiary">资料时点</Text>
            <Input value={input.asOf} onChange={(event) => update("asOf", event.target.value)} />
          </label>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <label className="space-y-1.5">
            <Text variant="caption" color="tertiary">市场背景</Text>
            <Textarea rows={6} value={input.marketContext} onChange={(event) => update("marketContext", event.target.value)} placeholder="当前行情阶段、价格位置、成交环境……" />
          </label>
          <label className="space-y-1.5">
            <Text variant="caption" color="tertiary">技术结构证据</Text>
            <Textarea rows={6} value={input.technicalEvidence} onChange={(event) => update("technicalEvidence", event.target.value)} placeholder="趋势、支撑压力、波动率、成交量、多周期结构……" />
          </label>
          <label className="space-y-1.5">
            <Text variant="caption" color="tertiary">六爻与奇门证据</Text>
            <Textarea rows={6} value={input.liuyaoQimenEvidence} onChange={(event) => update("liuyaoQimenEvidence", event.target.value)} placeholder="只粘贴已有卦象和老师笔记，不要事后改写……" />
          </label>
          <label className="space-y-1.5">
            <Text variant="caption" color="tertiary">宏观与事件证据</Text>
            <Textarea rows={6} value={input.macroEvidence} onChange={(event) => update("macroEvidence", event.target.value)} placeholder="财报、政策、行业供需、事件时间……" />
          </label>
          <label className="space-y-1.5">
            <Text variant="caption" color="tertiary">已有观点</Text>
            <Textarea rows={5} value={input.existingView} onChange={(event) => update("existingView", event.target.value)} placeholder="当前MOOX锁定观点或需要复核的结论……" />
          </label>
          <label className="space-y-1.5">
            <Text variant="caption" color="tertiary">风险约束</Text>
            <Textarea rows={5} value={input.riskConstraints} onChange={(event) => update("riskConstraints", event.target.value)} />
          </label>
        </div>

        <label className="space-y-1.5">
          <Text variant="caption" color="tertiary">来源备注</Text>
          <Textarea rows={4} value={input.sourceNotes} onChange={(event) => update("sourceNotes", event.target.value)} placeholder="内部备注、数据缺口、哪些信息尚未核实……" />
        </label>

        <div className="flex flex-wrap gap-3">
          <Button type="button" isLoading={loading === "run"} onClick={() => void submit("run")}>运行研究委员会</Button>
          <Button type="button" variant="outline" isLoading={loading === "preview"} onClick={() => void submit("preview")}>只检查提示词与输入闸门</Button>
          <Button type="button" variant="ghost" onClick={() => { setInput(emptyInput()); setResult(null); setError(""); }}>清空</Button>
        </div>
        {error ? <Text variant="body-sm" className="text-danger">{error}</Text> : null}
      </Card>

      {result ? (
        <section className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Heading as="h2" size="h3">本次委员会结果</Heading>
            <Badge variant="outline">{result.executionPolicy}</Badge>
            <Badge variant="outline">{result.model}</Badge>
            <Badge variant={result.saved ? "success" : "warning"}>{result.saved ? "已保存" : "未保存"}</Badge>
          </div>

          <Card padding="md">
            <Text variant="body-sm" weight="semibold">验证闸门</Text>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {result.gates.map((gate) => (
                <div key={gate.id} className="flex items-start gap-2 rounded-md border border-border/[0.08] p-3">
                  <Badge variant={gate.passed ? "success" : gate.severity === "BLOCKER" ? "danger" : "warning"}>{gate.passed ? "通过" : gate.severity}</Badge>
                  <div>
                    <Text variant="body-sm" weight="semibold">{gate.label}</Text>
                    <Text variant="caption" color="tertiary" className="mt-1 block">{gate.message}</Text>
                  </div>
                </div>
              ))}
            </div>
            {failedGates.length ? <Text variant="caption" className="mt-3 block text-amber-500">当前有 {failedGates.length} 个闸门未通过。</Text> : null}
          </Card>

          {result.promptPreview ? (
            <Card padding="md" className="space-y-4">
              <Heading as="h3" size="h3">提示词预览</Heading>
              <details>
                <summary className="cursor-pointer text-body-sm">Builder系统提示词</summary>
                <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-caption">{result.promptPreview.builderSystemPrompt}</pre>
              </details>
              <details>
                <summary className="cursor-pointer text-body-sm">Builder输入</summary>
                <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-caption">{result.promptPreview.builderUserPrompt}</pre>
              </details>
              <details>
                <summary className="cursor-pointer text-body-sm">Reviewer系统提示词</summary>
                <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-caption">{result.promptPreview.reviewerSystemPrompt}</pre>
              </details>
            </Card>
          ) : null}

          {result.opinions.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {result.opinions.map((opinion) => <RoleCard key={opinion.roleId} opinion={opinion} />)}
            </div>
          ) : null}

          {result.review ? (
            <Card padding="lg" className="space-y-4 border border-primary/30 bg-primary/5">
              <div className="flex flex-wrap items-center gap-2">
                <Heading as="h3" size="h3">最终审稿Agent</Heading>
                <Badge variant={stanceVariant(result.review.verdict)}>{stanceLabel[result.review.verdict]}</Badge>
                <Badge variant="outline">信心 {Math.round(result.review.confidence)}%</Badge>
                <Badge variant={decisionVariant(result.review.publishDecision)}>{decisionLabel[result.review.publishDecision]}</Badge>
              </div>
              <Text variant="body-sm"><strong>共识：</strong>{result.review.consensus}</Text>
              <Text variant="body-sm"><strong>最终观点：</strong>{result.review.finalView}</Text>
              <Text variant="body-sm"><strong>时间窗口：</strong>{result.review.timeWindow}</Text>
              <Text variant="body-sm"><strong>失效条件：</strong>{result.review.invalidation}</Text>
              <Text variant="body-sm"><strong>风险计划：</strong>{result.review.riskPlan}</Text>
              <Text variant="body-sm"><strong>发布理由：</strong>{result.review.publishReason}</Text>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Text variant="caption" color="tertiary">保留的分歧</Text>
                  <ul className="mt-1 space-y-1 text-body-sm text-foreground-secondary">
                    {result.review.disagreements.map((item) => <li key={item}>• {item}</li>)}
                  </ul>
                </div>
                <div>
                  <Text variant="caption" color="tertiary">下一步验证</Text>
                  <ul className="mt-1 space-y-1 text-body-sm text-foreground-secondary">
                    {result.review.nextChecks.map((item) => <li key={item}>• {item}</li>)}
                  </ul>
                </div>
              </div>
              {result.review.unsupportedClaims.length ? (
                <Text variant="body-sm" className="text-danger">未支持论断：{result.review.unsupportedClaims.join("；")}</Text>
              ) : null}
            </Card>
          ) : null}
        </section>
      ) : null}

      <section>
        <Heading as="h2" size="h3">最近运行记录</Heading>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          {runs.length ? runs.map((run) => (
            <Card key={run.id} padding="md" className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Text variant="body-sm" weight="semibold">{run.input.asset}{run.input.symbol ? `（${run.input.symbol}）` : ""}</Text>
                {run.review ? <Badge variant={stanceVariant(run.review.verdict)}>{stanceLabel[run.review.verdict]}</Badge> : null}
                {run.review ? <Badge variant={decisionVariant(run.review.publishDecision)}>{decisionLabel[run.review.publishDecision]}</Badge> : null}
              </div>
              <Text variant="caption" color="tertiary">{run.input.horizon} · {new Date(run.createdAt).toLocaleString("zh-CN", { hour12: false })}</Text>
              {run.review ? <Text variant="body-sm">{run.review.finalView}</Text> : null}
              <Button type="button" variant="ghost" size="sm" onClick={() => setResult(run)}>查看详情</Button>
            </Card>
          )) : <Text variant="body-sm" color="secondary">暂无委员会记录。</Text>}
        </div>
      </section>
    </div>
  );
}
