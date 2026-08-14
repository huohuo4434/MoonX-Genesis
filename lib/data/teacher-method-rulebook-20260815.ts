import "server-only";
import type { TeacherMethodRulebook } from "@/types/teacher-method-rulebook";

const RULEBOOK: TeacherMethodRulebook = {
  version: "2026-08-15.v1",
  executionAuthority: "RESEARCH_ONLY",
  tradingEligible: false,
  artifacts: [
    { id: "WOLF-R322-TXT", teacher: "狼叔六爻", relativePath: "03-六爻狼叔/狼叔六爻.txt", sourcePublishedAt: null, transcriptionStatus: "TEXT_SOURCE" },
    { id: "WOLF-R322-DOCX", teacher: "狼叔六爻", relativePath: "03-六爻狼叔/Rev3.2.2_*.docx", sourcePublishedAt: null, transcriptionStatus: "DOCX_REFERENCE_ONLY" },
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
    { id: "gaoshan-structure-complete", method: "GAOSHAN_CHAN", status: "TEACHER_CONFIRMED_RULE", title: "先等结构完成", summary: "笔、线段和中枢需要完成与确认；未完成结构不能仅凭形似三笔认定转折。", sourceArtifactId: "GAOSHAN-TEXT-CORPUS", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "gaoshan-multi-timeframe", method: "GAOSHAN_CHAN", status: "TEACHER_CONFIRMED_RULE", title: "多周期对应", summary: "日线一笔、四小时段和三十分钟内部结构需要对应，不能混用不同级别的完成信号。", sourceArtifactId: "GAOSHAN-TEXT-CORPUS", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "gaoshan-entry-pattern", method: "GAOSHAN_CHAN", status: "CASE_DERIVED_RULE", title: "二三买卖点需结构确认", summary: "从课程案例归纳：二买、三买及对称卖点必须绑定中枢、回踩与确认结构，不按标签直接触发。", sourceArtifactId: "GAOSHAN-TEXT-CORPUS", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "qimen-explicit-window", method: "QIMEN_TIMING", status: "TEACHER_CONFIRMED_RULE", title: "应验窗口不得偷换", summary: "一到三周风险窗口不等同于下一周；必须保留老师明确说明的时间跨度。", sourceArtifactId: "QIMEN-20260817-TXT", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "qimen-timing-only", method: "MOOX_POLICY", status: "MOOX_INTERPRETATION", title: "奇门只作择时辅助", summary: "奇门不独立翻转正式周/月方向；缺盘、缺用神时不推导不存在的信息。", sourceArtifactId: "MOOX-POLICY", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "nana-fundamental-horizon", method: "NANA_FUNDAMENTALS", status: "TEACHER_CONFIRMED_RULE", title: "基本面决定中长线背景", summary: "基本面用于中长线方向与估值背景，不等同于短线入场时机。", sourceArtifactId: "NANA-20260813-TXT", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "moox-formal-authority", method: "MOOX_POLICY", status: "MOOX_INTERPRETATION", title: "正式周/月方向为权威", summary: "老师、X和技术结构用于验证、点位和反例；不能单独覆盖正式锁定方向。", sourceArtifactId: "MOOX-POLICY", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
    { id: "moox-conflict-wait", method: "MOOX_POLICY", status: "MOOX_INTERPRETATION", title: "分歧大时观望", summary: "关键证据缺失或结构与正式方向冲突时输出WAIT，不为营销强选多空。", sourceArtifactId: "MOOX-POLICY", sourcePublishedAt: null, executionAuthority: "RESEARCH_ONLY" },
  ],
};

export function getTeacherMethodRulebook20260815(): TeacherMethodRulebook {
  return {
    ...RULEBOOK,
    artifacts: RULEBOOK.artifacts.map((item) => ({ ...item })),
    rules: RULEBOOK.rules.map((item) => ({ ...item })),
  };
}
