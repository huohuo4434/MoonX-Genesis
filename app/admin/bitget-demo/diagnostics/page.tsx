import { requireAdminOrNotFound } from "@/lib/auth/require-admin-or-404";
import { runExecutionReadinessDiagnostics } from "@/lib/bitget/execution-readiness-diagnostics";
import { Card, Heading, Section, Text } from "@/components/ui";
import { formatDateTimeChina } from "@/lib/utils/datetime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BitgetExecutionDiagnosticsPage() {
  await requireAdminOrNotFound();
  const report = await runExecutionReadinessDiagnostics();
  return (
    <main>
      <Section spacing="lg">
        <div className="max-w-5xl">
          <Text variant="caption" color="tertiary" className="font-mono uppercase tracking-[.18em]">BITGET EXECUTION DRY RUN · READ ONLY</Text>
          <Heading as="h1" size="h2" className="mt-2">自动交易完整链路自检</Heading>
          <Text variant="body" color="secondary" className="mt-3 block">只读检查，不下单、不改杠杆、不恢复AUTO_ORDER。状态：<strong className={report.overall === "PASS" ? "text-emerald-300" : "text-amber-300"}>{report.overall}</strong></Text>
          <Text variant="caption" color="tertiary" className="mt-2 block">{formatDateTimeChina(report.generatedAt)} · {report.mode}</Text>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {report.checks.map((check) => (
            <Card key={check.key} padding="md" className={check.ok ? "border border-emerald-400/15" : "border border-amber-400/20"}>
              <div className="flex items-center justify-between gap-3"><Text variant="body-sm" weight="semibold">{check.label}</Text><span className={check.ok ? "text-emerald-300" : "text-amber-300"}>{check.ok ? "PASS" : "BLOCKED"}</span></div>
              <Text variant="caption" color="tertiary" className="mt-2 block leading-relaxed">{check.detail}</Text>
            </Card>
          ))}
        </div>
        <Card padding="md">
          <Heading as="h2" size="h3">将要使用的杠杆请求预览（不会发送）</Heading>
          {report.plannedLeverageRequests.map((row) => <pre key={row.side} className="mt-3 overflow-auto rounded-md bg-black/30 p-3 text-xs text-white/70">{row.side}: {JSON.stringify(row.body, null, 2)}\n{row.reason}</pre>)}
        </Card>
        <Card padding="md" className="border border-cyan-300/15 bg-cyan-300/[.035]">
          {report.notes.map((note) => <Text key={note} variant="body-sm" color="secondary" className="mt-1 block leading-relaxed">• {note}</Text>)}
        </Card>
      </Section>
    </main>
  );
}
