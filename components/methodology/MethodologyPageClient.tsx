"use client";

import Link from "next/link";
import { Badge, Card, Heading, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { ALLOWED_FORMAL_DIRECTIONS } from "@/lib/forecasts/formal-direction";
import type { MethodologyModule } from "@/lib/methodology/types";

const FLOW_ZH = [
  "数据与研究输入",
  "各模块独立判断",
  "历史表现调整权重",
  "形成方向与概率",
  "锁定关键价位和路径",
  "发布后不可直接修改",
  "市场结束后验证",
];

const FLOW_EN = [
  "Data & research inputs",
  "Independent module views",
  "Weights adjusted by history",
  "Direction & probabilities",
  "Lock levels & path",
  "No silent post-publish edits",
  "Verify after the session",
];

const OUTPUT_ZH = [
  "预测方向",
  "上涨／震荡／下跌概率",
  "预计运行路径",
  "关键支撑与压力",
  "确认位与失效位",
  "风险等级",
  "主要催化因素与风险",
];

const OUTPUT_EN = [
  "Direction",
  "Up / sideways / down probabilities",
  "Expected path",
  "Key support & resistance",
  "Confirmation & invalidation",
  "Risk level",
  "Catalysts & risks",
];

function SectionBlock({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 border-t border-border/[0.08] pt-10">
      <div className="max-w-2xl space-y-2">
        <Heading as="h2" size="h3">
          {title}
        </Heading>
        <Text variant="body-sm" color="secondary" className="block">
          {lead}
        </Text>
      </div>
      {children}
    </section>
  );
}

export function MethodologyPageClient({ modules }: { modules: MethodologyModule[] }) {
  const { locale } = useLocale();
  const zh = locale.startsWith("zh");
  const flow = zh ? FLOW_ZH : FLOW_EN;
  const outputs = zh ? OUTPUT_ZH : OUTPUT_EN;

  return (
    <div className="mx-auto w-full max-w-container space-y-2 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <Badge variant="outline" className="mb-3">
        {zh ? "预测方法" : "Methodology"}
      </Badge>
      <Heading as="h1" size="h2" className="max-w-3xl">
        {zh ? "MOOX的预测如何形成" : "How MOOX Forecasts Are Built"}
      </Heading>
      <Text variant="body" color="secondary" className="mt-3 block max-w-3xl">
        {zh
          ? "MOOX不是依靠单一指标判断市场，而是将多个独立分析维度进行组合，并通过持续验证调整各维度的影响力。"
          : "MOOX combines multiple independent research inputs and continuously adjusts their influence through historical validation."}
      </Text>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {(zh
          ? [
              ["提前发布", "预测在对应市场结果发生前发布。"],
              ["结果锁定", "发布后生成版本号与锁定时间；锁定后的历史预测不能直接修改。"],
              ["公开验证", "市场结束后按实际走势验证；正确与错误记录都会保留。"],
            ]
          : [
              ["Publish first", "Forecasts are published before the market outcome."],
              ["Lock results", "Each release gets a version and lock time; locked history is not silently overwritten."],
              ["Verify in public", "After the session, outcomes are verified; hits and misses are kept."],
            ]
        ).map(([title, body]) => (
          <Card key={title} padding="md" className="space-y-2">
            <Text variant="body" weight="semibold">
              {title}
            </Text>
            <Text variant="body-sm" color="secondary">
              {body}
            </Text>
          </Card>
        ))}
      </div>

      <SectionBlock
        title={zh ? "从多个观点到最终预测" : "From modules to a final forecast"}
        lead={
          zh
            ? "综合流程把独立研究输入收敛为可验证的正式预测。"
            : "The pipeline converges independent inputs into a verifiable formal forecast."
        }
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
          {flow.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <Card padding="sm" className="min-w-0 flex-1 lg:flex-none">
                <Text variant="caption" className="block text-foreground">
                  {i + 1}. {step}
                </Text>
              </Card>
              {i < flow.length - 1 ? (
                <span className="hidden text-foreground-tertiary lg:inline" aria-hidden>
                  →
                </span>
              ) : null}
            </div>
          ))}
        </div>
        <Card padding="md" className="mt-4 space-y-2">
          <Text variant="body-sm" weight="semibold">
            {zh ? "每个市场最终输出可包括" : "Each market output may include"}
          </Text>
          <ul className="grid gap-1 sm:grid-cols-2">
            {outputs.map((item) => (
              <li key={item} className="text-caption text-foreground-secondary">
                · {item}
              </li>
            ))}
          </ul>
          <Text variant="caption" color="tertiary" className="block pt-2">
            {zh ? "正式方向仅使用：" : "Formal directions only:"}{" "}
            {ALLOWED_FORMAL_DIRECTIONS.join(zh ? "、" : ", ")}
          </Text>
        </Card>
      </SectionBlock>

      <SectionBlock
        title={zh ? "当前启用的分析模块" : "Active research modules"}
        lead={
          zh
            ? "以下仅展示系统当前启用并向公众说明的模块；未上线能力不会出现在此列表。"
            : "Only modules that are enabled and approved for public disclosure are listed."
        }
      >
        {modules.length === 0 ? (
          <Text variant="body-sm" color="secondary">
            {zh ? "暂无已公开的分析模块说明。" : "No public modules are configured yet."}
          </Text>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {modules.map((m) => (
              <Card key={m.id} padding="md" className="space-y-2">
                <Text variant="body" weight="semibold">
                  {zh ? m.nameZh : m.nameEn}
                </Text>
                <Text variant="body-sm" color="secondary">
                  {zh ? m.summaryZh : m.summaryEn}
                </Text>
                <Text variant="caption" color="tertiary" className="block">
                  {zh ? "权重说明：" : "Weight note: "}
                  {(zh ? m.weightRangeZh : m.weightRangeEn) ||
                    (zh ? "根据历史验证动态调整" : "Dynamically adjusted by historical validation")}
                </Text>
              </Card>
            ))}
          </div>
        )}
      </SectionBlock>

      <SectionBlock
        title={zh ? "权重不是固定不变的" : "Weights are not fixed"}
        lead={
          zh
            ? "不同模块的影响力会随验证结果与市场状态变化；页面不公开完整专有公式。"
            : "Module influence changes with validation and market regime; proprietary formulas are not published."
        }
      >
        <ul className="grid gap-2 text-body-sm text-foreground-secondary sm:grid-cols-2">
          {(zh
            ? [
                "对该市场的历史命中表现",
                "当前样本数量",
                "最近表现",
                "当前价格是否接近关键位置",
                "数据是否完整和新鲜",
                "当前市场环境是否适合该分析方法",
              ]
            : [
                "Historical hit rate for that market",
                "Sample size",
                "Recent performance",
                "Proximity to key levels",
                "Data completeness and freshness",
                "Whether the regime fits the method",
              ]
          ).map((item) => (
            <li key={item} className="rounded-md border border-border/[0.08] px-3 py-2">
              · {item}
            </li>
          ))}
        </ul>
      </SectionBlock>

      <SectionBlock
        title={zh ? "预测如何验证" : "How forecasts are verified"}
        lead={
          zh
            ? "MOOX不会只用收盘涨跌判断全部预测。"
            : "MOOX does not score every forecast by close-to-close alone."
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Card padding="md" className="space-y-2">
            <Text variant="body-sm" weight="semibold">
              {zh ? "验证时综合考虑" : "Verification considers"}
            </Text>
            <ul className="space-y-1 text-caption text-foreground-secondary">
              {(zh
                ? [
                    "预测方向是否正确",
                    "主要路径是否出现",
                    "关键支撑和压力是否有效",
                    "确认位或失效位是否触发",
                    "预测时间窗口是否匹配",
                    "是否发生使预测失效的重大事件",
                  ]
                : [
                    "Direction accuracy",
                    "Whether the main path appeared",
                    "Support / resistance validity",
                    "Confirmation or invalidation triggers",
                    "Time-window fit",
                    "Material events that void the setup",
                  ]
              ).map((x) => (
                <li key={x}>· {x}</li>
              ))}
            </ul>
          </Card>
          <Card padding="md" className="space-y-2">
            <Text variant="body-sm" weight="semibold">
              {zh ? "验证结果" : "Outcomes"}
            </Text>
            <Text variant="body-sm" color="secondary">
              {zh
                ? "命中、部分命中、未命中、无效。无效仅用于停牌、数据异常、不可抗力或发布前条件已失效等情况，不能把普通预测错误标为无效。"
                : "Hit, partial hit, miss, or void. Void is reserved for halted sessions, bad data, force majeure, or pre-release invalidation — ordinary misses are not voided."}
            </Text>
          </Card>
        </div>
      </SectionBlock>

      <SectionBlock
        title={zh ? "版本与锁定机制" : "Versioning & locks"}
        lead={
          zh
            ? "正式预测应保留可追溯的版本链；调整必须新建版本，不能覆盖 V1。"
            : "Formal forecasts keep an auditable version chain; revisions create V2/V3 instead of overwriting V1."
        }
      >
        <Card padding="md">
          <ul className="grid gap-1 text-caption text-foreground-secondary sm:grid-cols-2">
            {(zh
              ? [
                  "Prediction ID",
                  "预测日期与发布时间",
                  "版本号与锁定时间",
                  "市场与原始方向／概率",
                  "原始关键价位",
                  "验证结果与验证时间",
                ]
              : [
                  "Prediction ID",
                  "Forecast date & publish time",
                  "Version & lock time",
                  "Market & original direction / probabilities",
                  "Original key levels",
                  "Verification result & time",
                ]
            ).map((x) => (
              <li key={x}>· {x}</li>
            ))}
          </ul>
          <Text variant="caption" color="tertiary" className="mt-3 block">
            {zh
              ? "公开历史准确率只统计最终验证规则认可的正式版本。"
              : "Public track record counts only formal versions accepted by verification rules."}
          </Text>
        </Card>
      </SectionBlock>

      <SectionBlock
        title={zh ? "MOOX不提供确定性承诺" : "What MOOX does not claim"}
        lead={
          zh
            ? "MOOX提供的是市场研究和概率判断，不构成投资建议。"
            : "MOOX provides research and probabilistic views — not investment advice."
        }
      >
        <ul className="grid gap-2 text-body-sm text-foreground-secondary sm:grid-cols-2">
          {(zh
            ? [
                "不承诺稳赚",
                "不承诺固定收益",
                "不删除错误预测",
                "不在市场结果出来后修改原始版本",
                "不把单一分析方法包装成绝对答案",
                "不把概率预测描述成交易指令",
              ]
            : [
                "No guaranteed profits",
                "No fixed-return promises",
                "No deletion of wrong forecasts",
                "No silent edits after outcomes",
                "No single method as absolute truth",
                "No probability framed as a trade order",
              ]
          ).map((x) => (
            <li key={x} className="rounded-md border border-border/[0.08] px-3 py-2">
              · {x}
            </li>
          ))}
        </ul>
        <Text variant="caption" color="tertiary" className="mt-4 block">
          <Link href="/verification" className="text-primary underline-offset-2 hover:underline">
            {zh ? "查看历史准确率" : "View track record"}
          </Link>
          {" · "}
          <Link href="/terms" className="text-primary underline-offset-2 hover:underline">
            {zh ? "服务条款" : "Terms"}
          </Link>
        </Text>
      </SectionBlock>
    </div>
  );
}
