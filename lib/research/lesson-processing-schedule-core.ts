export type LessonProcessingProfile = {
  mode: "TWO_HOUR_COMPENSATION" | "DAILY_CATCH_UP";
  masterBackfillLimit: number;
  teacherBackfillLimit: number;
  masterPendingLimit: number;
  teacherPendingLimit: number;
};

/**
 * The cron fires every two hours at :20. The pre-existing 16:20 UTC run is kept
 * as the larger daily catch-up window (00:20 Hong Kong time).
 */
export function resolveLessonProcessingProfile(now: Date): LessonProcessingProfile {
  if (now.getUTCHours() === 16) {
    return {
      mode: "DAILY_CATCH_UP",
      masterBackfillLimit: 2,
      teacherBackfillLimit: 2,
      masterPendingLimit: 8,
      teacherPendingLimit: 5,
    };
  }
  return {
    mode: "TWO_HOUR_COMPENSATION",
    masterBackfillLimit: 1,
    teacherBackfillLimit: 1,
    masterPendingLimit: 2,
    teacherPendingLimit: 1,
  };
}
