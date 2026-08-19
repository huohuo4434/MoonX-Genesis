import {
  MOOX_RESEARCH_PROTOCOL_VERSION,
  RESEARCH_AUTHORITY_CHAIN,
} from "@/lib/research/research-protocol";

export const MOOX_RESEARCH_PROTOCOL_V72092 = true;

const qimenRules = [
  "起局时间不固定北京时间20:00；记录起局地点、当地时间、UTC与目标交易日。",
  "正式问题必须可验证；第一次正式盘锁定，重复起局只能作为辅助盘。",
  "主宫空亡不直接判无效，继续检查孤虚、先后天宫转移与相关宫位。",
  "旺衰用于判断力量与兑现时间，结合月令、节气、日干支与宫五行。",
] as const;

const levelRules = [
  "环球视野的大区间只作为大级别价格地图。",
  "日报第一/第二支撑、第一/第二压力优先使用1H缠论缩窄。",
  "额外单列弱化位与正式失效位；15m/5m只负责执行入场。",
  "技术结构不能反向修改奇门主方向。",
] as const;

export function ResearchProtocolAdminPanel() {
  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">V{MOOX_RESEARCH_PROTOCOL_VERSION}</p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-100">MOOX研究规则控制说明</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">本页用于固定研究层级和录入纪律，不修改历史预测，不允许外部分析师或技术信号覆盖奇门正式方向。</p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <h2 className="font-semibold text-zinc-100">研究权威链</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {RESEARCH_AUTHORITY_CHAIN.map((item) => <div key={item} className="rounded-xl border border-white/5 bg-black/10 px-3 py-2 text-sm text-zinc-300">{item}</div>)}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <h2 className="font-semibold text-zinc-100">奇门正式盘纪律</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-400">{qimenRules.map((item) => <li key={item}>• {item}</li>)}</ul>
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <h2 className="font-semibold text-zinc-100">技术点位纪律</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-400">{levelRules.map((item) => <li key={item}>• {item}</li>)}</ul>
        </section>
      </div>
    </div>
  );
}
