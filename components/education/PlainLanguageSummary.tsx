"use client";

import {
  mooxDirectionArrow,
  mooxDirectionLabelEn,
  mooxDirectionLabelZh,
  mooxDirectionSentenceEn,
  mooxDirectionSentenceZh,
  mooxPrimaryDirection,
  mooxTechnicalReferenceZh,
} from "@/lib/forecasts/moox-direction-doctrine";

export function PlainLanguageSummary({
  direction,
  path,
  confirmation,
  invalidation,
  en = false,
}: {
  direction: string;
  path?: string | null;
  confirmation?: string | null;
  invalidation?: string | null;
  en?: boolean;
}) {
  const primary = mooxPrimaryDirection(direction);
  const label = en ? mooxDirectionLabelEn(direction) : mooxDirectionLabelZh(direction);
  const sentence = en ? mooxDirectionSentenceEn(direction) : mooxDirectionSentenceZh(direction);
  const followText = en ? confirmation : mooxTechnicalReferenceZh(confirmation, "follow");
  const riskText = en ? invalidation : mooxTechnicalReferenceZh(invalidation, "risk");
  const tone = primary === "BULLISH"
    ? "border-emerald-400/20 bg-emerald-400/[0.04] text-emerald-100"
    : primary === "BEARISH"
      ? "border-rose-400/20 bg-rose-400/[0.04] text-rose-100"
      : "border-amber-400/20 bg-amber-400/[0.04] text-amber-100";

  return (
    <div className={`rounded-lg border p-3 ${tone}`}>
      <p className="text-caption font-semibold opacity-70">
        {en ? "MOOX OFFICIAL DIRECTION" : "MOOX 唯一方向"}
      </p>
      <p className="mt-1 text-lg font-semibold">
        {mooxDirectionArrow(direction)} {label}
      </p>
      <p className="mt-1 text-body-sm opacity-80">{sentence}</p>
      {path ? (
        <p className="mt-2 text-caption opacity-65">
          <span className="font-semibold">{en ? "Path: " : "节奏："}</span>{path}
        </p>
      ) : null}
      {(confirmation || invalidation) ? (
        <details className="mt-2 text-caption opacity-65">
          <summary className="min-h-8 cursor-pointer py-1">
            {en ? "Show technical level notes" : "展开技术点位参考"}
          </summary>
          <div className="mt-1 space-y-1 border-t border-current/10 pt-2">
            <p>{en ? "Technical analysis does not change the MOOX direction; it is used only for entry location and risk control." : "技术分析不改变MOOX方向，只用于找位置和风控。"}</p>
            {confirmation ? <p><span className="font-medium">{en ? "Execution reference: " : "跟随参考："}</span>{followText}</p> : null}
            {invalidation ? <p><span className="font-medium">{en ? "Risk-control reference: " : "风控参考："}</span>{riskText}</p> : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}
