import type { ReactNode } from "react";
import { AnalystHorizonGuide } from "@/components/admin/x-opinions/AnalystHorizonGuide";

// MOOX_RESEARCH_PROTOCOL_V72092

export default function XOpinionMatrixResearchProtocolLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AnalystHorizonGuide />
      {children}
    </>
  );
}
