import { normalizeFormalDirection } from "@/lib/forecasts/formal-direction";
import {
  mooxDirectionLabelEn,
  mooxDirectionLabelZh,
} from "@/lib/forecasts/moox-direction-doctrine";

export type DailyPathLabelZh =
  | "单边上涨"
  | "单边下跌"
  | "区间震荡"
  | "震荡上涨"
  | "震荡下跌"
  | "先涨后跌"
  | "先跌后涨"
  | "冲高回落"
  | "探底回升";

const PATH_EN: Record<DailyPathLabelZh, string> = {
  单边上涨: "Mostly one-way rise",
  单边下跌: "Mostly one-way decline",
  区间震荡: "Range-bound",
  震荡上涨: "Choppy rise",
  震荡下跌: "Choppy decline",
  先涨后跌: "Rise first, then decline",
  先跌后涨: "Dip first, then recover",
  冲高回落: "Rally, then fade",
  探底回升: "Test support, then recover",
};

export function dailyPathLabelZh(raw: string | null | undefined): DailyPathLabelZh {
  const normalized = normalizeFormalDirection(raw);
  if (normalized === "上涨") return "单边上涨";
  if (normalized === "下跌") return "单边下跌";
  if (normalized === "震荡") return "区间震荡";
  return normalized;
}

export function dailyPathLabelEn(raw: string | null | undefined): string {
  return PATH_EN[dailyPathLabelZh(raw)];
}

export function dailyDirectionHeadline(
  raw: string | null | undefined,
  locale: "zh" | "en",
): string {
  if (locale === "en") {
    return `${mooxDirectionLabelEn(raw)} · ${dailyPathLabelEn(raw)}`;
  }
  return `${mooxDirectionLabelZh(raw)} · ${dailyPathLabelZh(raw)}`;
}
