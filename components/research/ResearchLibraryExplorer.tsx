"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  EmptyState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Text,
} from "@/components/ui";
import { SearchIcon } from "@/components/icons";
import { pickLocalized } from "@/lib/i18n/config";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import { filterResearchRecords, type ResearchFilters } from "@/lib/research/research-utils";
import type {
  ResearchDirection,
  ResearchFramework,
  ResearchMarket,
  ResearchRecord,
  ResearchSourceType,
  ResearchStatus,
} from "@/types/research";
import { ResearchRecordCard } from "./ResearchRecordCard";
import { ResearchRecordDetail } from "./ResearchRecordDetail";

const MARKETS: ResearchMarket[] = ["crypto", "us-equity", "china-equity", "hong-kong-equity", "commodity", "index", "semiconductor"];
const FRAMEWORKS: ResearchFramework[] = ["oracle-six-yao", "qimen", "cycle", "gann", "harmonic", "chan", "market-flow", "macro", "technical", "internal"];
const DIRECTIONS: ResearchDirection[] = [
  "strong-bullish",
  "bullish",
  "slightly-bullish",
  "neutral",
  "slightly-bearish",
  "bearish",
  "strong-bearish",
  "insufficient-evidence",
];
const SOURCE_TYPES: ResearchSourceType[] = ["private-teacher", "public-analyst", "internal-research"];
const STATUSES: ResearchStatus[] = ["pending", "active", "partially-verified", "verified", "invalidated", "archived"];

const ALL = "all";

export function ResearchLibraryExplorer({ records }: { records: ResearchRecord[] }) {
  const { locale } = useLocale();
  const t = useTranslations();

  const [query, setQuery] = useState("");
  const [assetId, setAssetId] = useState<string>(ALL);
  const [market, setMarket] = useState<string>(ALL);
  const [framework, setFramework] = useState<string>(ALL);
  const [direction, setDirection] = useState<string>(ALL);
  const [sourceType, setSourceType] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [selectedRecord, setSelectedRecord] = useState<ResearchRecord | null>(null);

  const assetOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const record of records) {
      if (!seen.has(record.assetId)) {
        seen.set(record.assetId, pickLocalized(record.assetName, locale));
      }
    }
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [records, locale]);

  const filters: ResearchFilters = {
    query,
    assetId: assetId === ALL ? undefined : assetId,
    market: market === ALL ? undefined : (market as ResearchMarket),
    framework: framework === ALL ? undefined : (framework as ResearchFramework),
    direction: direction === ALL ? undefined : (direction as ResearchDirection),
    sourceType: sourceType === ALL ? undefined : (sourceType as ResearchSourceType),
    status: status === ALL ? undefined : (status as ResearchStatus),
  };

  const filteredRecords = useMemo(
    () => filterResearchRecords(records, filters, locale),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [records, locale, query, assetId, market, framework, direction, sourceType, status]
  );

  const hasActiveFilters =
    query.trim().length > 0 || assetId !== ALL || market !== ALL || framework !== ALL || direction !== ALL || sourceType !== ALL || status !== ALL;

  function resetFilters() {
    setQuery("");
    setAssetId(ALL);
    setMarket(ALL);
    setFramework(ALL);
    setDirection(ALL);
    setSourceType(ALL);
    setStatus(ALL);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border/[0.08] bg-card p-lg">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("common.searchPlaceholder")}
          leadingIcon={<SearchIcon size={15} />}
          aria-label={t("common.search")}
        />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Select value={assetId} onValueChange={setAssetId}>
            <SelectTrigger aria-label={t("researchLibrary.filterAsset")}>
              <SelectValue placeholder={t("researchLibrary.filterAsset")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("common.all")}</SelectItem>
              {assetOptions.map(([id, label]) => (
                <SelectItem key={id} value={id}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={market} onValueChange={setMarket}>
            <SelectTrigger aria-label={t("researchLibrary.filterMarket")}>
              <SelectValue placeholder={t("researchLibrary.filterMarket")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("common.all")}</SelectItem>
              {MARKETS.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`market.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={framework} onValueChange={setFramework}>
            <SelectTrigger aria-label={t("researchLibrary.filterFramework")}>
              <SelectValue placeholder={t("researchLibrary.filterFramework")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("common.all")}</SelectItem>
              {FRAMEWORKS.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`framework.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={direction} onValueChange={setDirection}>
            <SelectTrigger aria-label={t("researchLibrary.filterDirection")}>
              <SelectValue placeholder={t("researchLibrary.filterDirection")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("common.all")}</SelectItem>
              {DIRECTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`directions.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sourceType} onValueChange={setSourceType}>
            <SelectTrigger aria-label={t("researchLibrary.filterSourceType")}>
              <SelectValue placeholder={t("researchLibrary.filterSourceType")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("common.all")}</SelectItem>
              {SOURCE_TYPES.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`sourceType.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label={t("researchLibrary.filterStatus")}>
              <SelectValue placeholder={t("researchLibrary.filterStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("common.all")}</SelectItem>
              {STATUSES.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`status.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Text variant="caption" color="tertiary">
            {t("researchLibrary.recordCount", { count: filteredRecords.length })}
          </Text>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              {t("common.clearFilters")}
            </Button>
          )}
        </div>
      </div>

      {filteredRecords.length === 0 ? (
        <EmptyState icon={<SearchIcon size={18} />} title={t("common.empty")} description={t("researchLibrary.noRecordsFound")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRecords.map((record) => (
            <ResearchRecordCard key={record.id} record={record} onViewDetails={setSelectedRecord} />
          ))}
        </div>
      )}

      <Dialog open={selectedRecord !== null} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="max-w-2xl">{selectedRecord && <ResearchRecordDetail record={selectedRecord} />}</DialogContent>
      </Dialog>
    </div>
  );
}
