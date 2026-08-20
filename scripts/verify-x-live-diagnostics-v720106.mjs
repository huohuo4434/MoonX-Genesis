import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/^\uFEFF/, '');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);
const expect = (condition, message) => condition ? pass(message) : fail(message);

const registry = read('lib/trading-signals/x-source-registry.server.ts');
const handles = [...registry.matchAll(/handle:\s*"([^"]+)"/g)].map((m) => m[1]);
const normalized = handles.map((x) => x.toLowerCase());
expect(handles.length >= 27, `X registry contains at least 27 handles (${handles.length})`);
expect(new Set(normalized).size === handles.length, 'X registry handles are unique case-insensitively');

const defaultConfig = JSON.parse(read('tools/x-collector/default-config.json'));
const configHandles = (defaultConfig.accounts ?? []).map((x) => String(x).toLowerCase());
expect(configHandles.length === handles.length, `local collector default account count matches registry (${configHandles.length})`);
expect(normalized.every((h) => configHandles.includes(h)), 'local collector defaults contain every registry handle');

const configure = read('tools/x-collector/configure.ps1').toLowerCase();
expect(normalized.every((h) => configure.includes(`\"${h}\"`) || configure.includes(`'${h}'`) || configure.includes(h)), 'configure.ps1 contains every registry handle');

const alpha = read('app/member/alpha-feed/page.tsx');
expect(alpha.includes('getMemberMultiViewSnapshot'), 'multi-view page uses server-side structured snapshot');
expect(alpha.includes('data-moox-server-multi-view="1"'), 'multi-view page marks server-rendered view');
expect(alpha.includes('X采集健康状态') && alpha.includes('观察账号') && alpha.includes('报告任务 每15分钟'), 'multi-view page exposes collector health');
expect(!alpha.includes('getOrRefreshXScanReport'), 'multi-view page no longer rebuilds researchers from aggregate report');
expect(!alpha.includes('projectPublicAttribution('), 'multi-view page does not redact identity before server grouping');

const guard = read('components/system/SiteClarityGuards.tsx');
expect(guard.includes('mooxServerMultiView') || guard.includes('moox-server-multi-view'), 'legacy client enhancer bypasses server-rendered multi-view');

const multiServer = read('lib/trading-signals/member-multi-view.server.ts');
expect(multiServer.includes('trade_external_analyst_posts'), 'server multi-view reads stored X posts');
expect(multiServer.includes('anonymizeMultiViewResearcher'), 'server multi-view anonymizes before rendering');
expect(multiServer.includes('X_SOURCE_REGISTRY'), 'server multi-view limits rows to private registry');
const researcherTypeBlock = multiServer.slice(multiServer.indexOf('export type MemberMultiViewResearcher'), multiServer.indexOf('export type MemberMultiViewCollectionHealth'));
expect(!/username\s*:/.test(researcherTypeBlock), 'member-facing researcher type does not expose username');

const external = read('lib/trading-signals/external-analyst-signals.ts');
expect(external.includes('serverWatchHandles()'), 'server X API path uses registry watch handles');
expect(external.includes('fetchRegistryPostsWithConcurrency'), 'server X API fetches registry with bounded concurrency');
expect(external.includes('for (let index = 0; index < unique.length; index += 100)'), 'server feed stores large registry scans in bounded chunks');
const bearerBranch = external.slice(external.indexOf('if (bearerToken)'), external.indexOf('const unique'));
expect(!bearerBranch.includes('for (const analyst of ANALYSTS)'), 'bearer-token collection no longer scans only dedicated 4 analysts');

const cron = read('app/api/cron/external-analysts/route.ts');
expect(cron.includes('maxDuration = 300'), 'external analyst cron allows full-registry fetch duration');

const vercel = JSON.parse(read('vercel.json'));
const externalCron = (vercel.crons ?? []).find((x) => x.path === '/api/cron/external-analysts');
const reportCron = (vercel.crons ?? []).find((x) => x.path === '/api/cron/x-intelligence-report');
const liveCron = (vercel.crons ?? []).find((x) => x.path === '/api/cron/prediction-auto-trader');
expect(externalCron?.schedule === '*/15 * * * *', 'server external-analyst refresh is scheduled every 15 minutes');
expect(reportCron?.schedule === '*/15 * * * *', 'server X report is scheduled every 15 minutes');
expect(liveCron?.schedule === '* * * * *', 'live prediction auto-trader cron is scheduled every minute');

const sync = read('scripts/sync-x-collector-accounts-v720106.mjs');
expect(sync.includes('bak-v720106') && sync.includes('MOOX-X-Collector'), 'local collector sync backs up installed config before merging registry');
expect(read('SYNC_MOOX_X_COLLECTOR_ACCOUNTS.cmd').includes('sync-x-collector-accounts-v720106.mjs'), 'Windows sync command targets v720106 sync script');

const liveApi = read('app/api/member/live-trading/route.ts');
expect(liveApi.includes('getBitgetRuntimeState'), 'member live API reads authoritative runtime heartbeat');
expect(liveApi.includes('runtimeHeartbeat'), 'member live API returns runtime heartbeat diagnostics');
expect(liveApi.includes('heartbeatAgeSeconds'), 'member live API exposes heartbeat age');

const liveClient = read('components/live-trading/MemberLiveTradingClient.tsx');
expect(liveClient.includes('每分钟 Cron 心跳'), 'member live page displays minute cron heartbeat');
expect(liveClient.includes('三周期策略扫描'), 'member live page displays three-horizon strategy scan');
expect(liveClient.includes('runtimeHeartbeat'), 'member live page consumes runtime heartbeat diagnostics');

const autoCron = read('app/api/cron/prediction-auto-trader/route.ts');
const threeHorizon = read('lib/trading-signals/three-horizon-strategy.ts');
expect(autoCron.includes('MOOX_V72010_1000U_AUTO_CRON'), '1000U authoritative minute runner marker exists');
expect(threeHorizon.includes('MOOX_V72010_1000U_LIVE_EXECUTION'), '1000U three-horizon live execution marker exists');

if (process.exitCode) {
  console.error('V7.20.10.6 X/live diagnostics verification FAILED');
  process.exit(1);
}
console.log('V7.20.10.6 X/live diagnostics verification PASSED');
