import { ScoreBadge } from "@/components/data";
import { Badge, Text } from "@/components/ui";
import type { AnalystFramework } from "@/lib/data/research-intelligence";
import { formatDate } from "@/lib/utils";

export interface FrameworkDatabaseTableProps {
  frameworks: AnalystFramework[];
}

/** Tabular view of the internal analyst framework database. */
export function FrameworkDatabaseTable({ frameworks }: FrameworkDatabaseTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/[0.08]">
      <table className="w-full min-w-[820px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border/[0.08] bg-surface/60">
            <th scope="col" className="p-lg">
              <Text variant="label" color="tertiary" className="uppercase tracking-wide">
                Framework
              </Text>
            </th>
            <th scope="col" className="p-lg">
              <Text variant="label" color="tertiary" className="uppercase tracking-wide">
                Category
              </Text>
            </th>
            <th scope="col" className="p-lg">
              <Text variant="label" color="tertiary" className="uppercase tracking-wide">
                Reliability
              </Text>
            </th>
            <th scope="col" className="p-lg">
              <Text variant="label" color="tertiary" className="uppercase tracking-wide">
                Weight
              </Text>
            </th>
            <th scope="col" className="p-lg">
              <Text variant="label" color="tertiary" className="uppercase tracking-wide">
                Description
              </Text>
            </th>
            <th scope="col" className="p-lg">
              <Text variant="label" color="tertiary" className="uppercase tracking-wide">
                Updated
              </Text>
            </th>
          </tr>
        </thead>
        <tbody>
          {frameworks.map((framework) => (
            <tr key={framework.id} className="border-b border-border/[0.06] last:border-0 hover:bg-surface/40">
              <td className="p-lg align-top">
                <Text variant="body-sm" weight="semibold" className="text-foreground">
                  {framework.name}
                </Text>
              </td>
              <td className="p-lg align-top">
                <Badge variant="outline">{framework.category}</Badge>
              </td>
              <td className="p-lg align-top">
                <ScoreBadge value={framework.reliabilityScore} />
              </td>
              <td className="p-lg align-top">
                <Text variant="mono" className="text-foreground-secondary">
                  {framework.weight}%
                </Text>
              </td>
              <td className="p-lg align-top max-w-sm">
                <Text variant="body-sm" color="secondary">
                  {framework.description}
                </Text>
              </td>
              <td className="p-lg align-top">
                <Text variant="caption" color="tertiary" className="font-mono">
                  {formatDate(framework.updatedAt)}
                </Text>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
