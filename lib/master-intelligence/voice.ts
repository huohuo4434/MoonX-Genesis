import type { VoiceSignal } from "@/lib/master-intelligence/types";

export const DEFAULT_VOICE_PATTERNS: Array<{
  phrase: string;
  signal: VoiceSignal;
  weightDelta: number;
  note: string;
}> = [
  { phrase: "不用看了", signal: "HIGH_CERTAINTY", weightDelta: 2, note: "高确定性" },
  { phrase: "继续分析", signal: "NO_CONCLUSION", weightDelta: -1, note: "不能下结论" },
  { phrase: "重点看", signal: "HIGH_WEIGHT", weightDelta: 2, note: "高权重提示" },
  { phrase: "非常确定", signal: "HIGH_CERTAINTY", weightDelta: 2, note: "高确定性" },
  { phrase: "先不要下结论", signal: "NO_CONCLUSION", weightDelta: -2, note: "保留观察" },
];

export function detectVoiceSignals(text: string): Array<{
  phrase: string;
  signal: VoiceSignal;
  weightDelta: number;
}> {
  const hits: Array<{ phrase: string; signal: VoiceSignal; weightDelta: number }> = [];
  for (const p of DEFAULT_VOICE_PATTERNS) {
    if (text.includes(p.phrase)) {
      hits.push({ phrase: p.phrase, signal: p.signal, weightDelta: p.weightDelta });
    }
  }
  return hits;
}

export function aggregateVoiceWeightDelta(text: string): number {
  return detectVoiceSignals(text).reduce((sum, h) => sum + h.weightDelta, 0);
}
