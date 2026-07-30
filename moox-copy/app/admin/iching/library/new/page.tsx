import { IChingResearchFormClient } from "@/components/iching/IChingResearchFormClient";

export default function AdminIchingLibraryNewPage() {
  const id = `ICH-${Date.now()}`;
  return (
    <div className="p-0">
      <IChingResearchFormClient
        mode="create"
        initial={{
          id,
          assetId: "CUSTOM",
          forecastType: "CUSTOM",
          question: "",
          castAt: new Date(),
          forecastStartAt: "",
          forecastEndAt: "",
          timezone: "Asia/Shanghai",
          sourceType: "INTERNAL",
          priority: "NORMAL",
          researchStatus: "WAITING_MASTER",
          hexagramName: "",
          changedHexagramName: null,
          hexagramSpecialTypes: [],
          movingLines: [],
          monthStemBranch: null,
          dayStemBranch: null,
          emptyBranches: [],
          usefulGod: null,
          worldLine: {},
          responseLine: {},
          lineData: [],
          rawImageUrls: [],
          rawTranscript: null,
          masterOriginalAnalysis: null,
          masterStructuredSummary: null,
          internalAnalysis: null,
          analysisSteps: [],
          timeWindows: [],
          directionConclusion: null,
          pathConclusion: null,
          confidence: null,
          adoptedSource: "INTERNAL",
          adoptedResearchId: null,
          masterOverride: true,
          version: 1,
          createdBy: "admin",
        }}
      />
    </div>
  );
}

