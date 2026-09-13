import React from "react";
import Link from "next/link";
import { FED_SPECIAL, fedSpecialPhase } from "@/lib/research/fed-september-2026";

const copy = {
  zh: {
    title: "市场押加息，我们为什么仍看9月不加息？",
    call: "我们的会前判断：9月维持利率不变。",
    badge: "9月议息专题 · 普通注册会员免费读",
    teaser: "一个与近期加息定价相反的判断。看完整理由、反方风险，以及会后怎样判对错。",
    read: "进入议息专题 →", register: "免费注册，读完整专题", login: "已有账号？登录阅读",
    status: "会前观点 · 尚未验证", review: "决议时间已到 · 等待官方结果复核",
    timing: "决议窗口：9月16日14:00（纽约）／9月17日02:00（北京）。以美联储实际发布为准。",
    intro: "不是降息预测，也不是承诺市场大涨。这个专题只判断9月这次FOMC会议是否维持联邦基金利率目标区间不变。",
    snapshot: "市场参照：Kiplinger 9月11日报道引用CME FedWatch，称当时加息25基点概率约85%。这是报道时的历史快照，并非本站实时读数，也不是所有投资者的观点。",
    outline: "免费注册可读：为什么坚持不变｜哪些证据反对我们｜BTC、美股和黄金的三种反应情景｜明确的命中与失误标准。无需购买高级会员。",
    sections: [
      { title: "01 / 为什么仍把不变作为主情景", body: "加息压力与立即加息不是同一件事。BLS公布的8月整体CPI同比为3.4%，核心CPI同比从2.5%降至2.4%；汽油贡献了整体月度涨幅的三分之一以上。我们的解释是：能源冲击与基础通胀需要区分，美联储仍可能选择维持利率，同时用偏鹰沟通保留后续加息空间。这是对公开数据的研究假设，不是内部消息，也不是数据已经证明会暂停。" },
      { title: "02 / 最强反方，必须摆出来", body: "同一份BLS数据也显示核心CPI环比由0.2%升至0.3%，不能只挑同比回落的一面。能源冲击若扩散到通胀预期，或就业与通胀共同促使决策者立即收紧，加息25基点就可能兑现。上述市场快照明显不利于我们的主情景。逆向不等于正确；本专题不编造未经校准的高胜率。" },
      { title: "03 / 六爻与奇门同向：9月仍看不加息", body: "我们将六爻与奇门遁甲的研判相互参照，方向一致：9月这次议息，仍以维持利率不变为主。\n\n六爻重在爻气与生克，不只看卦名。8月31日的议息卦中，世爻为寅木、临朱雀，起卦时逢申月冲破；朱雀主消息与言论，这一取象提示加息声势虽强，却未必落实。再看代表政策文书的父母爻：未土发动化卯木，受回头克；结合亥卯未合木局克土的取象，关键落在“动而受制”。我们的解读是：有加息之声，但政策落地有阻。\n\n奇门周度研判同样倾向“不加不降”，与六爻判断相呼应。因此，我们不把鹰派表态直接等同于本次加息，继续维持9月利率不变的主判断，等待正式决议检验。" },
      { title: "04 / 不加息，不等于闭眼买", body: "情景一：维持不变、沟通偏温和，可能缓解部分收紧担忧；但BTC与科技股仍需确认反弹能否站稳。情景二：维持不变、沟通偏鹰，可能先反弹再回吐，也可能直接承压。情景三：实际加息，本专题的主判断失误，应重新评估，不用“已经计价”替错误开脱。黄金还受美元与实际利率影响，不能仅凭不加息就断言上涨。以上均为条件情景，不是买卖指令。" },
    ],
    rulesTitle: "05 / 结果怎么判，提前写清楚",
    rules: ["命中：本次官方声明的目标区间上下限均与会前一致。", "失误：本次宣布加息或降息。降息虽然也叫“不加息”，但不符合我们明确的“维持不变”预测。", "待核验：官方结果无法取得或口径不明确；不提前标记成功。", "会后另附有日期的复盘，保留本版判断。一次事件命中只算一个样本，不证明整体高准确率，更不等于交易获利。"],
    footer: "把观点写在结果之前，把对错留在记录里。研究有误判风险，不构成个性化投资建议或收益保证。",
    further: "继续看完整历史验证 →", sources: "事实核对来源（不为本站判断背书）",
  },
  en: {
    title: "Markets lean toward a hike. Our September call: hold.",
    call: "Our pre-meeting call: the Fed leaves its target range unchanged.",
    badge: "September Fed special · Free registered access",
    teaser: "A call against recent hike pricing. Read the reasoning, the strongest countercase and the rules for judging the result.",
    read: "Read the Fed special →", register: "Create a free account to read", login: "Already registered? Sign in",
    status: "Pre-meeting opinion · Not yet verified", review: "Decision time reached · Official-result review pending",
    timing: "Decision window: September 16, 2 p.m. New York / September 17, 2 a.m. Beijing. The actual Fed release controls.",
    intro: "This is not a cut forecast or a promise of a rally. The specific call is an unchanged federal funds target range at this September FOMC meeting.",
    snapshot: "Market reference: Kiplinger reported on September 11 that CME FedWatch implied roughly 85% odds of a 25-basis-point hike at that time. This is a historical media-reported snapshot, not a live MOOX reading or the view of every investor.",
    outline: "Free registration unlocks: the hold thesis, the countercase, three scenarios for BTC / stocks / gold and explicit hit-or-miss rules. No paid subscription required.",
    sections: [
      { title: "01 / Why hold remains our base case", body: "Pressure to tighten is not an immediate decision to tighten. BLS reported August headline CPI at 3.4% year over year and core CPI slowing from 2.5% to 2.4%; gasoline contributed more than a third of the monthly headline rise. Our interpretation is that energy shocks and underlying inflation should be distinguished. The Fed could hold while preserving a later hike through hawkish guidance. This is a hypothesis based on public data, not inside information or proof of a pause." },
      { title: "02 / The strongest countercase", body: "The same BLS report shows monthly core CPI accelerating from 0.2% to 0.3%. We cannot cherry-pick the slower annual figure. Energy spillovers into inflation expectations, together with employment and inflation conditions, could prompt an immediate 25-basis-point hike. The cited market snapshot weighs against our base case. Being contrarian is not proof of an edge; we assign no uncalibrated high win probability." },
      { title: "03 / Liu Yao and Qimen align: our September hold call", body: "Our cross-reading of Liu Yao and weekly Qimen analysis points in the same direction: an unchanged target range at this September meeting remains our primary call.\n\nIn Liu Yao, we examine the lines' strength and interactions rather than relying on the hexagram's name. In the August 31 rate-decision chart, the self line is Yin Wood with Vermilion Bird, clashed by the Shen month at casting. Vermilion Bird represents messages and speech: we read this as strong hike rhetoric that may not become action. The parent line, representing policy documents, moves from Wei Earth to Mao Wood and is controlled by its transformed line. Together with the Hai–Mao–Wei Wood combination controlling Earth, the reading emphasizes movement meeting restraint. Our interpretation: pressure for a hike, but obstacles to implementation.\n\nThe weekly Qimen assessment also favors neither a hike nor a cut, echoing the Liu Yao reading. We therefore distinguish hawkish language from an actual September hike and retain our hold call, to be tested against the official decision." },
      { title: "04 / No hike is not an automatic buy signal", body: "Scenario 1: an unchanged range with softer guidance could ease some tightening fears; BTC and technology stocks still need sustained price confirmation. Scenario 2: an unchanged range with hawkish guidance could produce a fading bounce or continued weakness. Scenario 3: an actual hike makes our primary call wrong; 'already priced in' is not a reason to relabel it a success. Gold also responds to the dollar and real yields. These are conditional scenarios, not trading instructions." },
    ],
    rulesTitle: "05 / Judgment rules, written before the result",
    rules: ["Hit: both bounds of the announced target range remain identical to the pre-meeting range.", "Miss: either a hike or a cut. A cut is technically 'no hike' but fails our specific unchanged-rate forecast.", "Unverified: the official outcome is unavailable or unclear. No early success label.", "Append a separately dated review and preserve this version. One event is one sample: it does not establish a high overall hit rate or a profitable trade."],
    footer: "A call before the result. A record of both hits and misses. Research can be wrong; this is not personalized investment advice or a return guarantee.",
    further: "Explore the full verification record →", sources: "Factual references (not endorsements of our call)",
  },
};

export function FedDecisionTeaser({ locale, now = new Date() }: { locale: string; now?: Date }) {
  // Do not keep advertising an upcoming decision after its scheduled release.
  if (fedSpecialPhase(now) !== "PRE_MEETING") return null;
  const en = locale === "en";
  const c = copy[en ? "en" : "zh"];
  return <aside aria-label={c.badge} className="mx-auto my-4 max-w-6xl px-4">
    <Link href={`${en ? "/en" : ""}${FED_SPECIAL.path}`} className="block rounded-2xl border border-amber-300/40 bg-amber-500/10 p-5 text-foreground hover:border-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
      <p className="text-xs font-semibold text-amber-300">{c.badge}</p>
      <p className="mt-2 text-xl font-semibold">{c.title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{c.teaser}</p>
      <p className="mt-3 text-sm font-semibold text-amber-300">{c.read}</p>
    </Link>
  </aside>;
}

export function FedSpecialView({ en, canRead, now = new Date() }: { en: boolean; canRead: boolean; now?: Date }) {
  const c = copy[en ? "en" : "zh"];
  const prefix = en ? "/en" : "";
  const next = encodeURIComponent(`${prefix}${FED_SPECIAL.path}`);
  return <main data-fed-special={FED_SPECIAL.id} className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
    <header className="rounded-3xl border border-amber-300/30 bg-gradient-to-br from-amber-500/10 to-violet-500/10 p-6 sm:p-8">
      <p className="text-sm text-amber-300">{c.badge}</p>
      <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">{c.title}</h1>
      <p className="mt-5 text-xl font-medium">{c.call}</p>
      <p className="mt-3 text-sm text-muted-foreground">v{FED_SPECIAL.revision} · {FED_SPECIAL.versionDate} · {fedSpecialPhase(now) === "PRE_MEETING" ? c.status : c.review}</p>
      <p className="mt-2 text-sm text-muted-foreground">{c.timing}</p>
    </header>
    <p className="mt-6 leading-7">{c.intro}</p>
    <p className="mt-4 rounded-xl border border-border p-4 text-sm leading-6 text-muted-foreground">{c.snapshot}</p>
    {canRead ? <article data-fed-full className="mt-8 space-y-7">
      {c.sections.map(section => <section key={section.title}><h2 className="text-xl font-semibold">{section.title}</h2><p className="mt-3 whitespace-pre-line leading-8 text-muted-foreground">{section.body}</p></section>)}
      <section className="rounded-2xl border border-violet-400/30 bg-violet-500/5 p-5"><h2 className="text-xl font-semibold">{c.rulesTitle}</h2><ul className="mt-3 list-disc space-y-3 pl-5 leading-7">{c.rules.map(rule => <li key={rule}>{rule}</li>)}</ul></section>
    </article> : <section data-fed-gate className="mt-8 rounded-2xl border border-border p-6">
      <h2 className="text-xl font-semibold">{c.register}</h2><p className="mt-3 leading-7 text-muted-foreground">{c.outline}</p>
      <div className="mt-5 flex flex-wrap gap-4"><Link className="inline-flex min-h-11 items-center rounded-xl bg-amber-300 px-5 font-semibold text-black" href={`${prefix}/register?next=${next}`}>{c.register}</Link><Link className="inline-flex min-h-11 items-center underline" href={`${prefix}/login?next=${next}`}>{c.login}</Link></div>
    </section>}
    <footer className="mt-8 space-y-4 border-t border-border pt-6 text-sm leading-6 text-muted-foreground">
      <p>{c.footer}</p><Link className="inline-flex min-h-11 items-center text-amber-300 underline" href={`${prefix}/verification`}>{c.further}</Link>
      <details><summary className="cursor-pointer">{c.sources}</summary><ul className="mt-3 space-y-2">{FED_SPECIAL.sources.map(source => <li key={source.url}><a className="break-words underline" href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></li>)}</ul></details>
    </footer>
  </main>;
}
