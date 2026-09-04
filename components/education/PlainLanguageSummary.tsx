"use client";

import {
  mooxDirectionArrow,
  mooxPrimaryDirection,
  mooxTechnicalReferenceZh,
} from "@/lib/forecasts/moox-direction-doctrine";
import { forecastReadingGuide } from "@/lib/presentation/forecast-reading-guide";

export function PlainLanguageSummary({
  direction,
  path,
  confirmation,
  invalidation,
  period,
  en = false,
}: {
  direction: string;
  path?: string | null;
  confirmation?: string | null;
  invalidation?: string | null;
  period?: string | null;
  en?: boolean;
}) {
  const guide = forecastReadingGuide(direction, en);
  const primary = mooxPrimaryDirection(guide.direction);
  const followText = en ? confirmation : mooxTechnicalReferenceZh(confirmation, "follow");
  const riskText = en ? invalidation : mooxTechnicalReferenceZh(invalidation, "risk");
  const tone = primary === "BULLISH"
    ? "border-emerald-400/20 bg-emerald-400/[0.04] text-emerald-100"
    : primary === "BEARISH"
      ? "border-rose-400/20 bg-rose-400/[0.04] text-rose-100"
      : "border-amber-400/20 bg-amber-400/[0.04] text-amber-100";

  return (
    <div data-forecast-reading-guide="1" className={`rounded-lg border p-3 ${tone}`}>
      <p className="text-caption font-semibold opacity-70">
        {en ? "MOOX OFFICIAL DIRECTION · HOW TO READ IT" : "MOOX 唯一方向 · 白话解读"}
      </p>
      <p className="mt-1 text-lg font-semibold">
        {mooxDirectionArrow(guide.direction)} {guide.label}
      </p>
      <p className="mt-1 text-body-sm opacity-80">{guide.meaning}</p>
      <p className="mt-2 text-caption opacity-80"><span className="font-semibold">{en ? "Forecast period: " : "适用周期："}</span>{period || (en ? "Use the dates shown on this forecast; not a holding deadline." : "以本条标注日期为准，不是持仓到期指令。")}</p>
      <p className="mt-2 text-body-sm leading-6"><span className="font-semibold">{en ? "What to watch: " : "现在重点看："}</span>{guide.watch}</p>
      {path ? (
        <p className="mt-2 text-caption opacity-65">
          <span className="font-semibold">{en ? "Path: " : "节奏："}</span>{path}
        </p>
      ) : null}
      <dl className="mt-3 space-y-2 border-t border-current/10 pt-3 text-caption leading-5">
        <div><dt className="font-semibold">{en ? "Confirmation to check" : "等什么确认"}</dt><dd className="mt-1 opacity-80">{followText?.trim() || (en ? "No explicit entry confirmation is supplied here. This outlook alone is not an entry signal." : "本条未提供明确入场确认，不能只凭方向入场。")}</dd></div>
        <div><dt className="font-semibold">{en ? "When to stop following the setup" : "什么情况停止跟随"}</dt><dd className="mt-1 opacity-80">{riskText?.trim() || (en ? "No explicit invalidation is supplied here. Define a trade-specific risk limit before execution." : "本条未提供明确失效条件，执行前必须另行确定这笔交易的风险边界。")}</dd></div>
      </dl>
      <p className="mt-3 text-caption leading-5 opacity-70">{en ? "Reading guidance, not a live trigger. Key dates are observation windows, not guaranteed turning points. A stop or expiry ends the trade setup even if the broader forecast remains unchanged." : "以上是观点使用说明，不代表实时条件已满足。关键日是观察窗口，不是必然顶底；触发止损或持仓期限时，不能以大周期仍看涨为由继续扛单。"}</p>
    </div>
  );
}
