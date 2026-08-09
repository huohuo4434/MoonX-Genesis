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
    titleZh: "MOOX新手使用指南",
    titleEn: "MOOX Beginner Guide",
    descriptionZh: "1分钟了解MOOX先看哪里、预测卡片怎么读、什么时候可以交易以及判断失效后如何处理。",
    descriptionEn: "A one-minute guide to reading MOOX direction, path, confirmation, invalidation and public verification.",
  });
}

const QUESTIONS_ZH = [
  {
    title: "MOOX是什么？",
    body: "MOOX先用玄学研究给出唯一方向，再把运行路径、技术点位、风险控制和公开验证连接成一套可复盘流程。技术分析只负责位置，不拥有方向投票权。",
  },
  {
    title: "我每天先看哪里？",
    body: "先看“今日”了解当前方向，再看“周度”确认所处阶段，最后看“AI交易公开台”判断系统是否真正等到入场条件。",
  },
  {
    title: "预测卡片怎么读？",
    body: "第一步只看MOOX唯一方向；第二步看多周期是否共振；第三步才看技术点位与执行。概率是情景权重，不是历史命中率。",
  },
  {
    title: "什么时候可以交易？",
    body: "方向可以提前判断，但交易要等待价格和结构确认。预测看涨不代表立刻追涨，预测看跌也不代表立刻追空。",
  },
  {
    title: "判断错了怎么处理？",
    body: "技术风控位触发时先处理仓位和执行风险；是否修改MOOX方向，要等待新的玄学周期证据，而不是由单个价格位决定。",
  },
] as const;

const QUESTIONS_EN = [
  {
    title: "What is MOOX?",
    body: "MOOX is not a simple up-or-down call and does not promise profits. It connects direction, expected path, confirmation, levels, risk controls and public verification into one reviewable process.",
  },
  {
    title: "Where should I look first each day?",
    body: "Start with Today for the immediate bias, use Weekly to understand the current stage, then check the AI Strategy Desk to see whether entry conditions are actually confirmed.",
  },
  {
    title: "How do I read a forecast card?",
    body: "Read direction and expected path first, then confirmation and invalidation. Probabilities compare scenarios; they are not the historical hit rate.",
  },
  {
    title: "When is a trade allowed?",
    body: "Direction can be researched in advance, but execution waits for price and structure confirmation. Bullish does not mean buy now, and bearish does not mean short now.",
  },
  {
    title: "What happens when the view is wrong?",
    body: "When invalidation is triggered, stop defending the old view and wait for a new structure. Risk control and review matter more than proving a prediction right.",
  },
] as const;

const GLOSSARY_ZH = [
  ["方向", "当前最主要的行情情景。"],
  ["概率", "不同情景之间的相对权重，不是历史命中率。"],
  ["运行路径", "行情可能先怎么走、后怎么走。"],
  ["技术跟随参考", "用于选择更合适的执行位置，不负责决定多空方向。"],
  ["技术风控参考", "用于控制仓位风险；方向是否修订必须回到新的玄学证据。"],
  ["方法共识星级", "多种研究方法的一致程度，五星也可能是五星看跌。"],
  ["路径命中", "不仅方向正确，先后运行顺序也与原计划基本一致。"],
] as const;

const GLOSSARY_EN = [
  ["Direction", "The primary market scenario."],
  ["Probability", "Relative scenario weight, not the historical hit rate."],
  ["Expected path", "The possible order of market moves."],
  ["Confirmation", "The condition that makes the trading logic actionable."],
  ["Invalidation", "The condition that cancels the original view."],
  ["Method consensus", "Agreement across research methods; five stars can also be bearish."],
  ["Path hit", "Both the direction and the broad sequence matched the locked forecast."],
] as const;

export default async function GuidePage() {
  const locale = await getRequestLocale();
  const en = locale === "en";
  const href = (path: string) => en ? englishPath(path) : path;
  const questions = en ? QUESTIONS_EN : QUESTIONS_ZH;
  const glossary = en ? GLOSSARY_EN : GLOSSARY_ZH;

  return (
    <main>
      <Section spacing="lg">
        <div className="mx-auto w-full max-w-5xl space-y-8">
          <div className="max-w-3xl">
            <Badge variant="default">{en ? "1-minute guide" : "1分钟使用说明"}</Badge>
            <Heading as="h1" size="h2" className="mt-3">
              {en ? "Use MOOX without learning every research term" : "不懂六爻和奇门，也能正常使用MOOX"}
            </Heading>
            <Text variant="body" color="secondary" className="mt-3 block">
              {en
                ? "Remember only three steps: read the direction, wait for confirmation, and stop defending the view after invalidation."
                : "普通用户只需要记住三句话：先看方向，再等确认，失效就停止坚持。"}
            </Text>
          </div>

          <Card padding="lg" className="border-primary/20 bg-primary/[0.025]">
            <Heading as="h2" size="h3">{en ? "Your daily reading order" : "每天按照这个顺序看"}</Heading>
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              {[
                { title: en ? "1. Today" : "1. 今日", body: en ? "Current direction and path" : "当前方向和运行路径", path: "/#moonx-view" },
                { title: en ? "2. Weekly" : "2. 周度", body: en ? "The current stage of the week" : "这周处于哪个阶段", path: "/member/weekly" },
                { title: en ? "3. AI Strategy Desk" : "3. AI交易公开台", body: en ? "Whether entry is confirmed" : "是否真正等到入场条件", path: "/member/ai-trading" },
                { title: en ? "4. Verification" : "4. 历史验证", body: en ? "Review the continuous record" : "查看连续样本和复盘", path: "/verification" },
              ].map(({ title, body, path }) => (
                <Link key={path} href={href(path)} className="rounded-xl border border-border/[0.1] p-4 transition-colors hover:border-primary/30 hover:bg-primary/[0.02]">
                  <Text variant="body-sm" weight="semibold">{title}</Text>
                  <Text variant="caption" color="secondary" className="mt-2 block">{body}</Text>
                </Link>
              ))}
            </div>
          </Card>

          <div>
            <Heading as="h2" size="h3">{en ? "Five questions new users ask" : "新用户最常问的五个问题"}</Heading>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {questions.map((item, index) => (
                <Card key={item.title} padding="lg" className={index === questions.length - 1 ? "md:col-span-2" : undefined}>
                  <Text variant="body" weight="semibold">{item.title}</Text>
                  <Text variant="body-sm" color="secondary" className="mt-2 block">{item.body}</Text>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <Heading as="h2" size="h3">{en ? "Forecast terms" : "预测卡片里的词是什么意思"}</Heading>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {glossary.map(([term, explanation]) => (
                <Card key={term} padding="md">
                  <Text variant="body-sm" weight="semibold">
                    <TermHelp explanation={explanation}>{term}</TermHelp>
                  </Text>
                  <Text variant="caption" color="secondary" className="mt-2 block">{explanation}</Text>
                </Card>
              ))}
            </div>
          </div>

          <Card padding="lg">
            <Heading as="h2" size="h3">{en ? "Three common mistakes" : "最容易犯的三个错误"}</Heading>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {(en
                ? [
                    ["Chasing the headline", "A bullish or bearish label is not an immediate order."],
                    ["Ignoring the weekly stage", "Daily views should be interpreted inside the weekly path."],
                    ["Refusing invalidation", "When the invalidation condition appears, the original plan is over."],
                  ]
                : [
                    ["只看一句涨跌就追单", "看涨或看跌只是方向，不是立即下单指令。"],
                    ["不看周度背景", "日度判断最好放在周度运行阶段中理解。"],
                    ["忽略技术风控", "技术风控触发后先处理仓位；方向研究与交易执行分开复盘。"],
                  ]
              ).map(([title, body]) => (
                <div key={title} className="rounded-lg border border-border/[0.08] p-3">
                  <Text variant="body-sm" weight="semibold">{title}</Text>
                  <Text variant="caption" color="secondary" className="mt-1 block">{body}</Text>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="primary"><Link href={href("/#moonx-view")}>{en ? "View Today" : "开始查看今日"}</Link></Button>
            <Button asChild variant="outline"><Link href={href("/member/ai-trading")}>{en ? "Open AI Strategy Desk" : "查看AI交易公开台"}</Link></Button>
          </div>

          <Text variant="caption" color="tertiary">
            {en ? "Research and scenario analysis only. Not investment advice." : "所有内容仅供研究参考，不构成投资建议。"}
          </Text>
        </div>
      </Section>
    </main>
  );
}
