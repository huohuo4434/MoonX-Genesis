import "server-only";
import type { ChanSourceEvidencePack } from "@/types/chan-execution";

const evidence: ChanSourceEvidencePack = {
  version: "2026-08-14.v1",
  sourceArtifacts: [
    { id: "COURSE_ZIP", name: "缠论+NANA.zip", sourcePublishedAt: null },
    { id: "SPY_SCREENSHOT", name: "同消息上传的 SPY 8/14 截图", sourcePublishedAt: null },
  ],
  executionAuthority: "RESEARCH_ONLY",
  tradingEligible: false,
  transcribedLessons: 12,
  transcriptRange: "2026-07-06..2026-08-13",
  untranscribedAudioClaimedLearned: false,
  mooxPolicy: "玄学正式方向是唯一方向 authority；技术研究不投方向票、不翻向。35 分是 V1 执行权重政策配置，尚未接入自动交易或真实完整评分。",
  notes: [
    { source: "WOLF", sourceArtifact: "SPY_SCREENSHOT", claim: "SPY 8/14 三段路径来自同消息截图的网页 AI 整理，只保存为研究分支。", status: "TEACHER_CLAIM_PENDING" },
    { source: "NANA", sourceArtifact: "COURSE_ZIP", claim: "趋势仍偏多、VIX 对冲增加、下周波动风险上升；仅为待验证宏观期权观察。", status: "TEACHER_CLAIM_PENDING" },
    { source: "GAOSHAN", sourceArtifact: "COURSE_ZIP", claim: "无标准买卖点不做；必须区分级别并等待结构完成，技术只处理执行位置。", status: "TEACHER_CLAIM_PENDING" },
  ],
};

export function getChanExecutionEvidence20260814(): ChanSourceEvidencePack { return structuredClone(evidence); }
