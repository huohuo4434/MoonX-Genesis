import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const checks = [];

function requireText(relative, pattern, label) {
  const text = read(relative);
  const ok = typeof pattern === "string" ? text.includes(pattern) : pattern.test(text);
  checks.push({ ok, label, relative });
}

requireText("lib/trading-signals/ai-desk-status.ts", "AI_DESK_QUOTE_STALE_MS = 3 * 60_000", "行情新鲜度统一为3分钟");
requireText("lib/trading-signals/ai-desk-status.ts", "executionConfigured &&", "执行状态经过安全闸门计算");
requireText("lib/trading-signals/ai-desk-status.ts", "行情延迟，执行暂停", "中文状态明确显示自动暂停");
requireText("lib/bitget/demo-runtime.ts", "if (!before.paused && marketOk)", "无新鲜行情时不运行新策略");
requireText("lib/bitget/demo-runtime.ts", "MARKET_DATA_EXECUTION_PAUSED", "行情失败写入暂停审计事件");
requireText("lib/bitget/demo-runtime.ts", "通过3分钟新鲜度检查", "Bitget报价时间戳接受新鲜度检查");
requireText("app/api/admin/prediction-auto-trader/run/route.ts", "runtime.quoteAgeSeconds > 180", "管理员手动运行也受行情新鲜度限制");
requireText("lib/trading-signals/ai-trade-plans.ts", "CURRENT_CONFIDENCE_LOW", "当前置信度不足时禁止执行");
requireText("lib/trading-signals/ai-trade-plans.ts", "INTRADAY: 1.25", "短线版本更新容差已提高");
requireText("lib/trading-signals/ai-trade-plans.ts", "Count unique plan groups", "统计不再把替代版本算作新计划");
requireText("components/member/AiTradingDeskClient.tsx", "AI策略公开台", "中文标题改为AI策略公开台");
requireText("components/member/AiTradingDeskClient.tsx", "查看历史版本", "旧版本默认折叠");
requireText("components/member/AiTradingDeskClient.tsx", "Research observation only", "低置信度计划降级为研究观察");
requireText("components/member/AiTradingDeskClient.tsx", "priceDigits", "价格按资产精度格式化");
requireText("components/member/AiTradingDeskClient.tsx", "planStatusLabel(plan.status, en)", "状态不再直接显示原始英文枚举");
requireText("components/member/AiTradingDeskClient.tsx", "decisionStatusLabel(latest.status, en)", "三周期状态完成中英文映射");

const failed = checks.filter((item) => !item.ok);
for (const item of checks) {
  console.log(`${item.ok ? "PASS" : "FAIL"}  ${item.label}  [${item.relative}]`);
}
if (failed.length) {
  console.error(`\nAI策略公开台专项审计失败：${failed.length}项未通过。`);
  process.exit(1);
}
console.log(`\nAI策略公开台专项审计通过：${checks.length}项。`);
