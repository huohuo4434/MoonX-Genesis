function includesAny(value: string, keywords: string[]): boolean {
  return keywords.some((keyword) => value.includes(keyword));
}

function buildSummary(direction: string, path: string, en: boolean): string {
  const combined = `${direction} ${path}`.trim();

  if (includesAny(combined, ["先涨后跌", "冲高回落", "up then down", "surge then pullback"])) {
    return en
      ? "A rebound or early push may come first, but chasing strength is not preferred. Watch for a later pullback and wait for confirmation."
      : "可能先反弹或冲高，但不建议在高位追涨；重点防范后半段回落，并等待确认后再行动。";
  }

  if (includesAny(combined, ["先跌后涨", "探底回升", "down then up", "dip then recovery"])) {
    return en
      ? "Price may weaken first. The key is whether it stabilizes and recovers the confirmation level, so avoid chasing the first drop."
      : "可能先回踩，关键看低位能否止跌并重新站回确认位；不要在下跌初段急着追空。";
  }

  if (includesAny(combined, ["震荡上涨", "上涨", "偏多", "higher", "bullish", "long"])) {
    return en
      ? "The larger bias is constructive, but a bullish view is not an instruction to buy immediately. Wait for the stated confirmation."
      : "整体偏多，但看涨不等于马上买入；先等确认条件满足，未确认前不追涨。";
  }

  if (includesAny(combined, ["震荡下跌", "下跌", "偏空", "lower", "bearish", "short"])) {
    return en
      ? "The larger bias is weak, but a bearish view is not an instruction to short immediately. Wait for breakdown or failed-rebound confirmation."
      : "整体偏弱，但看跌不等于马上做空；先等跌破或反抽失败确认，未确认前不盲目追空。";
  }

  return en
    ? "The market is better treated as range-bound or uncertain. Wait for a confirmed break instead of forcing a trade in the middle of the range."
    : "当前更适合按震荡或方向未明处理；等待区间突破确认，不在中间位置强行交易。";
}

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
  const summary = buildSummary(direction, path ?? "", en);

  return (
    <div className="rounded-lg border border-primary/15 bg-primary/[0.025] p-3">
      <p className="text-caption font-semibold text-primary">
        {en ? "In plain language" : "一句话理解"}
      </p>
      <p className="mt-1 text-body-sm text-foreground-secondary">{summary}</p>
      {(confirmation || invalidation) ? (
        <details className="mt-2 text-caption text-foreground-tertiary">
          <summary className="min-h-8 cursor-pointer py-1 text-foreground-secondary">
            {en ? "Show professional conditions" : "展开专业依据"}
          </summary>
          <div className="mt-1 space-y-1 border-t border-border/[0.08] pt-2">
            {confirmation ? (
              <p>
                <span className="font-medium text-foreground-secondary">
                  {en ? "Confirmation: " : "确认条件："}
                </span>
                {confirmation}
              </p>
            ) : null}
            {invalidation ? (
              <p>
                <span className="font-medium text-foreground-secondary">
                  {en ? "Invalidation: " : "失效条件："}
                </span>
                {invalidation}
              </p>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}
