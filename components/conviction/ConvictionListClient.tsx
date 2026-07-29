"use client";

import Link from "next/link";
import { Badge, Button, Heading, Text } from "@/components/ui";
import { formatMarketCapDisplay } from "@/lib/data/conviction/format-market-cap";
import { formatDateChina } from "@/lib/utils/datetime";
import type { ConvictionListPagePayload } from "@/lib/data/conviction/access";
import type { ConvictionPublicCard } from "@/types/conviction-asset";

function AssetTypeBadge({ type }: { type: ConvictionPublicCard["assetType"] }) {
  const label =
    type === "STOCK"
      ? "Stock"
      : type === "CRYPTO"
        ? "Crypto"
        : type === "ETF"
          ? "ETF"
          : type === "INDEX"
            ? "Index"
            : "Commodity";
  return (
    <Badge variant="outline" className="border-white/15 bg-white/[0.03] font-mono text-caption text-white/70">
      {label}
    </Badge>
  );
}

function PublicAssetCard({
  card,
  mode,
}: {
  card: ConvictionPublicCard;
  mode: ConvictionListPagePayload["mode"];
}) {
  const grade = card.rating.includes("+") ? "A+" : card.rating.startsWith("A") ? "A" : "B";
  const riskBucket = card.riskLevel === "低" ? "Low" : card.riskLevel === "中" ? "Medium" : "High";
  const mcap = formatMarketCapDisplay(card);
  const primaryHref = card.detailHref;
  const locked = mode === "publicOnly";
  const lockedHref = "/pricing";
  const primaryLabel = locked ? "查看完整研究" : "查看完整研究";

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c0e12]">
      <div className="border-b border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap gap-2">
              <AssetTypeBadge type={card.assetType} />
              <Badge variant="outline" className="border-amber-500/30 text-amber-300/90">
                MOOX评级 {grade}
              </Badge>
              <Badge variant="outline" className="border-red-500/25 text-red-300/80">
                Risk {riskBucket}
              </Badge>
              <Badge variant="outline" className="border-emerald-500/20 text-emerald-300/80">
                {card.researchStatusZh}
              </Badge>
            </div>
            <Heading as="h2" size="h3" className="text-white">
              {card.slug === "asteroid" ? (
                <>太空狗</>
              ) : (
                <>
                  {card.nameZh}
                  {card.nameEn && card.nameEn !== card.nameZh ? (
                    <span className="ml-2 text-body font-normal text-white/45">{card.nameEn}</span>
                  ) : null}
                </>
              )}
            </Heading>
            <p className="font-mono text-body-sm text-white/50">
              代码：{card.symbol}
              {" · "}
              {card.exchange ? `交易所：${card.exchange}` : card.network ? `网络：${card.network}` : ""}
            </p>
            <div className="flex flex-wrap gap-3 text-caption text-white/40">
              <span>Updated：{formatDateChina(card.researchUpdatedAt)}</span>
              <span>Version：v1</span>
              <span>{locked ? "Locked：YES" : "Locked：NO"}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {card.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="border-white/15 bg-white/[0.03] font-mono text-caption text-white/70"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-5 py-5 sm:px-6">
        <section>
          <h3 className="font-mono text-caption uppercase tracking-[0.16em] text-white/40">基本面简介</h3>
          <p className="mt-2 text-body-sm leading-relaxed text-white/75">{card.summaryZh}</p>
        </section>

        {mcap ? (
          <section>
            <h3 className="font-mono text-caption uppercase tracking-[0.16em] text-white/40">市值</h3>
            <p className="mt-2 text-body-sm text-white/75">{mcap.labelZh}</p>
            {mcap.updatedAt ? (
              <p className="mt-1 text-caption text-white/40">
                更新时间：{formatDateChina(mcap.updatedAt)}
              </p>
            ) : null}
          </section>
        ) : null}

        {card.contractAddress ? (
          <section>
            <h3 className="font-mono text-caption uppercase tracking-[0.16em] text-white/40">合约地址</h3>
            <p className="mt-2 break-all font-mono text-caption text-white/70">{card.contractAddress}</p>
          </section>
        ) : card.contractPendingAdminConfirm ? (
          <p className="rounded-md border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-caption text-amber-200/80">
            合约信息待管理员确认
          </p>
        ) : null}

        <section>
          <h3 className="font-mono text-caption uppercase tracking-[0.16em] text-white/40">公开研究内容</h3>
          <div className="mt-3 space-y-3">
            <div>
              <h4 className="text-caption text-white/55">为什么关注</h4>
              <div className="mt-2">
                <p className="text-caption text-white/35">产业趋势</p>
                <ul className="mt-2 space-y-2">
                  {card.thesisZh.slice(0, 3).map((line) => (
                    <li key={line} className="flex gap-2 text-body-sm text-white/75">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/35" aria-hidden />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-3">
                <p className="text-caption text-white/35">关注逻辑</p>
                <ol className="mt-2 space-y-2 pl-5">
                  {card.thesisZh.map((line, idx) => (
                    <li key={line} className="list-decimal text-body-sm text-white/75">
                      {idx + 1}. {line}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="font-mono text-caption uppercase tracking-[0.16em] text-white/40">催化剂</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {card.catalystsZh.map((c) => (
              <Badge key={c} variant="outline" className="border-white/12 text-white/70">
                {c}
              </Badge>
            ))}
          </div>
        </section>

        <section>
          <h3 className="font-mono text-caption uppercase tracking-[0.16em] text-white/40">风险</h3>
          <ul className="mt-2 space-y-1.5">
            {card.risksZh.map((r) => (
              <li key={r} className="text-body-sm text-white/65">
                · {r}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-auto rounded-lg border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-transparent p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-body-sm font-medium text-white/85">MOOX Member Research</p>
            {locked ? <p className="text-caption text-white/45">🔒 Members Only</p> : <p className="text-caption text-emerald-300/70">已解锁</p>}
          </div>
          <ul className="mt-3 space-y-1.5 text-caption text-white/55">
            {[
              "今日分析",
              "下一交易日",
              "本周路径",
              "关键价格",
              "AI分析",
              "Master I Ching分析",
              "Wave分析",
              "历史验证",
            ].map((label) => (
              <li key={label} className="flex items-center gap-2">
                {locked ? <span aria-hidden className="text-white/45">🔒</span> : <span aria-hidden className="text-emerald-300/70">✓</span>}
                <span>{label} · {locked ? "锁定" : "可见"}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href={locked ? lockedHref : primaryHref}>{primaryLabel}</Link>
            </Button>
          </div>
        </section>
      </div>
    </article>
  );
}

export function ConvictionListClient({ payload }: { payload: ConvictionListPagePayload }) {
  return (
    <div className="min-h-screen bg-[#07080a] text-white">
      <div className="mx-auto w-full max-w-[1240px] px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-20 lg:pt-10">
        <header className="max-w-3xl border-b border-white/[0.08] pb-8">
          <p className="font-mono text-caption uppercase tracking-[0.22em] text-white/40">MOOX Conviction Assets</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            MOOX Conviction Assets
          </h1>
          <p className="mt-2 text-body text-white/55">
            A curated list of assets under continuous MOOX research. / MOOX持续研究和验证的重点资产。
          </p>
          <p className="mt-2 text-body-sm text-white/45">MOOX重点关注资产</p>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-body-sm text-white/65">
            <p>
              当前跟踪：<span className="text-white">{payload.trackedCount}</span> 项资产
            </p>
            {payload.latestResearchUpdatedAt ? (
              <p>
                最近研究更新：
                <span className="text-white">{formatDateChina(payload.latestResearchUpdatedAt)}</span>
              </p>
            ) : null}
            <p>研究原则：公开基本面，会员查看完整预测。</p>
          </div>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {payload.cards.map((card) => (
            <PublicAssetCard
              key={card.id}
              card={card}
              mode={payload.mode}
            />
          ))}
        </div>

        {payload.cards.length === 0 ? (
          <Text variant="body-sm" className="mt-8 text-white/55">
            暂无已发布的重点关注资产。
          </Text>
        ) : null}

        <footer className="mt-12 border-t border-white/[0.08] pt-6">
          <p className="max-w-3xl text-caption leading-relaxed text-white/40">
            MoonX提供的是市场研究、概率预测和长期跟踪观点。所有内容仅供研究参考，不构成任何投资建议。
          </p>
        </footer>
      </div>
    </div>
  );
}
