import { LongTermOutlookClient } from "@/components/home/LongTermOutlookClient";
import { ResearchConflictPanel } from "@/components/research/ResearchConflictPanel";
import { getMemberUserContext } from "@/lib/access/member-preview";
import { getResearchConflictForAsset } from "@/lib/data/research-conflicts";
import { getResearchRecord } from "@/lib/data/research-records";
import { lt } from "@/lib/i18n/config";

const DISCLAIMER = lt(
  "传统象数研究属于非科学验证框架，仅作为研究记录与后续复盘样本，不构成投资建议。",
  "傳統象數研究屬於非科學驗證框架，僅作為研究記錄與後續復盤樣本，不構成投資建議。",
  "Traditional symbolic research is a non-scientific verification framework. It is retained as a research record and review sample only, and does not constitute investment advice."
);

export async function LongTermOutlookSection() {
  const [user, aShares, hstech, sseConflict] = await Promise.all([
    getMemberUserContext(),
    getResearchRecord("A-SH-2026-0727-ORACLE-001"),
    getResearchRecord("HSTECH-2026-0727-ORACLE-001"),
    Promise.resolve(getResearchConflictForAsset("shanghai-composite")),
  ]);
  if (!aShares || !hstech) return null;
  const unlocked = user.isAdmin || user.isMember || user.isPreviewGate;
  const publicSummary = lt(
    "公开页仅展示长期研究模块与关键验证窗口，不公开远期价位与框架细节。",
    "公開頁僅展示長期研究模組與關鍵驗證窗口，不公開遠期價位與框架細節。",
    "Public view shows only the long-term module and key validation windows, not far-horizon levels or framework detail."
  );

  return (
    <section id="china-equity-research" className="border-t border-border/[0.06] py-12 lg:py-16">
      <LongTermOutlookClient
        cards={[
          {
            id: aShares.id,
            titleKey: "home.chinaShanghaiComposite",
            rating: aShares.ratingDisplay ?? lt("看涨", "看漲", "Bullish"),
            score: aShares.researchScore ?? aShares.editorialConfidence,
            consistencyScore: aShares.trendConsistency?.score ?? 4,
            consistencyMax: aShares.trendConsistency?.max ?? 5,
            consistencyNote:
              aShares.trendConsistency?.note ??
              lt(
                "短期与中期方向一致，但节奏偏慢。",
                "短期與中期方向一致，但節奏偏慢。",
                "Short- and medium-term direction align, but the pace remains relatively slow."
              ),
            summary: unlocked ? aShares.summary : publicSummary,
            frameworkLabel: lt("六爻研判", "六爻研判", "Six-Yao Oracle"),
            researchAttribute:
              aShares.researchAttribute ?? lt("传统象数研究", "傳統象數研究", "Traditional symbolic research"),
            verificationLabel: lt("待验证", "待驗證", "Pending verification"),
            disclaimer: aShares.disclaimer ?? DISCLAIMER,
          },
          {
            id: hstech.id,
            titleKey: "home.chinaHangSengTech",
            rating: hstech.ratingDisplay ?? lt("强势看涨", "強勢看漲", "Strong bullish"),
            score: hstech.researchScore ?? hstech.editorialConfidence,
            consistencyScore: hstech.trendConsistency?.score ?? 5,
            consistencyMax: hstech.trendConsistency?.max ?? 5,
            consistencyNote:
              hstech.trendConsistency?.note ??
              lt(
                "短期与中期方向高度一致，当前属于较强共振信号。",
                "短期與中期方向高度一致，當前屬於較強共振信號。",
                "Short- and medium-term direction are highly aligned — a relatively strong resonance signal."
              ),
            summary: unlocked ? hstech.summary : publicSummary,
            frameworkLabel: lt("六爻研判", "六爻研判", "Six-Yao Oracle"),
            researchAttribute:
              hstech.researchAttribute ?? lt("传统象数研究", "傳統象數研究", "Traditional symbolic research"),
            verificationLabel: lt("待验证", "待驗證", "Pending verification"),
            disclaimer: hstech.disclaimer ?? DISCLAIMER,
          },
        ]}
      />
      {unlocked && sseConflict && (
        <div className="mx-auto mt-8 w-full max-w-container px-4 sm:px-6 lg:px-8">
          <ResearchConflictPanel conflict={sseConflict} />
        </div>
      )}
    </section>
  );
}
