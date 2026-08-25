import { Badge, Card, Heading, Text } from "@/components/ui";
import {
  LIUYAO_HORIZON_RULES,
  LIUYAO_QUARTER_TRIGGER_RULES,
  LIUYAO_HORIZON_POLICY_VERSION,
} from "@/lib/research/liuyao-horizon-policy";

export function LiuyaoCadenceGuide() {
  return (
    <Card padding="lg" className="border border-cyan-300/15 bg-cyan-300/[0.035]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Heading as="h2" size="h3">六爻固定周期体系</Heading>
          <Text variant="body-sm" color="secondary" className="mt-2 block max-w-3xl leading-relaxed">
            固定主干为“年卦定大环境、月卦定阶段、周卦锁定本周方向”。季卦保留为按需桥接层，不要求每个季度都算，也不作为日常缺卦报警。日分析直接拆周卦，不另起日卦。
          </Text>
        </div>
        <Badge variant="outline">{LIUYAO_HORIZON_POLICY_VERSION}</Badge>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {LIUYAO_HORIZON_RULES.map((rule) => (
          <div key={rule.kind} className="rounded-xl border border-white/[0.08] bg-black/15 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Text variant="body-sm" weight="semibold">{rule.order}. {rule.labelZh}</Text>
              <Badge variant={rule.kind === "QUARTER" ? "warning" : rule.kind === "WEEK" ? "success" : "outline"}>
                {rule.requirementLabelZh}
              </Badge>
            </div>
            <Text variant="body-sm" color="secondary" className="mt-2 block leading-relaxed">{rule.roleZh}</Text>
            <Text variant="caption" color="tertiary" className="mt-2 block">频率：{rule.refreshZh}</Text>
            <Text variant="caption" className="mt-2 block font-mono text-cyan-100">文件夹：{rule.fileNameTemplate}</Text>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/[0.035] p-4">
        <Text variant="body-sm" weight="semibold">什么情况下才补季卦</Text>
        <div className="mt-2 grid gap-1.5 md:grid-cols-2">
          {LIUYAO_QUARTER_TRIGGER_RULES.map((rule) => (
            <Text key={rule} variant="caption" color="secondary">• {rule}</Text>
          ))}
        </div>
      </div>

      <Text variant="caption" color="tertiary" className="mt-4 block leading-relaxed">
        每个文件夹建议固定放：01原盘截图、02问题与起卦时间、03老师原文或课程笔记（如有）、04补充说明。老师卦与自己起卦必须分开保存，不能混成一个来源。
      </Text>
    </Card>
  );
}
