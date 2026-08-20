import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const daily = read("app/member/daily/page.tsx");
const conviction = read("components/conviction/ConvictionListClient.tsx");
const stock = read("components/member/MemberStockDetail.tsx");
const strategy = read("lib/trading-signals/three-horizon-strategy.ts");
const risk = read("lib/research/october-2026-flash-crash-risk.ts");

assert.match(daily, /10月闪崩风险先验/);
assert.match(daily, /<th className="px-3 py-2">10月风险<\/th>/);
assert.match(conviction, /OCTOBER RISK PRIOR/);
assert.match(stock, /octoberAssetRisk\.sensitivityLabelZh/);
assert.match(strategy, /MOOX_V720102_OCTOBER_FLASH_CRASH_GUARD/);
assert.match(strategy, /calculated\.notionalAmount \* liveRiskScale/);
assert.match(risk, /direction !== "LONG"/);
assert.match(risk, /不得重新起卦覆盖|不事后改写方向/);

console.log("V7.20.10.2 October risk integration tests passed");
