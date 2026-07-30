import { SectionHeader } from "@/components/home/SectionHeader";
import { Text } from "@/components/ui";

/** Shown when member tomorrow forecast is disabled for MVP. */
export function MemberForecastTeaser() {
  return (
    <section className="border-t border-border/[0.06] py-8">
      <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="会员功能"
          title="下一交易日预测"
          subtitle="会员下一交易日预测功能筹备中，暂不开放。"
        />
        <Text variant="caption" color="tertiary">
          支付与会员自动开通功能验收完成后将恢复。
        </Text>
      </div>
    </section>
  );
}
