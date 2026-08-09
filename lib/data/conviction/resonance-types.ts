import type { MooxPrimaryDirection } from "@/lib/forecasts/moox-direction-doctrine";

export type WatchlistResonanceSignal = {
  slug: string;
  direction: MooxPrimaryDirection;
  labelZh: string;
  strengthZh: "极强共振" | "强共振" | "方向明确" | "单周期明确" | "方向冲突" | "资料不足";
  score: number;
  sameDirectionPeriods: number;
  directionalPeriods: number;
  evidenceZh: string[];
};
