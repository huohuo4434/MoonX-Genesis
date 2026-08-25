import type { AnnualForecastMonth } from "@/lib/research/annual-forecast-roadmap-2026";

export type AnnualTrendFamily = "BULL" | "BEAR" | "TURN" | "NEUTRAL";

export type AnnualTrendWindow = {
  family: AnnualTrendFamily;
  label: "看涨段" | "看跌段" | "转折段" | "震荡段";
  startMonth: string;
  endMonth: string;
  months: string[];
};

export function annualTrendFamily(direction: string): AnnualTrendFamily {
  if (/先涨后跌|先跌后涨/u.test(direction)) return "TURN";
  if (/上涨/u.test(direction)) return "BULL";
  if (/下跌/u.test(direction)) return "BEAR";
  return "NEUTRAL";
}

function windowLabel(family: AnnualTrendFamily): AnnualTrendWindow["label"] {
  if (family === "BULL") return "看涨段";
  if (family === "BEAR") return "看跌段";
  if (family === "TURN") return "转折段";
  return "震荡段";
}

/** Groups only consecutive months. A separated bullish month is never merged across a bearish/neutral month. */
export function buildAnnualTrendWindows(months: readonly AnnualForecastMonth[]): AnnualTrendWindow[] {
  const output: AnnualTrendWindow[] = [];
  for (const item of months) {
    const family = annualTrendFamily(item.direction);
    const label = `${Number(item.month.slice(5))}月`;
    const previous = output[output.length - 1];
    if (previous?.family === family) {
      previous.endMonth = label;
      previous.months.push(label);
      continue;
    }
    output.push({ family, label: windowLabel(family), startMonth: label, endMonth: label, months: [label] });
  }
  return output;
}

export function annualTrendWindowRange(window: AnnualTrendWindow): string {
  return window.startMonth === window.endMonth ? window.startMonth : `${window.startMonth}—${window.endMonth}`;
}
