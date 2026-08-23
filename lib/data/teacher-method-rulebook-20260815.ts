import "server-only";
import type { TeacherMethodRulebook } from "@/types/teacher-method-rulebook";

const RULEBOOK: TeacherMethodRulebook = {
  version: "2026-08-23.v2",
  executionAuthority: "RESEARCH_ONLY",
  tradingEligible: false,
  artifacts: [
    { id: "WOLF-R322-TXT", teacher: "狼叔六爻", relativePath: "03-六爻狼叔/狼叔六爻.txt", sourcePublishedAt: null, transcriptionStatus: "TEXT_SOURCE" },
    { id: "WOLF-R322-DOCX", teacher: "狼叔六爻", relativePath: "03-六爻狼叔/Rev3.2.2_*.docx", sourcePublishedAt: null, transcriptionStatus: "DOCX_REFERENCE_ONLY" },
    { id: "WOLF-20260823-TXT", teacher: "狼叔六爻", relativePath: "03-六爻狼叔/0823/*.txt", sourcePublishedAt: null, transcriptionStatus: "TEXT_SOURCE" },
    { id: "GAOSHAN-TEXT-CORPUS", teacher: "高山说缠论", relativePath: "14-高山说缠论/*.txt", sourcePublishedAt: null, transcriptionStatus: "TEXT_SOURCE" },
    { id: "QIMEN-20260817-TXT", teacher: "奇门遁甲老师", relativePath: "02_奇门遁甲老师/*2026年8月17日-8月22日*.txt", sourcePublishedAt: null, transcriptionStatus: "TEXT_SOURCE" },
    { id: "NANA-20260813-TXT", teacher: "NANA说美股", relativePath: "16-NANA说美股/变盘前夜！NaNa说美股(2026.08.13).txt", sourcePublishedAt: null, transcriptionStatus: "TEXT_SOURCE" },
    { id: "MOOX-POLICY", teacher: "MOOX研究委员会", relativePath: "AGENTS.md", sourcePublishedAt: null, transcriptionStatus: "TEXT_SOURCE" },
  ],
  rules: [
    { id: "wolf-cycle-inheritance", method: "WOLF_LIUYAO", status: "TEACHER_CONFIRMED_RULE", title: "先继承大周期", summary: "周卦或日卦分析前，先声明已有月、季、年背景，并判断本周期是顺应还是逆向修正。", sourceArtifactId: "WOLF-R322-TXT", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "wolf-complete-hexagram", method: "WOLF_LIUYAO", status: "TEACHER_CONFIRMED_RULE", title: "原互变与动爻必须完整", summary: "本卦、互卦、变卦和动爻位置不完整时停止推演，不自行假设动爻。", sourceArtifactId: "WOLF-R322-TXT", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "wolf-priority-order", method: "WOLF_LIUYAO", status: "TEACHER_CONFIRMED_RULE", title: "卦意与爻辞优先", summary: "原始卦意、动爻爻辞和爻位值时为第一主导；体用生克与月令只做幅度和极端行情校验。", sourceArtifactId: "WOLF-R322-TXT", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "wolf-343", method: "WOLF_LIUYAO", status: "TEACHER_CONFIRMED_RULE", title: "自然日3/4/3分段", summary: "按预测区间自然日切分前30%、中40%、后30%；加密货币周末也计入。", sourceArtifactId: "WOLF-R322-TXT", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "wolf-patch19", method: "WOLF_LIUYAO", status: "MISSING_RULE", title: "补丁十九精确公式未恢复", summary: "现有材料只保留名称和用途，缺少完整公式，禁止AI补造。", sourceArtifactId: "WOLF-R322-TXT", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "wolf-g3-g5", method: "WOLF_LIUYAO", status: "MISSING_RULE", title: "G3/G5定义未恢复", summary: "接掌日对齐规则没有完整逐条定义，暂不进入自动计算。", sourceArtifactId: "WOLF-R322-TXT", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "wolf-special-tables", method: "WOLF_LIUYAO", status: "MISSING_RULE", title: "特殊卦完整表缺失", summary: "山地剥月令裁决表、低位六冲过滤、双乾双坤完整分支尚未恢复。", sourceArtifactId: "WOLF-R322-TXT", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "wolf-market-clock", method: "WOLF_LIUYAO", status: "TEACHER_CONFIRMED_RULE", title: "按对象市场保存原始时钟", summary: "GLD、SLV等北美证券品种保留America/New_York交易时段；ETH等7×24加密资产统一使用UTC。展示层可换算，但底层不得混用时区。", sourceArtifactId: "WOLF-20260823-TXT", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "wolf-price-structure-before-clock", method: "WOLF_LIUYAO", status: "TEACHER_CONFIRMED_RULE", title: "价格结构优先于死等时间", summary: "复盘与执行依次核对急涨急跌、真实支撑压力和时间窗口；时间是第三项，不能脱离价格行为单独触发。", sourceArtifactId: "WOLF-20260823-TXT", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "wolf-direction-timing-split", method: "WOLF_LIUYAO", status: "CASE_DERIVED_RULE", title: "方向与时间分开评分", summary: "北美交易品种允许半日至一个交易日的转折时间容差，但容差只影响时间评分，不能把错误方向改成命中。", sourceArtifactId: "WOLF-20260823-TXT", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "wolf-forward-review-evolution", method: "WOLF_LIUYAO", status: "TEACHER_CONFIRMED_RULE", title: "复盘只升级未来版本", summary: "保留每次事前原稿，完成后分别复盘方向、时间与幅度；新认识只进入下一版规则，禁止覆盖失败或部分命中的历史记录。", sourceArtifactId: "WOLF-20260823-TXT", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "wolf-rev329h-boundary", method: "WOLF_LIUYAO", status: "MISSING_RULE", title: "Rev3.2.9-h完整公式未恢复", summary: "0823截图可确认老师工作模型已显示Rev3.2.9-h，但材料未给完整公式；只登记版本与可验证案例规则，不从结果倒推自动公式。", sourceArtifactId: "WOLF-20260823-TXT", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "gaoshan-structure-complete", method: "GAOSHAN_CHAN", status: "TEACHER_CONFIRMED_RULE", title: "先等结构完成", summary: "笔、线段和中枢需要完成与确认；未完成结构不能仅凭形似三笔认定转折。", sourceArtifactId: "GAOSHAN-TEXT-CORPUS", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "gaoshan-multi-timeframe", method: "GAOSHAN_CHAN", status: "TEACHER_CONFIRMED_RULE", title: "多周期对应", summary: "日线一笔、四小时段和三十分钟内部结构需要对应，不能混用不同级别的完成信号。", sourceArtifactId: "GAOSHAN-TEXT-CORPUS", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "gaoshan-level-hierarchy", method: "GAOSHAN_CHAN", status: "TEACHER_CONFIRMED_RULE", title: "四小时定主位，低级别定入场", summary: "日线背景与四小时中枢、线段边界用于主要支撑压力；一小时、三十分钟和五分钟只负责短线买卖点、回踩确认与精确入场，不能把最近小波动冒充大级别主位。", sourceArtifactId: "GAOSHAN-TEXT-CORPUS", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "gaoshan-entry-pattern", method: "GAOSHAN_CHAN", status: "CASE_DERIVED_RULE", title: "二三买卖点需结构确认", summary: "从课程案例归纳：二买、三买及对称卖点必须绑定中枢、回踩与确认结构，不按标签直接触发。", sourceArtifactId: "GAOSHAN-TEXT-CORPUS", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "qimen-explicit-window", method: "QIMEN_TIMING", status: "TEACHER_CONFIRMED_RULE", title: "应验窗口不得偷换", summary: "一到三周风险窗口不等同于下一周；必须保留老师明确说明的时间跨度。", sourceArtifactId: "QIMEN-20260817-TXT", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "qimen-parallel-forecast", method: "MOOX_POLICY", status: "MOOX_INTERPRETATION", title: "奇门与六爻并列预测", summary: "六爻与奇门分别保留独立方向；同向提高信心，分歧时并列展示并降低信心。缺盘、缺用神时不推导不存在的信息。", sourceArtifactId: "MOOX-POLICY", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "nana-fundamental-horizon", method: "NANA_FUNDAMENTALS", status: "TEACHER_CONFIRMED_RULE", title: "基本面决定中长线背景", summary: "基本面用于中长线方向与估值背景，不等同于短线入场时机。", sourceArtifactId: "NANA-20260813-TXT", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "moox-formal-authority", method: "MOOX_POLICY", status: "MOOX_INTERPRETATION", title: "正式周/月方向为权威", summary: "老师、X和技术结构用于验证、点位和反例；不能单独覆盖正式锁定方向。", sourceArtifactId: "MOOX-POLICY", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "moox-conflict-wait", method: "MOOX_POLICY", status: "MOOX_INTERPRETATION", title: "分歧大时观望", summary: "关键证据缺失或结构与正式方向冲突时输出WAIT，不为营销强选多空。", sourceArtifactId: "MOOX-POLICY", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "moox-horizon-context", method: "MOOX_POLICY", status: "MOOX_INTERPRETATION", title: "大周期只定环境", summary: "年、季、月和阶段卦定义市场环境与顺逆关系，不替代当前有效周卦的正式方向。", sourceArtifactId: "MOOX-POLICY", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "moox-weekly-direction-lock", method: "MOOX_POLICY", status: "MOOX_INTERPRETATION", title: "周卦锁定短中期方向", summary: "当前有效周卦或阶段卦拥有短中期正式方向权；发布后只允许新版本修订。", sourceArtifactId: "MOOX-POLICY", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "moox-no-daily-hexagram", method: "MOOX_POLICY", status: "MOOX_INTERPRETATION", title: "不单独要求日卦", summary: "日分析由周卦或阶段卦拆解，再用缠论、K线与真实技术价位验证；没有日卦不属于资料缺失。", sourceArtifactId: "MOOX-POLICY", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "moox-technical-no-vote", method: "MOOX_POLICY", status: "MOOX_INTERPRETATION", title: "缠论和技术无方向投票权", summary: "技术只负责结构完成、支撑压力、入场、止损和盈亏比；可以要求等待，不能反向修改正式方向。", sourceArtifactId: "MOOX-POLICY", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "moox-ai-risk-authority", method: "MOOX_POLICY", status: "MOOX_INTERPRETATION", title: "AI只管理信息与风险", summary: "AI可以提醒、降仓、延迟或否决本次交易，但无权修改已锁定方向。", sourceArtifactId: "MOOX-POLICY", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "moox-execution-three-gates", method: "MOOX_POLICY", status: "MOOX_INTERPRETATION", title: "方向、位置、风险三门齐过才执行", summary: "预测存在不等于必须交易；只有方向明确、位置合适、风险可控同时成立才进入量化执行。", sourceArtifactId: "MOOX-POLICY", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "moox-lock-version-history", method: "MOOX_POLICY", status: "MOOX_INTERPRETATION", title: "锁定记录不可覆盖", summary: "修订必须产生新版本并保留原因；当前只展示最新有效版本，旧版本、失败和部分命中样本永久保留。", sourceArtifactId: "MOOX-POLICY", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "moox-metric-separation", method: "MOOX_POLICY", status: "MOOX_INTERPRETATION", title: "方向、概率、星级、风险、执行状态分开", summary: "星级只表示方法共识度；概率、风险等级和是否可交易均为独立字段，不能互相替代。", sourceArtifactId: "MOOX-POLICY", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "moox-top5-actionable", method: "MOOX_POLICY", status: "MOOX_INTERPRETATION", title: "前5按可执行性筛选", summary: "前5必须同时满足方向、位置、盈亏比和本周窗口；A股只有共识上涨可入选，极强看跌只作风险备注。", sourceArtifactId: "MOOX-POLICY", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
  ],
};

export function getTeacherMethodRulebook20260815(): TeacherMethodRulebook {
  return {
    ...RULEBOOK,
    artifacts: RULEBOOK.artifacts.map((item) => ({ ...item })),
    rules: RULEBOOK.rules.map((item) => ({ ...item })),
  };
}
