import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Button, Card, Heading, Section, Text } from "@/components/ui";
import { TermHelp } from "@/components/education/TermHelp";
import { englishPath } from "@/lib/i18n/config";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: "/guide",
    titleZh: "MOOX新手指南",
    titleEn: "MOOX Beginner Guide",
    descriptionZh: "快速了解MOOX先看哪里、方向与点位怎么配合、信心星级和失效条件如何阅读。",
    descriptionEn: "A concise guide to MOOX direction, confidence, execution levels, invalidation and verification.",
  });
}

const QUESTIONS_ZH = [
  { title: "一个月、一周、一天分别看什么？", body: "月度看大方向与关键日期；周度看阶段机会与风险；日度看价格是否到达支撑、压力或确认位置。短线反弹不等于长线转涨。" },
  { title: "看涨之后，能直接买吗？", body: "不能只凭方向追涨。先看当前价格离压力位多近、入场条件是否满足，以及判断失效时如何控制风险。没有合适位置就等待。" },
  { title: "星级代表什么？", body: "表示方法之间的一致程度，不代表上涨幅度。五星可以看涨，也可以看跌。" },
  { title: "什么时候执行？", body: "方向提前锁定，价格和结构达到确认条件后才执行；没有合适位置就等待。" },
  { title: "怎么判断是否可靠？", body: "到历史验证查看连续样本。六爻、奇门、共振样本和量化交易结果分别留档，不只展示正确案例。" },
] as const;

const QUESTIONS_EN = [
  { title: "What should I read each month, week and day?", body: "Monthly research gives the bigger picture and key dates. Weekly research highlights opportunities and risks. Daily levels help you evaluate a setup. A short-term bounce does not establish a long-term uptrend." },
  { title: "Does a bullish view mean buy now?", body: "No. Check nearby resistance, entry conditions and what would invalidate the setup. A market outlook is not an immediate trade instruction. If the setup is unsuitable, wait." },
  { title: "What do stars mean?", body: "Stars show agreement across methods, not upside magnitude. Five stars can be bullish or bearish." },
  { title: "When is execution allowed?", body: "Direction is researched first; execution waits for price and structure confirmation. No suitable location means no trade." },
  { title: "How is reliability judged?", body: "Use Verification to review continuous samples. Liu Yao, Qimen, resonance and quant-trading outcomes are kept separately." },
] as const;

const GLOSSARY_ZH = [
  ["方向", "当前最主要的行情判断。"],
  ["信心星级", "不同方法的一致程度，不是涨幅。"],
  ["运行路径", "行情可能先怎么走、后怎么走。"],
  ["关键支撑／压力", "等待入场、减仓或止盈的位置。"],
  ["失效条件", "原计划不再成立的明确条件。"],
  ["共振", "六爻、奇门或其他周期证据同向。"],
] as const;

const GLOSSARY_EN = [
  ["Direction", "The primary market view."],
  ["Confidence stars", "Agreement across methods, not expected return."],
  ["Expected path", "The likely sequence of market moves."],
  ["Support / resistance", "Locations for entry, reduction or profit-taking."],
  ["Invalidation", "The explicit condition that ends the original plan."],
  ["Resonance", "Liu Yao, Qimen or other horizon evidence points the same way."],
] as const;

export default async function GuidePage() {
  const locale = await getRequestLocale();
  const en = locale === "en";
  const href = (path: string) => en ? englishPath(path) : path;
  const questions = en ? QUESTIONS_EN : QUESTIONS_ZH;
  const glossary = en ? GLOSSARY_EN : GLOSSARY_ZH;

  return <main><Section spacing="lg"><div className="mx-auto w-full max-w-5xl space-y-8">
    <div className="max-w-3xl">
      <Badge variant="default">{en ? "Beginner Guide" : "新手指南"}</Badge>
      <Heading as="h1" size="h2" className="mt-3">{en ? "Read the conclusion first" : "先看结论，再看位置"}</Heading>
      <Text variant="body" color="secondary" className="mt-3 block">{en ? "Choose your timeframe. Check the price levels. Know when to step back." : "先选周期，再看位置，最后明确什么情况下不再做。"}</Text>
    </div>

    <Card padding="lg" className="border-primary/20 bg-primary/[0.025]">
      <Heading as="h2" size="h3">{en ? "Recommended reading order" : "推荐阅读顺序"}</Heading>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {[
          { title: en ? "1. Review the record" : "1. 看预测回顾", body: en ? "Start with public results" : "先了解实际表现", path: "/verification" },
          { title: en ? "2. Try daily views" : "2. 体验今日观点", body: en ? "Free after the daily release" : "每日开放后免费查看", path: "/member/daily" },
          { title: en ? "3. Compare membership" : "3. 比较会员权益", body: en ? "Decide if you need more detail" : "按需要解锁详细研究", path: "/pricing" },
          { title: en ? "4. Plan your week" : "4. 制定每周计划", body: en ? "Member outlook and risks" : "会员周度展望与风险", path: "/member/weekly" },
        ].map(({ title, body, path }) => <Link key={path} href={href(path)} className="rounded-xl border border-border/[0.1] p-4 transition-colors hover:border-primary/30 hover:bg-primary/[0.02]"><Text variant="body-sm" weight="semibold">{title}</Text><Text variant="caption" color="secondary" className="mt-2 block">{body}</Text></Link>)}
      </div>
    </Card>

    <div>
      <Heading as="h2" size="h3">{en ? "Five essentials" : "五个核心问题"}</Heading>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {questions.map((item, index) => <Card key={item.title} padding="lg" className={index === questions.length - 1 ? "md:col-span-2" : undefined}><Text variant="body" weight="semibold">{item.title}</Text><Text variant="body-sm" color="secondary" className="mt-2 block">{item.body}</Text></Card>)}
      </div>
    </div>

    <div>
      <Heading as="h2" size="h3">{en ? "Terms on forecast cards" : "预测卡片怎么读"}</Heading>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {glossary.map(([term, explanation]) => <Card key={term} padding="md"><Text variant="body-sm" weight="semibold"><TermHelp explanation={explanation}>{term}</TermHelp></Text><Text variant="caption" color="secondary" className="mt-2 block">{explanation}</Text></Card>)}
      </div>
    </div>

    <Card padding="lg">
      <Heading as="h2" size="h3">{en ? "Three mistakes to avoid" : "三个常见错误"}</Heading>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {(en ? [
          ["Chasing a label", "Bullish or bearish is not an immediate order."],
          ["Ignoring the horizon", "Daily views should be read inside weekly and monthly context."],
          ["Defending an invalid plan", "Once invalidation appears, execution must stop or reduce risk."],
        ] : [
          ["看到涨跌就追单", "方向不是立即下单指令。"],
          ["忽略周期背景", "日度判断要放进周度和月度环境中理解。"],
          ["失效后仍硬扛", "触发失效条件后先停止执行或降低风险。"],
        ]).map(([title, body]) => <div key={title} className="rounded-lg border border-border/[0.08] p-3"><Text variant="body-sm" weight="semibold">{title}</Text><Text variant="caption" color="secondary" className="mt-1 block">{body}</Text></div>)}
      </div>
    </Card>

    <div className="flex flex-wrap gap-3"><Button asChild variant="primary"><Link href={href(`/register?next=${encodeURIComponent(href("/member/daily"))}`)}>{en ? "Create a free account" : "免费注册体验"}</Link></Button><Button asChild variant="outline"><Link href={href("/pricing")}>{en ? "Compare membership" : "比较会员权益"}</Link></Button></div>
    <Text variant="caption" color="tertiary">{en ? "Research and scenario analysis only. Not investment advice." : "所有内容仅供研究参考，不构成投资建议。"}</Text>
  </div></Section></main>;
}
