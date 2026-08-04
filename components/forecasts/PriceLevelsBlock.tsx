"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { safeEnglish, safeEnglishList } from "@/lib/i18n/english-content";

/** Mobile-friendly concrete price level block. Never invents a price. */
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
  const invalidationText = en ? safeEnglish(invalidation) : invalidation;
  const confirmationText = en ? safeEnglish(confirmation) : confirmation;
  const hasAny = s.length > 0 || r.length > 0 || Boolean(invalidation) || Boolean(confirmation);
  if (!hasAny) {
    return <p className="text-caption text-foreground-secondary">{en ? "Key levels are awaiting technical confirmation." : "关键价位待技术确认"}</p>;
  }
  return (
    <div className="space-y-2">
      {s.map((line) => <div key={`s-${line}`} className="space-y-0.5"><p className="text-caption text-foreground-tertiary">{en ? "Key support" : "关键支撑"}</p><p className="break-words text-body-sm font-medium text-foreground">{line}</p></div>)}
      {r.map((line) => <div key={`r-${line}`} className="space-y-0.5"><p className="text-caption text-foreground-tertiary">{en ? "Key resistance" : "关键压力"}</p><p className="break-words text-body-sm font-medium text-foreground">{line}</p></div>)}
      {invalidation ? <div className="space-y-0.5"><p className="text-caption text-foreground-tertiary">{en ? "Invalidation condition" : "失效条件"}</p><p className="break-words text-caption text-foreground-secondary">{invalidationText}</p></div> : null}
      {confirmation ? <div className="space-y-0.5"><p className="text-caption text-foreground-tertiary">{en ? "Confirmation trigger" : "方向确认条件"}</p><p className="break-words text-caption text-foreground-secondary">{confirmationText}</p></div> : null}
      {!s.length || !r.length || !invalidation || !confirmation ? <p className="text-caption text-foreground-tertiary">{en ? "Any undisclosed level remains pending technical confirmation." : "未展示的价位字段仍待技术确认。"}</p> : null}
    </div>
  );
}
