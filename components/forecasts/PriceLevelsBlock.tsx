"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { safeEnglish, safeEnglishList } from "@/lib/i18n/english-content";
import { mooxTechnicalReferenceZh } from "@/lib/forecasts/moox-direction-doctrine";

/**
 * Technical layer only. MOOX direction is defined by metaphysical research;
 * this block is intentionally limited to levels, execution and risk control.
 */
export function PriceLevelsBlock({
  support,
  resistance,
  invalidation,
  confirmation,
}: {
  support?: string[];
  resistance?: string[];
  invalidation?: string;
  confirmation?: string;
  priceSource?: string;
  snapshotAt?: string;
}) {
  const { locale } = useLocale();
  const en = locale === "en";
  const s = en ? safeEnglishList(support).filter(Boolean) : support?.filter(Boolean) ?? [];
  const r = en ? safeEnglishList(resistance).filter(Boolean) : resistance?.filter(Boolean) ?? [];
  const invalidationText = en ? safeEnglish(invalidation) : mooxTechnicalReferenceZh(invalidation, "risk");
  const confirmationText = en ? safeEnglish(confirmation) : mooxTechnicalReferenceZh(confirmation, "follow");
  const hasAny = s.length > 0 || r.length > 0 || Boolean(invalidation) || Boolean(confirmation);
  if (!hasAny) {
    return <p className="text-caption text-foreground-secondary">{en ? "Technical levels are pending. They do not determine the MOOX direction." : "技术点位待补充；点位不参与决定MOOX方向。"}</p>;
  }
  return (
    <div className="space-y-2 rounded-lg border border-cyan-400/10 bg-cyan-400/[0.02] p-3">
      <p className="text-caption font-semibold text-cyan-200/75">{en ? "TECHNICAL LEVELS · LEVELS ONLY" : "技术点位 · 只负责位置与风控"}</p>
      <p className="text-caption text-foreground-tertiary">{en ? "Metaphysical research sets direction. These levels never flip the official bullish/bearish call." : "玄学负责定方向；这里的支撑、压力和风控位不会把官方看涨改成看跌，也不会把看跌改成看涨。"}</p>
      {s.map((line) => <div key={`s-${line}`} className="space-y-0.5"><p className="text-caption text-foreground-tertiary">{en ? "Support / entry reference" : "支撑 / 入场参考"}</p><p className="break-words text-body-sm font-medium text-foreground">{line}</p></div>)}
      {r.map((line) => <div key={`r-${line}`} className="space-y-0.5"><p className="text-caption text-foreground-tertiary">{en ? "Resistance / exit reference" : "压力 / 减仓参考"}</p><p className="break-words text-body-sm font-medium text-foreground">{line}</p></div>)}
      {confirmation ? <div className="space-y-0.5"><p className="text-caption text-foreground-tertiary">{en ? "Execution reference" : "跟随参考"}</p><p className="break-words text-caption text-foreground-secondary">{confirmationText}</p></div> : null}
      {invalidation ? <div className="space-y-0.5"><p className="text-caption text-foreground-tertiary">{en ? "Risk-control reference" : "风控参考"}</p><p className="break-words text-caption text-foreground-secondary">{invalidationText}</p></div> : null}
    </div>
  );
}
