/**
 * Seed I Ching (六爻) research engine baseline:
 * - 4 historical INTERNAL records (WAITING_MASTER / RESEARCH) — not public
 * - 10 draft MASTER rules
 *
 * Usage: npx tsx scripts/seed-iching-engine.ts
 */
import { loadProductionEnv } from "./load-env";
import { prisma } from "@/lib/prisma";

loadProductionEnv();

const INTERNAL = "INTERNAL";

async function main() {
  if (!prisma) {
    console.error(JSON.stringify({ ok: false, error: "Prisma not configured: missing DATABASE_URL" }));
    process.exit(1);
  }

  try {
    // ---------------------------
    // 1) Historical INTERNAL records (admin-only; keep raw fields private)
    // ---------------------------
    const ichingResearchSeeds: Array<{
    id: string;
    assetId: string;
    question: string;
    forecastType: string;
    forecastStartAt: string;
    forecastEndAt: string;
    castAtIso: string;
    sourceType: string;
    priority: string;
    researchStatus: string;
    hexagramName: string;
    changedHexagramName?: string | null;
    hexagramSpecialTypes?: string[];
    internalAnalysis?: string | null;
  }> = [
    {
      id: "ICH-FED-20260729-1503-V1",
      assetId: "FED",
      question: "美联储从现在到2026年底，会不会加息？",
      forecastType: "CUSTOM",
      forecastStartAt: "2026-07-29",
      forecastEndAt: "2026-12-31",
      castAtIso: "2026-07-29T15:03:00+08:00",
      sourceType: INTERNAL,
      priority: "NORMAL",
      researchStatus: "WAITING_MASTER",
      hexagramName: "雷泽归妹",
      changedHexagramName: "山泽损",
      hexagramSpecialTypes: ["RETURNING_SOUL"],
      internalAnalysis: "待按照老师投资六爻规则完整分析；老师如有正式卦，以老师结论为准。",
    },
    {
      id: "ICH-SPX-20260729-1508-TO-0907-V1",
      assetId: "SPX",
      question: "标普500从今天到9月7日走势情况",
      forecastType: "CUSTOM",
      forecastStartAt: "2026-07-29",
      forecastEndAt: "2026-09-07",
      castAtIso: "2026-07-29T15:08:00+08:00",
      sourceType: INTERNAL,
      priority: "NORMAL",
      researchStatus: "WAITING_MASTER",
      hexagramName: "地火明夷",
      changedHexagramName: "水火既济",
      hexagramSpecialTypes: ["WANDERING_SOUL"],
      internalAnalysis:
        "原始卦象已保存，等待按照老师投资六爻规则重新分析。重点检查妻财伏藏、兄弟、世应、月日旺衰、动爻和时间窗口。",
    },
    {
      id: "ICH-SPX-20260729-1510-M3-V1",
      assetId: "SPX",
      question: "标普500近三个月走势情况",
      forecastType: "THREE_MONTH",
      forecastStartAt: "2026-07-29",
      forecastEndAt: "2026-10-29",
      castAtIso: "2026-07-29T15:10:00+08:00",
      sourceType: INTERNAL,
      priority: "NORMAL",
      researchStatus: "WAITING_MASTER",
      hexagramName: "地火明夷",
      changedHexagramName: null,
      hexagramSpecialTypes: ["STATIC", "WANDERING_SOUL"],
      internalAnalysis: "静卦原始记录。等待按照老师投资六爻规则重新分析，不得仅凭明夷卦名判断。",
    },
    {
      id: "ICH-SPX-20260729-1511-Y1-V1",
      assetId: "SPX",
      question: "标普500近一年走势情况",
      forecastType: "YEAR",
      forecastStartAt: "2026-07-29",
      forecastEndAt: "2027-07-29",
      castAtIso: "2026-07-29T15:11:00+08:00",
      sourceType: INTERNAL,
      priority: "NORMAL",
      researchStatus: "WAITING_MASTER",
      hexagramName: "离为火",
      changedHexagramName: "天山遁",
      hexagramSpecialTypes: ["SIX_CONFLICT"],
      internalAnalysis:
        "原始卦象已保存。等待根据妻财、世应、动爻、化爻、月日旺衰以及时间窗口重新分析。",
    },
  ];

    let insertedResearch = 0;
    for (const s of ichingResearchSeeds) {
      const exists = await prisma.iChingResearch.findUnique({ where: { id: s.id } });
      if (exists) continue;
      await prisma.iChingResearch.create({
        data: {
          id: s.id,
          assetId: s.assetId,
          question: s.question,
          forecastType: s.forecastType,
          forecastStartAt: s.forecastStartAt,
          forecastEndAt: s.forecastEndAt,
          castAt: new Date(s.castAtIso),
          sourceType: s.sourceType,
          priority: s.priority,
          researchStatus: s.researchStatus,
          timezone: "Asia/Shanghai",
          hexagramName: s.hexagramName,
          changedHexagramName: s.changedHexagramName ?? null,
          hexagramSpecialTypes: s.hexagramSpecialTypes ?? [],
          movingLines: [],
          usefulGod: null,
          worldLine: null,
          responseLine: null,
          lineData: [],
          rawImageUrls: [],
          rawTranscript: null,
          masterOriginalAnalysis: null,
          masterStructuredSummary: null,
          internalAnalysis: s.internalAnalysis ?? null,
          analysisSteps: [],
          timeWindows: [],

          pathConclusion: null,
          directionConclusion: null,
          confidence: null,

          adoptedSource: "INTERNAL",
          adoptedResearchId: null,
          masterOverride: false,
          knowledgeVersion: null,
          version: 1,
          createdBy: "seed",
          updatedBy: "seed",
        },
      });
      insertedResearch++;
    }

    // ---------------------------
    // 2) Draft MASTER rules (MRule-001 ~ MRule-010)
    // ---------------------------
    const masterRuleSeeds: Array<{
    ruleCode: string;
    title: string;
    category: string;
    ruleText: string;
    teacherOriginalText: string;
  }> = [
    {
      ruleCode: "MRule-001",
      title: "投资卦先确定用神",
      category: "USEFUL_GOD",
      ruleText: "金融资产走势研究不能只看卦名，应先确定代表价格和收益的用神，再分析旺衰、生克、伏现和动变。",
      teacherOriginalText: "金融资产走势研究不能只看卦名，应先确定代表价格和收益的用神，再分析旺衰、生克、伏现和动变。",
    },
    {
      ruleCode: "MRule-002",
      title: "妻财是金融价格核心观察对象",
      category: "WEALTH",
      ruleText: "投资走势通常重点观察妻财，但仍需结合具体问题、世应、月日和其他六亲，不得机械套用。",
      teacherOriginalText: "投资走势通常重点观察妻财，但仍需结合具体问题、世应、月日和其他六亲，不得机械套用。",
    },
    {
      ruleCode: "MRule-003",
      title: "兄弟持世通常不利求财",
      category: "BROTHER",
      ruleText:
        "兄弟可代表资金分流、竞争、卖压或消耗。兄弟持世通常不利财，但需要检查财爻是否旺相、是否受生以及是否存在例外。",
      teacherOriginalText:
        "兄弟可代表资金分流、竞争、卖压或消耗。兄弟持世通常不利财，但需要检查财爻是否旺相、是否受生以及是否存在例外。",
    },
    {
      ruleCode: "MRule-004",
      title: "财爻伏藏必须检查飞神",
      category: "HIDDEN_SPIRIT",
      ruleText: "财爻伏藏不能直接判断无上涨。必须分析飞神对伏神的生克、伏神能否出伏以及对应时间窗口。",
      teacherOriginalText: "财爻伏藏不能直接判断无上涨。必须分析飞神对伏神的生克、伏神能否出伏以及对应时间窗口。",
    },
    {
      ruleCode: "MRule-005",
      title: "财旺入墓代表有力量但受限制",
      category: "EXCEPTION",
      ruleText: "财爻旺相但入墓，可能表示价格具备动力但阶段性被锁住，需要结合冲墓、出墓和未来月令判断释放时间。",
      teacherOriginalText: "财爻旺相但入墓，可能表示价格具备动力但阶段性被锁住，需要结合冲墓、出墓和未来月令判断释放时间。",
    },
    {
      ruleCode: "MRule-006",
      title: "动爻较多代表路径变化较多",
      category: "MOVING_LINE",
      ruleText: "投资卦动爻较多通常意味着过程多变、事件密集和多方力量干扰，不能只给单一方向，必须给出阶段路径。",
      teacherOriginalText: "投资卦动爻较多通常意味着过程多变、事件密集和多方力量干扰，不能只给单一方向，必须给出阶段路径。",
    },
    {
      ruleCode: "MRule-007",
      title: "化退代表后劲减弱",
      category: "ADVANCE_RETREAT",
      ruleText: "父母、官鬼、兄弟、子孙或妻财化退时，需要分析对应因素逐渐减弱，但必须结合原爻旺衰判断退神是否有效。",
      teacherOriginalText: "父母、官鬼、兄弟、子孙或妻财化退时，需要分析对应因素逐渐减弱，但必须结合原爻旺衰判断退神是否有效。",
    },
    {
      ruleCode: "MRule-008",
      title: "月破必须单独分析",
      category: "EXCEPTION",
      ruleText: "月破爻的当期作用明显受限，但不能简单视为永久无效，需要结合日辰、动爻、填实和后续月份判断。",
      teacherOriginalText: "月破爻的当期作用明显受限，但不能简单视为永久无效，需要结合日辰、动爻、填实和后续月份判断。",
    },
    {
      ruleCode: "MRule-009",
      title: "预测必须给出时间窗口",
      category: "TIME_WINDOW",
      ruleText: "长期预测需要结合月令转换、节气和爻的旺衰变化，输出各阶段的上涨、下跌或震荡窗口。",
      teacherOriginalText: "长期预测需要结合月令转换、节气和爻的旺衰变化，输出各阶段的上涨、下跌或震荡窗口。",
    },
    {
      ruleCode: "MRule-010",
      title: "预测必须输出路径而非只有方向",
      category: "VALIDATION",
      ruleText: "投资预测应尽量输出先涨后跌、先跌后涨、冲高回落、探底回升等路径，同时记录关键转折时间。",
      teacherOriginalText: "投资预测应尽量输出先涨后跌、先跌后涨、冲高回落、探底回升等路径，同时记录关键转折时间。",
    },
  ];

    let insertedRules = 0;
    for (const r of masterRuleSeeds) {
      const exists = await prisma.masterRule.findUnique({ where: { ruleCode: r.ruleCode } });
      if (exists) continue;
      await prisma.masterRule.create({
        data: {
          ruleCode: r.ruleCode,
          title: r.title,
          category: r.category,
          ruleText: r.ruleText,
          teacherOriginalText: r.teacherOriginalText,
          structuredLogic: { draft: true, note: "Seed draft: awaiting teacher confirmation per admin UI." },
          applicableMarkets: ["FED", "SPX", "NDX", "BTC", "GOLD", "WTI", "SHCOMP", "HSTECH", "CHANGXIN", "ASTEROID", "CUSTOM"],
          applicableForecastTypes: ["TODAY", "TOMORROW", "WEEK", "MONTH", "THREE_MONTH", "HALF_YEAR", "YEAR", "FIVE_YEAR", "CUSTOM"],
          priority: 50,
          confidence: null,
          status: "DRAFT",
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: "seed",
          sourceResearchId: null,
          supersedesRuleId: null,
        },
      });
      insertedRules++;
    }

    console.log(JSON.stringify({ ok: true, insertedResearch, insertedRules }, null, 2));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // If migration tables were not applied, avoid hard build failure.
    console.warn(JSON.stringify({ ok: false, seedSkipped: true, error: msg }));
    // Keep vercel-build alive.
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
});

