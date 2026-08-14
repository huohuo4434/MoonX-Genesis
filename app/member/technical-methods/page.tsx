import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { getAccessUser } from "@/lib/auth/get-access-user";

export const metadata = {
  title: "技术执行老师｜MOOX会员研究",
  description: "会员专享：缠论、乔乔技术执行与八字周期辅助。技术只负责找点，不修改六爻主方向。",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function MethodCard(props: {
  title: string;
  role: string;
  items: string[];
  output: string;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-lg font-semibold text-white">{props.title}</div>
      <div className="mt-1 text-sm text-violet-300">{props.role}</div>
      <ul className="mt-4 space-y-2 text-sm leading-6 text-zinc-300">
        {props.items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
      <div className="mt-4 rounded-xl border border-violet-400/20 bg-violet-400/[0.06] p-3 text-sm text-zinc-200">
        输出：{props.output}
      </div>
    </section>
  );
}

export default async function MemberTechnicalMethodsPage() {
  noStore();
  const access = await getAccessUser();
  if (!access.authenticated) redirect("/login?next=/member/technical-methods");
  if (!access.isAdmin && !access.isActiveMember) redirect("/account/membership");

  const gate = await getMemberDevicePageAccess();
  if (gate.status === "DEVICE_REQUIRED") {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <MemberDeviceGate decision={gate.device} nextPath="/member/technical-methods" />
      </main>
    );
  }

  return (
    <>
      <MemberDeviceHeartbeat />
      <main className="mx-auto max-w-6xl px-4 py-10 text-zinc-100">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">MOOX MEMBER EXECUTION LAB</div>
            <h1 className="mt-2 text-3xl font-bold">技术执行老师</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
              六爻/玄学负责确定交易方向；缠论、乔乔技术体系和八字周期辅助只负责优化入场、卖点、止损与时间窗口，不能反向修改已经锁定的玄学方向。
            </p>
          </div>
          <div className="flex gap-2 text-sm">
            <Link href="/member/founder-cycle" className="rounded-full border border-amber-300/20 px-4 py-2 text-amber-200 hover:bg-amber-300/5">创始人周期</Link>
            <Link href="/member/alpha-feed" className="rounded-full border border-white/15 px-4 py-2 hover:bg-white/5">本周精选5</Link>
            <Link href="/member/weekly" className="rounded-full border border-white/15 px-4 py-2 hover:bg-white/5">周度研究</Link>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <MethodCard
            title="高山说缠｜缠论"
            role="多级别结构与买卖点定位"
            items={[
              "先看日线/4H大级别结构，再下钻1H/30m中枢与线段，最后用5m/15m寻找具体执行点。",
              "重点检查笔、线段、中枢上下沿、背驰与走势终完美，避免结构未完成时抢跑。",
              "方向看涨时不因为短线回落改空；只判断当前是追涨、等待回踩，还是进入一/二/三类买点。",
            ]}
            output="结构状态 / 中枢区间 / 背驰证据 / 理想买点 / 失效条件"
          />
          <MethodCard
            title="乔乔｜技术执行"
            role="高胜率支撑确认与风控"
            items={[
              "高斜率连续拉升不追，优先等待第一支撑的右侧止跌确认；支撑失守则下移到第二支撑。",
              "结合资金费率、ETF流入流出、筹码分布、短期持有者成本与市场成本带判断买点质量。",
              "技术层只能决定在哪里买、哪里减仓、哪里止损，不能推翻六爻已经锁定的周/月方向。",
            ]}
            output="支撑/压力 / 右侧确认 / 追涨风险 / 止损 / 分批止盈"
          />
          <MethodCard
            title="大头老师｜八字周期"
            role="人物与长期周期背景辅助"
            items={[
              "出生时辰不确定时，优先用健康、学历、职业转折、重大盈亏年份反推候选命盘。",
              "用大运流年回测人物的重要阶段，并与其他术数交叉验证，不凭单一标签下结论。",
              "八字只用于人物状态、分析师可靠性和中长期时间背景，不直接生成股票/币的交易方向。",
            ]}
            output="长期周期背景 / 人物状态 / 关键年份 / 置信度备注"
          />
        </div>

        <section className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-5">
          <div className="font-semibold text-emerald-300">执行纪律</div>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            示例：六爻本周唯一方向看涨；缠论显示30分钟仍缺一段向下结构；乔乔体系要求等待第一支撑右侧企稳。最终结论应是“方向不改，但当前不是最优买点”，而不是因为技术短线偏弱把主方向改成看跌。
          </p>
        </section>
      </main>
    </>
  );
}
