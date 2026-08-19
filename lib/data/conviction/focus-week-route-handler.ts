type FocusRouteModules = {
  getChinaDateKey: typeof import("@/lib/date/china-date").getChinaDateKey;
  listStaticFocusEvidence: typeof import("@/lib/data/conviction/access").listStaticFocusEvidence;
  runFocusWeekPreparation: typeof import("@/lib/data/conviction/focus-week-preparation-core").runFocusWeekPreparation;
  focusDailyMarketCode: typeof import("@/lib/data/conviction/focus-daily-generation-core").focusDailyMarketCode;
  listLatestGeneratedDailiesForMarketDates: typeof import("@/lib/weekly-source/store").listLatestGeneratedDailiesForMarketDates;
  appendPublishedGeneratedDailyBatch: typeof import("@/lib/weekly-source/store").appendPublishedGeneratedDailyBatch;
  loadFocusDailyAuxiliaryEvidence: typeof import("@/lib/data/conviction/focus-daily-evidence.server").loadFocusDailyAuxiliaryEvidence;
};

export type FocusRouteModuleLoader = () => Promise<FocusRouteModules>;

async function loadFocusRouteModules(): Promise<FocusRouteModules> {
  const [dateModule, accessModule, preparationModule, generationModule, storeModule, evidenceModule] = await Promise.all([
    import("@/lib/date/china-date"), import("@/lib/data/conviction/access"),
    import("@/lib/data/conviction/focus-week-preparation-core"), import("@/lib/data/conviction/focus-daily-generation-core"),
    import("@/lib/weekly-source/store"), import("@/lib/data/conviction/focus-daily-evidence.server"),
  ]);
  return {
    getChinaDateKey: dateModule.getChinaDateKey,
    listStaticFocusEvidence: accessModule.listStaticFocusEvidence,
    runFocusWeekPreparation: preparationModule.runFocusWeekPreparation,
    focusDailyMarketCode: generationModule.focusDailyMarketCode,
    listLatestGeneratedDailiesForMarketDates: storeModule.listLatestGeneratedDailiesForMarketDates,
    appendPublishedGeneratedDailyBatch: storeModule.appendPublishedGeneratedDailyBatch,
    loadFocusDailyAuxiliaryEvidence: evidenceModule.loadFocusDailyAuxiliaryEvidence,
  };
}

export async function runFocusWeekRouteHandler(input: {
  authorized: boolean;
  moduleLoader?: FocusRouteModuleLoader;
  capturedNow?: Date;
}): Promise<Response> {
  if (!input.authorized) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const modules = await (input.moduleLoader ?? loadFocusRouteModules)();
    const capturedNow = input.capturedNow ?? new Date();
    const asOfDate = modules.getChinaDateKey(capturedNow);
    const result = await modules.runFocusWeekPreparation({
      authorized: true, asOfDate, nowMs: capturedNow.getTime(), readEvidence: modules.listStaticFocusEvidence,
      loadLatest: (asset, dates) => modules.listLatestGeneratedDailiesForMarketDates(modules.focusDailyMarketCode(asset.assetId), dates),
      loadAuxiliary: (asset) => modules.loadFocusDailyAuxiliaryEvidence({ assetId: asset.assetId, symbol: asset.symbol ?? asset.assetId, assetType: asset.assetType, exchange: asset.exchange, asOfDate, now: capturedNow }),
      persistBatch: modules.appendPublishedGeneratedDailyBatch, scheduleMode: "DAILY_ROLLING",
    });
    return Response.json(result, { status: result.kind === "PREPARED" && !result.ok ? 500 : 200 });
  } catch (error) {
    console.error("[prepare-focus-week] preparation failed", error);
    return Response.json({ ok: false, error: "PREPARATION_EVIDENCE_UNAVAILABLE" }, { status: 500 });
  }
}
