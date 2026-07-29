/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from "next/navigation";
import { IChingResearchFormClient } from "@/components/iching/IChingResearchFormClient";
import { getIChingResearchByIdForAdmin } from "@/lib/iching-research/store";

export const dynamic = "force-dynamic";

export default async function AdminIchingLibraryEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;
  const r = await getIChingResearchByIdForAdmin(id);
  if (!r) notFound();

  return (
    <div className="p-0">
      <IChingResearchFormClient
        mode="edit"
        initial={{
          ...(r as any),
          castAt: r.castAt,
          emptyBranches: r.emptyBranches,
          worldLine: r.worldLine,
          responseLine: r.responseLine,
          lineData: r.lineData,
          rawImageUrls: r.rawImageUrls,
          analysisSteps: r.analysisSteps,
          timeWindows: r.timeWindows,
        }}
      />
    </div>
  );
}

