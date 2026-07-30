import "server-only";

import { existsSync, readFileSync } from "fs";
import path from "path";
import { getMemberUserContext } from "@/lib/access/member-preview";
import {
  DailyMarketForecastEditionDocumentSchema,
  type DailyMarketForecastEditionInput,
} from "@/lib/schemas/daily-market-forecast-edition";
import {
  formatShanghaiReleaseLabel,
  getCoreDailyAccessMode,
  getShanghaiNowParts,
  resolveCoreDailyAvailabilityForDate,
} from "@/lib/calendar/shanghai-time";
import { shapeDailyMarketEditionTeaser } from "@/lib/forecasts/daily-market-edition-shape";
import type {
  DailyMarketForecastEdition,
  DailyMarketForecastEditionPayload,
  DailyMarketForecastEditionTeaser,
} from "@/types/daily-market-edition";

const CONTENT_DIR = path.join(process.cwd(), "content", "moonx", "daily-editions");
const INDEX_PATH = path.join(CONTENT_DIR, "index.json");

function readEditionDocument(): DailyMarketForecastEdition[] {
  if (!existsSync(INDEX_PATH)) return [];
  const raw = JSON.parse(readFileSync(INDEX_PATH, "utf8")) as unknown;
  const parsed = DailyMarketForecastEditionDocumentSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
    throw new Error(`[daily-editions] Invalid content/moonx/daily-editions/index.json\n${issues.join("\n")}`);
  }
  return parsed.data as DailyMarketForecastEditionInput[] as DailyMarketForecastEdition[];
}

function compareByDateDesc(a: DailyMarketForecastEdition, b: DailyMarketForecastEdition) {
  return (
    b.forecastDate.localeCompare(a.forecastDate) ||
    b.version - a.version ||
    b.publishedAt.localeCompare(a.publishedAt)
  );
}

export function listDailyMarketForecastEditions(): DailyMarketForecastEdition[] {
  return readEditionDocument().sort(compareByDateDesc);
}

export function getCurrentDailyMarketForecastEdition(now = new Date()): DailyMarketForecastEdition | null {
  const editions = listDailyMarketForecastEditions();
  if (!editions.length) return null;
  const today = getShanghaiNowParts(now).dateKey;
  return editions.find((edition) => edition.forecastDate >= today) ?? editions[0] ?? null;
}

function redactEditionForLockedState(edition: DailyMarketForecastEdition): DailyMarketForecastEditionTeaser {
  return shapeDailyMarketEditionTeaser(edition);
}

export async function getDailyMarketForecastEditionPayload(
  now = new Date()
): Promise<DailyMarketForecastEditionPayload> {
  const edition = getCurrentDailyMarketForecastEdition(now);
  const user = await getMemberUserContext();

  if (!edition) {
    const today = getShanghaiNowParts(now).dateKey;
    const fallback = resolveCoreDailyAvailabilityForDate(today);
    return {
      state: "empty",
      mode: user.isAdmin ? "admin" : user.isMember ? "member_early" : "public_locked",
      nextMemberAvailabilityLabel: formatShanghaiReleaseLabel(fallback.memberAvailableAt),
      nextPublicAvailabilityLabel: formatShanghaiReleaseLabel(fallback.publicAvailableAt),
      edition: null,
      teaser: null,
    };
  }

  const mode = getCoreDailyAccessMode({
    forecastDate: edition.forecastDate,
    isMember: user.isMember,
    isAdmin: user.isAdmin,
    now,
  });

  return {
    state: "ready",
    mode,
    nextMemberAvailabilityLabel: formatShanghaiReleaseLabel(edition.memberAvailableAt),
    nextPublicAvailabilityLabel: formatShanghaiReleaseLabel(edition.publicAvailableAt),
    edition: mode === "public_locked" ? null : edition,
    teaser: redactEditionForLockedState(edition),
  };
}
