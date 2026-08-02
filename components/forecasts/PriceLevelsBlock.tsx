/** Mobile-friendly concrete price level block */
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
  const s = support?.filter(Boolean) ?? [];
  const r = resistance?.filter(Boolean) ?? [];
  if (!s.length && !r.length && !invalidation) return null;
  return (
    <div className="space-y-2">
      {s.map((line) => (
        <div key={`s-${line}`} className="space-y-0.5">
          <p className="text-caption text-foreground-tertiary">关键支撑</p>
          <p className="break-words text-body-sm font-medium text-foreground">{line}</p>
        </div>
      ))}
      {r.map((line) => (
        <div key={`r-${line}`} className="space-y-0.5">
          <p className="text-caption text-foreground-tertiary">关键压力</p>
          <p className="break-words text-body-sm font-medium text-foreground">{line}</p>
        </div>
      ))}
      {invalidation ? (
        <div className="space-y-0.5">
          <p className="text-caption text-foreground-tertiary">失效条件</p>
          <p className="break-words text-caption text-foreground-secondary">{invalidation}</p>
        </div>
      ) : null}
      {confirmation ? (
        <div className="space-y-0.5">
          <p className="text-caption text-foreground-tertiary">方向确认条件</p>
          <p className="break-words text-caption text-foreground-secondary">{confirmation}</p>
        </div>
      ) : null}
    </div>
  );
}
