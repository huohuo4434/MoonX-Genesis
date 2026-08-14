import React, { type ReactNode } from "react";

export function UnifiedDossierDisclosure({
  enabled,
  title,
  children,
}: {
  enabled: boolean;
  title: string;
  children: ReactNode;
}) {
  if (!enabled) return <>{children}</>;
  return (
    <details className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
      <summary className="cursor-pointer text-body-sm font-semibold text-white/75">{title}</summary>
      <div className="mt-5 space-y-8">{children}</div>
    </details>
  );
}
