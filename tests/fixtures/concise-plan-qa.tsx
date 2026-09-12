import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { LocaleProvider } from "../../lib/i18n/LocaleProvider";
import { ConciseTradePlans } from "../../components/member/ConciseTradePlans";
import { LinkedResearchDetails } from "../../components/member/LinkedResearchDetails";
import type { AiTradingDeskSnapshot } from "../../types/ai-trading-desk";
const now = Date.now();
const from = new Date(now - 60_000).toISOString();
const until = new Date(now + 3600_000).toISOString();
const plan = { id:"fixture",planGroupId:"fixture",version:3,symbol:"TEST_ONLY",strategyType:"SWING",executionMode:"BITGET_DEMO",status:"WATCHING",tier:"FORMAL",direction:"LONG",contentHash:"fixture-only",forecastId:"fixture",forecastVersion:"v1",forecastHorizon:"WEEK",publishedAt:from,updatedAt:from,forecastPublishedAt:from,forecastLockedAt:from,validFrom:from,expiresAt:until,forecastValidFrom:from,forecastValidUntil:until,triggerRule:"Wait for a closed candle above 102",invalidationRule:"Below 98 invalidates this fictional plan",thesisSummary:"Synthetic QA fixture. Not a market prediction.",entryZoneLow:100,entryZoneHigh:102,protectiveStop:98,target1:106,target2:110,target3:115 };
function QA() {
  const [stale,setStale]=useState(false);
  const en = new URLSearchParams(location.search).has("en");
  const snapshot = {lastSyncedAt:new Date(Date.now()).toISOString(),syncStatus:"OK",settings:{enabled:true},ledgerSource:"BITGET_DEMO",publishedPlans:[plan]} as AiTradingDeskSnapshot;
  return <LocaleProvider initialLocale={en?"en":"zh-CN"} messages={{}}><main style={{maxWidth:1000,margin:"auto",padding:20}}><h1>QA ONLY — FICTIONAL PRICES</h1><button onClick={()=>setStale(!stale)}>Toggle stale</button><ConciseTradePlans initial={new URLSearchParams(location.search).has("fetch") ? undefined : snapshot} blocked={stale}/><LinkedResearchDetails title="Archived context"><p id="old-link">Old shared link remains reachable.</p></LinkedResearchDetails></main></LocaleProvider>;
}
createRoot(document.getElementById("root")!).render(<QA/>);
