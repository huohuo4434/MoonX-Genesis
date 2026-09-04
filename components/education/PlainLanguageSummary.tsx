"use client";

import {
  mooxDirectionArrow,
  mooxPrimaryDirection,
} from "@/lib/forecasts/moox-direction-doctrine";
import { forecastReadingGuide } from "@/lib/presentation/forecast-reading-guide";

export function PlainLanguageSummary({
  direction,
  path,
  confirmation,
  invalidation,
  period,
  technicalReference = false,
  en = false,
}: {
  direction: string;
  path?: string | null;
  confirmation?: string | null;
  invalidation?: string | null;
  period?: string | null;
  technicalReference?: boolean;
  en?: boolean;
}) {
  const guide = forecastReadingGuide(direction, en);
  const primary = mooxPrimaryDirection(guide.direction);
  // Preserve supplied conditions verbatim: broad language cleanup can erase prices.
  const followText = confirmation;
  const riskText = invalidation;
  const tone = primary === "BULLISH"
    ? "border-emerald-400/20 bg-emerald-400/[0.04] text-emerald-100"
    : primary === "BEARISH"
      ? "border-rose-400/20 bg-rose-400/[0.04] text-rose-100"
      : "border-amber-400/20 bg-amber-400/[0.04] text-amber-100";

  return (
    <div data-forecast-reading-guide="1" className={`rounded-lg border p-3 ${tone}`}>
      <p className="text-caption font-semibold opacity-70">
        {en ? "PERIOD OUTLOOK" : "本期方向"}
      </p>
      <p className="mt-1 text-lg font-semibold">
        {mooxDirectionArrow(guide.direction)} {guide.label}
      </p>
      <p className="mt-2 text-caption opacity-80"><span className="font-semibold">{en ? "Forecast period: " : "适用周期："}</span>{period || (en ? "Use the dates shown on this forecast; not a holding deadline." : "以本条标注日期为准，不是持仓到期指令。")}</p>
      <p className="mt-2 text-body-sm leading-6"><span className="font-semibold">{en ? "What to watch: " : "现在重点看："}</span>{guide.watch}</p>
      {path ? (
        <p className="mt-2 text-caption opacity-65">
          <span className="font-semibold">{en ? "Path: " : "节奏："}</span>{path}
        </p>
      ) : null}
      <p className="mt-3 text-caption leading-5 opacity-80">{technicalReference ? (en ? "Technical references; not a live order or a filled trade's stop." : "技术参考，非实时指令或实际订单止损。") : (en ? "Original forecast conditions; check against current prices." : "原预测条件，使用前核对最新价格。")}</p>
      <dl className="mt-3 space-y-2 border-t border-current/10 pt-3 text-body-sm leading-6">
        <div><dt className="font-semibold">{en ? "Confirmation to check" : "等什么确认"}</dt><dd className="mt-1 opacity-80">{followText?.trim() || (en ? "No explicit entry confirmation is supplied here. This outlook alone is not an entry signal." : "本条未提供明确入场确认，不能只凭方向入场。")}</dd></div>
        <div><dt className="font-semibold">{en ? "When to stop following the setup" : "什么情况停止跟随"}</dt><dd className="mt-1 opacity-80">{riskText?.trim() || (en ? "No explicit invalidation is supplied here. Define a trade-specific risk limit before execution." : "本条未提供明确失效条件，执行前必须另行确定这笔交易的风险边界。")}</dd></div>
      </dl>
      <p className="mt-3 text-caption leading-5 opacity-70">{en ? "Key dates are not guaranteed turns. Exit on the trade's stop or deadline, even if the broader outlook stays bullish." : "关键日不是必然顶底；止损或期限到达就退出，不以大周期看涨为由扛单。"}</p>
    </div>
  );
}
