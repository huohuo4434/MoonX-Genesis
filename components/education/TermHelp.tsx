import type { ReactNode } from "react";

export function TermHelp({
  label,
  explanation,
  children,
}: {
  label?: string;
  explanation: string;
  children?: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      {children ?? label}
      <span
        role="img"
        aria-label={explanation}
        title={explanation}
        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-border/[0.18] text-[10px] font-semibold leading-none text-foreground-tertiary"
      >
        ?
      </span>
    </span>
  );
}
