"use client";

import Link from "next/link";
import { Badge, Heading, Text } from "@/components/ui";
import { getCycleAlignmentForRecord } from "@/lib/data/cycle-alignments";
import { getLiuYaoFactorAnalysis, getLiuYaoFactorAnalysisByLinkId } from "@/lib/data/liu-yao-factors";
import { getResearchConflictForRecord } from "@/lib/data/research-conflicts";
import { getSourceProfile } from "@/lib/data/source-profiles";
import { pickLocalized } from "@/lib/i18n/config";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import { directionBadgeVariant, statusBadgeVariant } from "@/lib/research/research-utils";
import { formatDate } from "@/lib/utils";
import type { ResearchRecord } from "@/types/research";
import { ResearchConflictPanel } from "./ResearchConflictPanel";
import { CycleAlignmentPanel } from "./CycleAlignmentPanel";
import { LiuYaoFactorPanel } from "./LiuYaoFactorPanel";

function DetailList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <Text variant="label" color="tertiary" className="uppercase tracking-wide">
        {title}
      </Text>
      <ul className="flex flex-col gap-1.5">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2 text-body-sm text-foreground-secondary">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground-tertiary" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NumberList({ title, values }: { title: string; values?: number[] }) {
  if (!values || values.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <Text variant="label" color="tertiary" className="uppercase tracking-wide">
        {title}
      </Text>
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => (
          <Badge key={value} variant="outline" className="font-mono">
            {value.toLocaleString("en-US")}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function ResearchRecordDetail({ record }: { record: ResearchRecord }) {
  const { locale } = useLocale();
  const t = useTranslations();
  const levelsPending = record.levelsPendingLabel
    ? pickLocalized(record.levelsPendingLabel, locale)
    : t("researchLibrary.levelsPending");
  const hasNumericLevels =
    (record.supports?.length ?? 0) > 0 ||
    (record.resistances?.length ?? 0) > 0 ||
    (record.targets?.length ?? 0) > 0;
  const hexagram = record.hexagramDetail;
  const profile = record.sourceProfileId ? getSourceProfile(record.sourceProfileId) : undefined;
  const reliability = record.sourceReliability ?? profile?.sourceReliability;
  const reliabilityMethods = reliability?.methods ?? profile?.sourceReliability.methods;
  const verification = record.verificationResult;
  const conflict = getResearchConflictForRecord(record.id);
  const factorAnalysis =
    getLiuYaoFactorAnalysis(record.id) ??
    (record.liuYaoFactorAnalysisId ? getLiuYaoFactorAnalysisByLinkId(record.liuYaoFactorAnalysisId) : undefined);
  const cycleAlignment = getCycleAlignmentForRecord(record.id);
  const isPendingReview = record.humanReviewStatus === "pending-review";

  return (
    <div className="flex max-h-[75vh] flex-col gap-5 overflow-y-auto pr-1">
      <div className="flex flex-col gap-1.5 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={directionBadgeVariant(record.direction)}>{t(`directions.${record.direction}`)}</Badge>
          <Badge variant={statusBadgeVariant(record.status)}>{t(`status.${record.status}`)}</Badge>
          <Badge variant="outline">{t(`framework.${record.framework}`)}</Badge>
          {isPendingReview && (
            <Badge variant="warning">{record.ratingDisplay ? pickLocalized(record.ratingDisplay, locale) : "待人工审核"}</Badge>
          )}
        </div>
        <Heading as="h2" size="h3">
          {pickLocalized(record.title, locale)}
        </Heading>
        <Text variant="body-sm" color="secondary">
          {pickLocalized(record.assetName, locale)}
          {record.symbol ? ` · ${record.symbol}` : ""} · {pickLocalized(record.publicSourceLabel, locale)}
        </Text>
      </div>

      {conflict && <ResearchConflictPanel conflict={conflict} />}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-foreground-tertiary">
        <span>{t("researchLibrary.publishedOn", { date: formatDate(record.publishedAt) })}</span>
        {record.forecastStart && record.forecastEnd && (
          <span>
            {t("researchLibrary.forecastWindowLabel", {
              start: formatDate(record.forecastStart),
              end: formatDate(record.forecastEnd),
            })}
          </span>
        )}
        <span>{t(`market.${record.market}`)}</span>
        <span>{t(`sourceType.${record.sourceType}`)}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <Text variant="label" color="tertiary" className="uppercase tracking-wide">
          {t("researchLibrary.coreConclusion")}
        </Text>
        <Text variant="body-sm" color="secondary">
          {pickLocalized(record.summary, locale)}
        </Text>
        {record.moonxInterpretation && (
          <Text variant="caption" color="tertiary">
            {pickLocalized(record.moonxInterpretation, locale)}
          </Text>
        )}
      </div>

      {factorAnalysis && <LiuYaoFactorPanel analysis={factorAnalysis} />}

      {cycleAlignment && <CycleAlignmentPanel alignment={cycleAlignment} />}

      {record.scenarios && record.scenarios.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Text variant="label" color="tertiary" className="uppercase tracking-wide">
            {t("researchLibrary.scenarios")}
          </Text>
          <ul className="flex flex-col gap-1.5">
            {record.scenarios.map((scenario, index) => (
              <li key={index} className="rounded-md border border-border/[0.08] bg-muted/40 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <Text variant="caption" weight="medium" className="text-foreground">
                    {pickLocalized(scenario.name, locale)}
                  </Text>
                  <Badge variant="outline">{scenario.probability}%</Badge>
                </div>
                {scenario.description && (
                  <Text variant="caption" color="tertiary" className="mt-1 block">
                    {pickLocalized(scenario.description, locale)}
                  </Text>
                )}
                {(scenario.start || scenario.end) && (
                  <Text variant="caption" color="tertiary" className="mt-1 block font-mono">
                    {formatDate(scenario.start ?? "")}
                    {scenario.end ? ` – ${formatDate(scenario.end)}` : ""}
                  </Text>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {record.turningWindows && record.turningWindows.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Text variant="label" color="tertiary" className="uppercase tracking-wide">
            {t("researchLibrary.timePath")}
          </Text>
          <ul className="flex flex-col gap-1.5">
            {record.turningWindows.map((window_) => (
              <li key={window_.id} className="flex flex-col gap-0.5 rounded-md border border-border/[0.08] bg-muted/40 p-2.5">
                <Text variant="caption" weight="medium" className="text-foreground">
                  {pickLocalized(window_.label, locale)}
                </Text>
                <Text variant="caption" color="tertiary" className="font-mono">
                  {window_.date
                    ? formatDate(window_.date)
                    : `${formatDate(window_.start ?? "")} – ${formatDate(window_.end ?? "")}`}
                </Text>
                {window_.note && (
                  <Text variant="caption" color="tertiary">
                    {pickLocalized(window_.note, locale)}
                  </Text>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {record.riskAssessment && (
        <div className="flex flex-col gap-1.5 rounded-md border border-border/[0.08] bg-muted/30 p-3">
          <Text variant="label" color="tertiary" className="uppercase tracking-wide">
            {t("researchLibrary.riskAssessment")}
          </Text>
          {record.researchKind === "risk" && (
            <Text variant="caption" color="tertiary">
              {t("researchLibrary.riskNotPrice")}
            </Text>
          )}
          {record.riskAssessment.systemicRisk && (
            <Text variant="body-sm" color="secondary">
              {t("researchLibrary.systemicRisk")}: {pickLocalized(record.riskAssessment.systemicRisk, locale)}
            </Text>
          )}
          {record.riskAssessment.nonSystemicEventRisk && (
            <Text variant="body-sm" color="secondary">
              {t("researchLibrary.nonSystemicRisk")}: {pickLocalized(record.riskAssessment.nonSystemicEventRisk, locale)}
            </Text>
          )}
          {record.riskAssessment.primaryRisks && (
            <DetailList
              title={t("researchLibrary.primaryRisks")}
              items={record.riskAssessment.primaryRisks.map((item) => pickLocalized(item, locale))}
            />
          )}
        </div>
      )}

      {record.forwardDirection && (
        <div className="flex flex-col gap-1.5">
          <Text variant="label" color="tertiary" className="uppercase tracking-wide">
            {t("researchLibrary.forwardDirection")}
          </Text>
          <Text variant="body-sm" color="secondary">
            {pickLocalized(record.forwardDirection, locale)}
          </Text>
        </div>
      )}

      {record.expectedPath && record.expectedPath.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Text variant="label" color="tertiary" className="uppercase tracking-wide">
            预期运行路径
          </Text>
          <ul className="flex flex-col gap-1.5">
            {record.expectedPath.map((segment) => (
              <li key={`${segment.start}-${segment.end}`} className="rounded-md border border-border/[0.08] bg-muted/40 p-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Text variant="caption" weight="medium" className="text-foreground">
                    {pickLocalized(segment.title, locale)}
                  </Text>
                  <Badge variant="outline">{pickLocalized(segment.direction, locale)}</Badge>
                </div>
                <Text variant="caption" color="tertiary" className="mt-1 block font-mono">
                  {formatDate(segment.start)} – {formatDate(segment.end)}
                </Text>
                {segment.description && (
                  <Text variant="caption" color="secondary" className="mt-1 block">
                    {pickLocalized(segment.description, locale)}
                  </Text>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {record.priceScenarios && record.priceScenarios.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Text variant="label" color="tertiary" className="uppercase tracking-wide">
            价格情景（编辑权重，非统计概率）
          </Text>
          <ul className="flex flex-col gap-1.5">
            {record.priceScenarios.map((scenario, index) => (
              <li key={index} className="rounded-md border border-border/[0.08] bg-muted/40 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <Text variant="caption" weight="medium" className="text-foreground">
                    {pickLocalized(scenario.name, locale)}
                  </Text>
                  <Badge variant="outline">{scenario.probability}%</Badge>
                </div>
                {scenario.range && (
                  <Text variant="caption" color="tertiary" className="mt-1 block">
                    区间：{pickLocalized(scenario.range, locale)}
                  </Text>
                )}
                {scenario.description && (
                  <Text variant="caption" color="secondary" className="mt-1 block">
                    {pickLocalized(scenario.description, locale)}
                  </Text>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {record.annualPath && record.annualPath.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Text variant="label" color="tertiary" className="uppercase tracking-wide">
            {t("researchLibrary.annualPath")}
          </Text>
          <ul className="flex flex-col gap-1.5">
            {record.annualPath.map((segment) => (
              <li key={`${segment.start}-${segment.end}`} className="rounded-md border border-border/[0.08] bg-muted/40 p-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Text variant="caption" weight="medium" className="text-foreground">
                    {pickLocalized(segment.title, locale)}
                  </Text>
                  <Badge variant="outline">{pickLocalized(segment.direction, locale)}</Badge>
                </div>
                <Text variant="caption" color="tertiary" className="mt-1 block font-mono">
                  {formatDate(segment.start)} – {formatDate(segment.end)}
                </Text>
                {segment.description && (
                  <Text variant="caption" color="secondary" className="mt-1 block">
                    {pickLocalized(segment.description, locale)}
                  </Text>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {record.monthlyActivation && record.monthlyActivation.length > 0 && (
        <div className="flex flex-col gap-2">
          <Text variant="label" color="tertiary" className="uppercase tracking-wide">
            {t("researchLibrary.monthlyActivation")}
          </Text>
          <div className="rounded-md border border-border/[0.08] bg-muted/30 p-3">
            <Text variant="caption" weight="medium" className="mb-1.5 block text-foreground">
              {t("researchLibrary.signalDirectness")}
            </Text>
            <ul className="mb-2 flex flex-col gap-1 text-caption text-foreground-tertiary">
              <li>{t("researchLibrary.signalDirect")}</li>
              <li>{t("researchLibrary.signalSemiDirect")}</li>
              <li>{t("researchLibrary.signalIndirect")}</li>
            </ul>
            <Text variant="caption" color="tertiary" className="mb-3 block">
              {t("researchLibrary.signalWeightNote")}
            </Text>
            <ul className="flex flex-col gap-2">
              {record.monthlyActivation.map((item) => (
                <li key={`${item.period}-${item.earthlyBranch}`} className="rounded-md border border-border/[0.08] bg-card/60 p-2.5">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <Text variant="caption" weight="medium" className="text-foreground">
                      {item.period}
                    </Text>
                    <Badge variant="outline">{item.signalDirectness}</Badge>
                    <Badge variant="outline">
                      {t("researchLibrary.reliabilityLabel")} · {item.reliability}
                    </Badge>
                  </div>
                  <Text variant="caption" color="tertiary" className="block">
                    {t("researchLibrary.earthlyBranch")}: {item.earthlyBranch}
                  </Text>
                  <Text variant="caption" color="secondary" className="mt-1 block">
                    {t("researchLibrary.mechanism")}: {item.mechanism}
                  </Text>
                  <Text variant="caption" color="secondary" className="mt-1 block">
                    {t("researchLibrary.expectedEffect")}: {item.expectedEffect}
                  </Text>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {record.technicalConfirmation && record.technicalConfirmation.length > 0 && (
        <DetailList
          title="技术确认条件"
          items={record.technicalConfirmation.map((item) => pickLocalized(item, locale))}
        />
      )}

      {record.notes && record.notes.length > 0 && (
        <DetailList title="备注" items={record.notes.map((item) => pickLocalized(item, locale))} />
      )}

      {(hexagram || record.hexagramPrimary || record.thesis.length > 0) && (
        <details className="rounded-md border border-border/[0.08] bg-muted/30 p-3">
          <summary className="cursor-pointer text-caption text-foreground-secondary">
            {t("researchLibrary.hexagramCollapsedHint")}
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            <Text variant="label" color="tertiary" className="uppercase tracking-wide">
              {t("researchLibrary.hexagramEvidence")}
            </Text>
            {(hexagram?.primary || record.hexagramPrimary) && (
              <Text variant="body-sm" color="secondary">
                {pickLocalized(hexagram?.primary ?? record.hexagramPrimary!, locale)}
                {(hexagram?.transformed || record.hexagramChanged) &&
                  ` → ${pickLocalized(hexagram?.transformed ?? record.hexagramChanged!, locale)}`}
              </Text>
            )}
            {hexagram?.mutual && (
              <Text variant="caption" color="tertiary">
                {pickLocalized(hexagram.mutual, locale)}
              </Text>
            )}
            {hexagram?.worldLine && (
              <Text variant="caption" color="tertiary">
                {pickLocalized(hexagram.worldLine, locale)}
              </Text>
            )}
            {hexagram?.responseLine && (
              <Text variant="caption" color="tertiary">
                {pickLocalized(hexagram.responseLine, locale)}
              </Text>
            )}
            {hexagram?.movingLines && hexagram.movingLines.length > 0 && (
              <div className="flex flex-col gap-2">
                <Text variant="caption" weight="medium" color="secondary">
                  动爻与变爻
                </Text>
                {hexagram.movingLines.map((line, index) => (
                  <div key={index} className="rounded-md border border-border/[0.08] bg-background/50 p-2.5">
                    <Text variant="caption" color="secondary">
                      {pickLocalized(line.from, locale)} → {pickLocalized(line.to, locale)}
                      {line.sixSpirit ? ` · 临${pickLocalized(line.sixSpirit, locale)}` : ""}
                    </Text>
                    <Text variant="caption" color="tertiary" className="mt-1 block">
                      {pickLocalized(line.interpretation, locale)}
                    </Text>
                    {line.verificationStatus === "pending-human-review" && (
                      <Badge variant="warning" className="mt-1">
                        动爻待人工核对
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
            {typeof hexagram?.movingLine === "number" && (
              <Text variant="caption" color="tertiary">
                {hexagram.movingLine}
              </Text>
            )}
            {record.movingLinesNote && (
              <Text variant="caption" color="tertiary">
                {pickLocalized(record.movingLinesNote, locale)}
              </Text>
            )}
            {hexagram?.structureNotes && (
              <DetailList
                title={t("researchLibrary.thesis")}
                items={hexagram.structureNotes.map((item) => pickLocalized(item, locale))}
              />
            )}
            {!hexagram?.structureNotes && (
              <DetailList title={t("researchLibrary.thesis")} items={record.thesis.map((item) => pickLocalized(item, locale))} />
            )}
            {record.attachments && record.attachments.length > 0 && (
              <div className="flex flex-col gap-2">
                <Text variant="caption" weight="medium" color="secondary">
                  起卦附件（脱敏）
                </Text>
                {record.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex flex-col gap-2 rounded-md border border-border/[0.08] bg-background/50 p-2.5">
                    <Text variant="caption" color="tertiary">
                      起卦时间：{formatDate(attachment.divinationAt.slice(0, 10))}{" "}
                      {attachment.divinationAt.includes("T") ? attachment.divinationAt.slice(11, 16) : ""}
                    </Text>
                    <Text variant="caption" color="secondary">
                      求测问题：{pickLocalized(attachment.question, locale)}
                    </Text>
                    {attachment.redactedImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={attachment.redactedImageUrl}
                        alt="脱敏卦盘"
                        className="max-h-64 w-full rounded-md border border-border/[0.08] object-contain"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
      )}

      <div className="flex flex-col gap-1.5">
        <Text variant="label" color="tertiary" className="uppercase tracking-wide">
          {t("researchLibrary.technicalLevels")}
        </Text>
        {hasNumericLevels ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <NumberList title={t("researchLibrary.supports")} values={record.supports} />
            <NumberList title={t("researchLibrary.resistances")} values={record.resistances} />
            <NumberList title={t("researchLibrary.targets")} values={record.targets} />
          </div>
        ) : (
          <Text variant="body-sm" color="secondary">
            {levelsPending}
          </Text>
        )}
      </div>

      {record.invalidation && (
        <div className="flex flex-col gap-1.5">
          <Text variant="label" color="tertiary" className="uppercase tracking-wide">
            {t("researchLibrary.invalidation")}
          </Text>
          <Text variant="body-sm" color="secondary">
            {pickLocalized(record.invalidation, locale)}
          </Text>
        </div>
      )}

      {reliability && (
        <div className="flex flex-col gap-1.5 rounded-md border border-border/[0.08] bg-muted/30 p-3">
          <Text variant="label" color="tertiary" className="uppercase tracking-wide">
            {t("researchLibrary.sourceReliability")}
          </Text>
          <Text variant="caption" color="tertiary">
            {t("researchLibrary.sourceReliabilityDisclaimer")}
          </Text>
          {reliability.overall && (
            <Text variant="body-sm" color="secondary">
              {pickLocalized(reliability.overall, locale)}
            </Text>
          )}
          {reliability.strengths && reliability.strengths.length > 0 && (
            <DetailList
              title={t("researchLibrary.sourceStrengths")}
              items={reliability.strengths.map((item) => pickLocalized(item, locale))}
            />
          )}
          {reliability.weaknesses && reliability.weaknesses.length > 0 && (
            <DetailList
              title={t("researchLibrary.sourceWeaknesses")}
              items={reliability.weaknesses.map((item) => pickLocalized(item, locale))}
            />
          )}
          {reliability.note && (
            <Text variant="caption" color="tertiary">
              {pickLocalized(reliability.note, locale)}
            </Text>
          )}
          {reliabilityMethods && reliabilityMethods.length > 0 && (
            <DetailList
              title={t("researchLibrary.mentorMethods")}
              items={reliabilityMethods.map((item) => pickLocalized(item, locale))}
            />
          )}
        </div>
      )}

      {record.verificationStages && record.verificationStages.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Text variant="label" color="tertiary" className="uppercase tracking-wide">
            {t("researchLibrary.verificationStages")}
          </Text>
          <Text variant="caption" color="tertiary">
            {t("researchLibrary.noFullYearHitEarly")}
          </Text>
          <ul className="flex flex-col gap-1.5">
            {record.verificationStages.map((stage, index) => (
              <li key={`${pickLocalized(stage.title, locale)}-${index}`} className="rounded-md border border-border/[0.08] bg-muted/40 p-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Text variant="caption" weight="medium" className="text-foreground">
                    {pickLocalized(stage.title, locale)}
                  </Text>
                  <Badge variant="outline">{stage.status}</Badge>
                </div>
                {(stage.verificationStart || stage.verificationEnd) && (
                  <Text variant="caption" color="tertiary" className="mt-1 block font-mono">
                    {stage.verificationStart ? formatDate(stage.verificationStart) : "…"}
                    {" – "}
                    {stage.verificationEnd ? formatDate(stage.verificationEnd) : "…"}
                  </Text>
                )}
                {stage.note && (
                  <Text variant="caption" color="tertiary" className="mt-1 block">
                    {pickLocalized(stage.note, locale)}
                  </Text>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {verification && (
        <div className="flex flex-col gap-1.5 rounded-md border border-border/[0.08] bg-muted/30 p-3">
          <Text variant="label" color="tertiary" className="uppercase tracking-wide">
            {t("researchLibrary.verificationResult")}
          </Text>
          {typeof verification.actualChangePct === "number" && (
            <Text variant="body-sm" color="secondary">
              {t("researchLibrary.actualChange")}: {verification.actualChangePct > 0 ? "+" : ""}
              {verification.actualChangePct}%
            </Text>
          )}
          {verification.actualDirection && (
            <Text variant="caption" color="tertiary">
              {pickLocalized(verification.actualDirection, locale)}
              {verification.actualClose != null ? ` · ${verification.actualClose}` : ""}
            </Text>
          )}
          {verification.conclusion && (
            <Text variant="body-sm" color="secondary">
              {t("researchLibrary.verificationConclusion")}: {pickLocalized(verification.conclusion, locale)}
            </Text>
          )}
          {verification.scoreEligible === false && (
            <Badge variant="outline">{t("researchLibrary.scoreNotEligible")}</Badge>
          )}
          {verification.scoreNote && (
            <Text variant="caption" color="tertiary">
              {pickLocalized(verification.scoreNote, locale)}
            </Text>
          )}
          {verification.dailyResults && verification.dailyResults.length > 0 && (
            <ul className="mt-1 flex flex-col gap-1">
              {verification.dailyResults.map((day) => (
                <li key={day.date} className="font-mono text-caption text-foreground-tertiary">
                  {formatDate(day.date)} · {day.changePct > 0 ? "+" : ""}
                  {day.changePct}% · {day.close}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {record.catalysts && (
        <DetailList title={t("researchLibrary.catalysts")} items={record.catalysts.map((item) => pickLocalized(item, locale))} />
      )}
      {record.risks && <DetailList title={t("researchLibrary.risks")} items={record.risks.map((item) => pickLocalized(item, locale))} />}

      {record.notes && record.notes.length > 0 && (
        <DetailList title="研究备注" items={record.notes.map((item) => pickLocalized(item, locale))} />
      )}

      {record.relatedRecordIds && record.relatedRecordIds.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Text variant="label" color="tertiary" className="uppercase tracking-wide">
            关联研究
          </Text>
          <ul className="flex flex-col gap-1">
            {record.relatedRecordIds.map((id) => (
              <li key={id}>
                <Link href={`/research/library#${id}`} className="text-body-sm text-primary hover:underline">
                  {id}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {record.verificationChecklist && record.verificationChecklist.length > 0 && (
        <DetailList
          title={t("researchLibrary.verificationChecklist")}
          items={record.verificationChecklist.map((item) => pickLocalized(item, locale))}
        />
      )}
    </div>
  );
}
