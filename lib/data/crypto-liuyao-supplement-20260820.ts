// MOOX_V720104_CRYPTO_LIUYAO_SUPPLEMENT
/**
 * User-supplied Liu Yao additions locked on 2026-08-20.
 * Interpretation follows the user's financial teacher method:
 * 妻财 first -> 子孙 source -> 兄弟/官鬼/父母 -> 世应 -> target-period month strength,
 * void/tomb/clash/combine -> moving transformations. Hexagram names are context only.
 *
 * Authority boundary: teacher-origin readings rank first. These user-cast records,
 * interpreted with the teacher method, rank second and may own the official period
 * direction only when no overlapping teacher source is available. Daily views are
 * derived from the period; Qimen is a parallel timing/risk check and never overrides.
 */

export type LockedAuxiliaryLiuyaoWeek = {
  id: string;
  assetId: "bitcoin";
  periodStart: string;
  periodEnd: string;
  direction: "上涨" | "下跌" | "震荡上涨" | "震荡下跌" | "先跌后涨";
  confidence: number;
  teacherMethodSummary: string;
  expectedPath: string;
  primaryHexagram: string;
  changingHexagram: string | null;
  structureEvidence: string;
  targetMonthEvidence: string;
  riskNote: string;
  lockedAt: string;
  executionRole: "USER_LIUYAO_TEACHER_METHOD_SECONDARY_AUTHORITY";
};

export const BTC_AUXILIARY_WEEKLY_LIUYAO_20260820: LockedAuxiliaryLiuyaoWeek[] = [
  {
    id: "BTC-LY-AUX-20260831-0906-V1",
    assetId: "bitcoin",
    periodStart: "2026-08-31",
    periodEnd: "2026-09-06",
    direction: "震荡下跌",
    confidence: 68,
    teacherMethodSummary:
      "财爻午火伏在兄弟亥水持世之下，财不透；兄弟亥水发动化官鬼辰土，竞争/抛压最终转成风险。按老师法先看财与子孙，再看兄弟和动变，整体偏弱。",
    expectedPath: "反弹承接不足、震荡偏弱；若出现快速拉升，更像减压反抽，不先定义为新主升。",
    primaryHexagram: "水火既济",
    changingHexagram: "水雷屯",
    structureEvidence: "妻财午火伏于兄弟亥水世下；兄弟亥水动化官鬼辰土；日空戌亥。",
    targetMonthEvidence:
      "8/31-9/6主体仍在申月。申金对午火财不利，同时压制子孙卯木的生财后劲，因此弱势关系更容易兑现。",
    riskNote: "世爻亥水旬空，压力可能阶段性虚化，急跌后不追空；本期与老师申月原卦重叠时，以老师原卦为正式方向，此卦保留作对照复盘。",
    lockedAt: "2026-08-20T06:20:00+08:00",
    executionRole: "USER_LIUYAO_TEACHER_METHOD_SECONDARY_AUTHORITY",
  },
  {
    id: "BTC-LY-AUX-20260907-0914-V1",
    assetId: "bitcoin",
    periodStart: "2026-09-07",
    periodEnd: "2026-09-14",
    direction: "震荡上涨",
    confidence: 56,
    teacherMethodSummary:
      "妻财戌土持世、妻财辰土同现；下爻兄弟寅木发动化妻财辰土，夺财力量转财，是修复信号。但财戌持世在起卦旬空，强度不能放大。",
    expectedPath: "前段仍会反复，随后更容易修复抬升；冲高后仍防回吐，不按强趋势周处理。",
    primaryHexagram: "山雷颐（游魂）",
    changingHexagram: "山水蒙",
    structureEvidence: "妻财戌土持世；另见妻财辰土；兄弟寅木动化妻财辰土；父母子水动化兄弟寅木。",
    targetMonthEvidence:
      "该周主体进入酉月。酉金克兄弟寅木，夺财压力减轻；但土财在金旺月有泄，且戌财起卦旬空，因此只定弱修复。",
    riskNote: "这是偏多修复而非强主升；奇门若与本周期派生观点分歧，网站并列展示，奇门不得覆盖正式方向。",
    lockedAt: "2026-08-20T06:22:00+08:00",
    executionRole: "USER_LIUYAO_TEACHER_METHOD_SECONDARY_AUTHORITY",
  },
  {
    id: "BTC-LY-AUX-20260915-0921-V1",
    assetId: "bitcoin",
    periodStart: "2026-09-15",
    periodEnd: "2026-09-21",
    direction: "下跌",
    confidence: 76,
    teacherMethodSummary:
      "妻财卯木在酉月遭卯酉正冲、月破；兄弟酉金得月令并直接克财。子孙亥水虽可生财，但静而不足以抵消财破、兄旺，是四段里最明确的偏空周。",
    expectedPath: "高波动偏空；即使盘中有反抽，也先按下行风险周管理。",
    primaryHexagram: "兑为泽（六冲静卦）",
    changingHexagram: null,
    structureEvidence: "静卦；妻财卯木、兄弟酉金、子孙亥水；方向来自六亲旺衰，不由六冲卦名直接决定。",
    targetMonthEvidence: "酉月兄弟酉金得令，财卯木月破，兄克财关系最强。",
    riskNote: "六冲只负责放大波动，不能单独作为看跌理由；急跌后不追空，等4H/30m/5m执行结构。",
    lockedAt: "2026-08-20T06:27:00+08:00",
    executionRole: "USER_LIUYAO_TEACHER_METHOD_SECONDARY_AUTHORITY",
  },
  {
    id: "BTC-LY-AUX-20260922-0929-V1",
    assetId: "bitcoin",
    periodStart: "2026-09-22",
    periodEnd: "2026-09-29",
    direction: "先跌后涨",
    confidence: 64,
    teacherMethodSummary:
      "妻财未土持世，另有妻财辰土发动化官鬼酉金，前段财转风险、压力较重；同时父母子水发动化妻财丑土，兄弟寅木发动后化父母亥水，后段夺财结构减弱并重新出现财。",
    expectedPath: "前半段承接压力，后半段更容易止跌修复；修复不自动等同新主升。",
    primaryHexagram: "火雷噬嗑",
    changingHexagram: "火风鼎",
    structureEvidence: "妻财未土持世；妻财辰土动化官鬼酉金；兄弟寅木动化父母亥水；父母子水动化妻财丑土。",
    targetMonthEvidence: "仍处酉月，官鬼酉金得月令使前段风险更易兑现；后段动变中的财重新出现，形成修复条件。",
    riskNote: "路径是先压后修复，不能压成一个单向LONG/SHORT信号；因此本周不生成六爻单边实盘先验。",
    lockedAt: "2026-08-20T06:28:00+08:00",
    executionRole: "USER_LIUYAO_TEACHER_METHOD_SECONDARY_AUTHORITY",
  },
];

export type CryptoPhaseLiuyaoRecord = {
  id: string;
  assetId: "eth";
  periodStart: string;
  periodEnd: string;
  direction: string;
  expectedPath: string;
  primaryHexagram: string;
  changingHexagram: string | null;
  teacherMethodEvidence: string;
  monthCadence: string;
  riskNote: string;
  lockedAt: string;
  executionRole: "USER_LIUYAO_TEACHER_METHOD_STAGE_CONTEXT";
};

export const ETH_PHASE_LIUYAO_20260820: CryptoPhaseLiuyaoRecord[] = [
  {
    id: "ETH-PHASE-20260828-1031-V1",
    assetId: "eth",
    periodStart: "2026-08-28",
    periodEnd: "2026-10-31",
    direction: "8月底至9月相对偏强，10月明显转弱",
    expectedPath: "8月底至9月震荡抬升/相对偏强 → 10月进入明显回撤与急跌风险 → 风险释放后允许修复。",
    primaryHexagram: "风泽中孚（游魂）",
    changingHexagram: "水风井",
    teacherMethodEvidence:
      "兄弟未土持世、妻财子水伏藏；官鬼卯木发动化妻财子水，风险可转财；兄弟丑土发动化子孙酉金，夺财力量转为生财原神；父母巳火发动化兄弟丑土，后段仍会重新形成竞争压力。",
    monthCadence:
      "申、酉金旺能生财水，并压制官鬼卯木，因此8月底至9月相对有利；进入戌月后土旺，兄弟土得势并克财水，10月风险显著抬升。",
    riskNote: "阶段卦只提供中周期背景，不决定5分钟或单日方向；10月重点防快速回撤，不机械整月做空。",
    lockedAt: "2026-08-20T06:36:00+08:00",
    executionRole: "USER_LIUYAO_TEACHER_METHOD_STAGE_CONTEXT",
  },
  {
    id: "ETH-PHASE-20260820-1231-V1",
    assetId: "eth",
    periodStart: "2026-08-20",
    periodEnd: "2026-12-31",
    direction: "高波动震荡偏强，10月为中途风险谷",
    expectedPath: "8月底至9月偏强 → 10月明显回撤 → 11月至12月重新修复偏强，但全程高波动。",
    primaryHexagram: "地泽临",
    changingHexagram: "兑为泽（六冲）",
    teacherMethodEvidence:
      "妻财亥水临应发动化子孙酉金，子孙金可回头生财；兄弟丑土发动化妻财亥水，夺财力量转财。财的动变链条总体偏正面，但变卦六冲提示路径不平滑。",
    monthCadence:
      "申酉金月生财水，8月底至9月更有利；戌月土旺克财，10月形成明显回撤窗口；亥、子水月财重新得令，11至12月具备修复条件。",
    riskNote: "六冲只表示高波动与快速反转，不等于长期看空；奇门只作并列验算，不能覆盖阶段卦派生的正式方向。",
    lockedAt: "2026-08-20T06:37:00+08:00",
    executionRole: "USER_LIUYAO_TEACHER_METHOD_STAGE_CONTEXT",
  },
];

export function listBtcAuxiliaryWeeklyLiuyao20260820(): LockedAuxiliaryLiuyaoWeek[] {
  return BTC_AUXILIARY_WEEKLY_LIUYAO_20260820.map((item) => ({ ...item }));
}

export function listEthPhaseLiuyao20260820(): CryptoPhaseLiuyaoRecord[] {
  return ETH_PHASE_LIUYAO_20260820.map((item) => ({ ...item }));
}

export function findBtcAuxiliaryWeeklyLiuyao20260820(dateKey: string): LockedAuxiliaryLiuyaoWeek | null {
  return BTC_AUXILIARY_WEEKLY_LIUYAO_20260820.find(
    (item) => item.periodStart <= dateKey && item.periodEnd >= dateKey
  ) ?? null;
}
