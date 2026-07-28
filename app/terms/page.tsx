import type { Metadata } from "next";
import { Heading, Section, Text } from "@/components/ui";

export const metadata: Metadata = {
  title: "服务条款",
  description: "MoonX 服务条款：会员权益、USDT 付款与人工审核说明。",
};

const UPDATED = "2026年7月29日";

export default function TermsPage() {
  return (
    <main>
      <Section spacing="lg" className="mx-auto max-w-2xl">
        <Heading as="h1" size="h2">
          服务条款
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-3 block">
          使用 MoonX 服务，即表示您同意以下条款。
        </Text>

        <div className="mt-8 space-y-8 text-body-sm text-foreground-secondary">
          <section className="space-y-2">
            <h2 className="text-body font-semibold text-foreground">服务性质</h2>
            <p>
              MoonX 提供市场方向、概率、运行路径与验证记录等信息内容，仅供参考。内容不构成投资建议、交易建议或收益保证。我们不保证预测准确率；历史表现不代表未来结果。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-foreground">会员权益</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>提前查看下一交易日完整预测</li>
              <li>查看本周整体行情分析</li>
              <li>查看关键支撑、关键压力和失效价格</li>
              <li>查看会员福利股长鑫科技的今日、明日和本周分析</li>
              <li>查看会员专属个股验证记录</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-foreground">付款方式</h2>
            <p>
              用户注册立即完成。开通付费会员时，请选择套餐，使用 USDT（TRC20 或 BEP20）转账至指定收款地址，并提交交易哈希。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-foreground">人工审核</h2>
            <p>
              付款信息由管理员人工核对。只有审核通过后，会员权限才会生效。提交哈希不等于付款审核通过。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-foreground">错误网络或币种</h2>
            <p>
              请在付款前仔细核对网络、币种、金额与收款地址。错误网络、错误币种、金额不足或无法唯一匹配的付款可能导致审核失败或延误。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-foreground">退款与链上不可撤销</h2>
            <p>
              链上转账通常不可撤销。因用户自身填错地址、选错网络或币种导致的损失，MoonX 无法保证追回。经审核确认的有效付款，按对应套餐开通会员。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-foreground">账户责任</h2>
            <p>您有责任保管登录邮箱与密码。不得通过修改客户端或接口数据获取未授权权限。</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-foreground">禁止共享或转售</h2>
            <p>会员账号与内容仅供本人使用，禁止共享、转售、公开转发付费内容或用于商业再分发。</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-foreground">内容使用限制</h2>
            <p>未经书面许可，不得复制、爬取或批量转载 MoonX 付费内容。</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-foreground">服务中断</h2>
            <p>
              我们尽力保持服务可用，但不对因维护、第三方故障或不可抗力导致的短暂中断承担责任。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-foreground">风险声明</h2>
            <p>
              金融市场存在风险。您应根据自身情况独立判断，并自行承担交易与投资决策后果。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-foreground">条款更新</h2>
            <p>我们可能更新本条款。更新后继续使用服务，即视为接受修订内容。</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-foreground">联系方式</h2>
            <p>客服邮箱：jackzwin999@gmail.com</p>
            <p>最后更新：{UPDATED}</p>
          </section>
        </div>
      </Section>
    </main>
  );
}
