import { build } from "esbuild";
import { createServer } from "node:http";
import { readFileSync, readdirSync } from "node:fs";
await build({entryPoints:["tests/fixtures/concise-plan-qa.tsx"],outfile:"work/concise-plan-qa-bundle.js",bundle:true,platform:"browser",jsx:"automatic",define:{"process.env.NODE_ENV":"'development'"}});
const css = readdirSync(".next/static/css").filter(x=>x.endsWith(".css")).map(x=>readFileSync(`.next/static/css/${x}`,"utf8")).join("\n");
let calls = 0;
createServer((req,res)=>{
 if(req.url==="/api/member/ai-trading-desk") { const delay = ++calls <= 2 ? 16_000 : 0; setTimeout(()=>{res.setHeader("Content-Type","application/json");res.end(JSON.stringify({lastSyncedAt:new Date().toISOString(),syncStatus:"OK",settings:{enabled:true},ledgerSource:"BITGET_DEMO",publishedPlans:[]}));}, delay);return; }
 if(req.url==="/bundle.js") {res.setHeader("Content-Type","application/javascript");res.end(readFileSync("work/concise-plan-qa-bundle.js"));return;}
 res.setHeader("Content-Type","text/html; charset=utf-8");res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}body{background:#07080b;color:white;font-family:Arial}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`);
}).listen(8769,"127.0.0.1",()=>console.log("QA fixture: http://127.0.0.1:8769 — no external API or orders"));
