"use client";

import { Badge, Card, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export interface MoonXDataStatusPanelProps {
  version: string;
  lastUpdated: string;
  assetCount: number;
  historySnapshotCount: number;
  validationStatus: "valid" | "invalid";
  /** Only shown in development — never include absolute paths in production builds. */
  sourceFile?: string;
}

/** Development-only content status panel for the Intelligence Snapshot page. */
export function MoonXDataStatusPanel({
  version,
  lastUpdated,
  assetCount,
  historySnapshotCount,
  validationStatus,
  sourceFile,
}: MoonXDataStatusPanelProps) {
  const { locale } = useLocale();

  return (
    <Card padding="md" className="border-dashed border-warning/30 bg-warning/5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge variant="warning">DEV</Badge>
        <Text variant="label" color="secondary" className="uppercase tracking-wide">
          MoonX Data Status
        </Text>
        <Badge variant={validationStatus === "valid" ? "success" : "danger"}>{validationStatus}</Badge>
      </div>
      <dl className="grid gap-1.5 text-caption text-foreground-secondary sm:grid-cols-2">
        <div>
          <dt className="text-foreground-tertiary">Data version</dt>
          <dd className="font-mono text-foreground">{version}</dd>
        </div>
        <div>
          <dt className="text-foreground-tertiary">Last updated</dt>
          <dd className="font-mono text-foreground">{lastUpdated}</dd>
        </div>
        <div>
          <dt className="text-foreground-tertiary">Assets</dt>
          <dd className="font-mono text-foreground">{assetCount}</dd>
        </div>
        <div>
          <dt className="text-foreground-tertiary">History snapshots</dt>
          <dd className="font-mono text-foreground">{historySnapshotCount}</dd>
        </div>
        <div>
          <dt className="text-foreground-tertiary">Current language</dt>
          <dd className="font-mono text-foreground">{locale}</dd>
        </div>
        {sourceFile && (
          <div>
            <dt className="text-foreground-tertiary">Content source</dt>
            <dd className="font-mono text-foreground">{sourceFile}</dd>
          </div>
        )}
      </dl>
    </Card>
  );
}
