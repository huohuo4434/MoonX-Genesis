import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MasterRuleFormClient } from "@/components/iching/MasterRuleFormClient";

export const dynamic = "force-dynamic";

export default async function AdminIchingRuleEditPage({
  params,
}: {
  params: Promise<{ ruleCode: string }>;
}) {
  if (!prisma) return notFound();
  const ruleCode = (await params).ruleCode;
  const r = await prisma.masterRule.findUnique({ where: { ruleCode } });
  if (!r) return notFound();
  return (
    <div className="p-0">
      <MasterRuleFormClient mode="edit" initial={r} />
    </div>
  );
}

