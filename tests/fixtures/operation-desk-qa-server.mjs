import { build } from "esbuild";
import { createServer } from "node:http";
import { readFileSync, readdirSync } from "node:fs";
await build({ entryPoints: ["tests/fixtures/operation-desk-qa.tsx"], outfile: "work/operation-desk-qa.js", bundle: true, platform: "browser", jsx: "automatic", define: { "process.env.NODE_ENV": "'development'", "process.env": "{}" } });
const css = readdirSync(".next/static/css").filter(x => x.endsWith(".css")).map(x => readFileSync(`.next/static/css/${x}`, "utf8")).join("\n");
createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:8770");
  const now = Date.now(), from = new Date(now - 60_000).toISOString(), until = new Date(now + 3600_000).toISOString();
  const plan = { id:"fixture", planGroupId:"fixture", version:3, symbol:"BTCUSDT", strategyType:"SWING", executionMode:"BITGET_DEMO", status:"WATCHING", tier:"FORMAL", direction:"LONG", contentHash:"fixture-only", forecastId:"fixture", forecastVersion:"v1", forecastHorizon:"WEEK", publishedAt:from, updatedAt:from, forecastPublishedAt:from, forecastLockedAt:from, validFrom:from, expiresAt:until, forecastValidFrom:from, forecastValidUntil:until, triggerRule:"Wait for a closed candle above 102 / 等待收盘确认", invalidationRule:"Below 98", thesisSummary:"Fictional test only", entryZoneLow:100, entryZoneHigh:102, protectiveStop:98, target1:106, target2:110, target3:115 };
  const json = data => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(data)); };
  if (url.pathname === "/api/member/ai-trading-desk") return json({ lastSyncedAt: new Date(now).toISOString(), syncStatus:"OK", settings:{enabled:true}, runtime:{paused:false}, experiment:{}, stats:{}, planSummary:{}, ledgerSource:"BITGET_DEMO", publishedPlans:[plan], positions:[], recentTrades:[], strategies:[], executionAllowed:false, serverHealthy:true });
  if (url.pathname === "/api/member/key-date-chart") {
    const assetId = url.searchParams.get("asset");
    if (assetId === "eth") { res.statusCode = 503; return json({error:"FIXTURE_FAILURE"}); }
    const midnight = Math.floor(now / 86400000) * 86400000;
    const bars = Array.from({length:80}, (_, i) => { const timestamp = midnight - (80-i)*86400000, close = 100 + Math.sin(i)*9; return { timestamp, date:new Date(timestamp).toISOString().slice(0,10), open:close-2, high:close+3, low:close-4, close, volume:1000+i }; });
    return json({ assetId, quoteSymbol:assetId.toUpperCase(), source:"FICTIONAL QA ONLY", timeZone:"UTC", bars, asOf:bars.at(-1).date, stale:false, checkedAt:new Date(now).toISOString(), projections:[], archiveStatus:"NOT_APPLICABLE" });
  }
  if (url.pathname === "/bundle.js") { res.setHeader("Content-Type","application/javascript"); return res.end(readFileSync("work/operation-desk-qa.js")); }
  res.setHeader("Content-Type","text/html; charset=utf-8"); res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}body{background:#07080b;color:white;font-family:Arial}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`);
}).listen(8770, "127.0.0.1", () => console.log("QA only: http://127.0.0.1:8770"));
