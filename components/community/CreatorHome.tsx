import Image from "next/image";
import Link from "next/link";
import { publicNotes } from "@/content/public-notes/market-tao-20260919";
import { mstrPathNote } from "@/content/public-notes/mstr-path-20260928";
import { cryptoRiskNote } from "@/content/public-notes/crypto-risk-20260925";
import { CreatorProfile } from "./CreatorProfile";

export function CreatorHome({ en }: { en: boolean }) {
  const prefix = en ? "/en" : "";
  const mstr = en ? mstrPathNote.en : mstrPathNote.zh;
  // Summaries come from dated publications, never generated prices or synthetic activity.
  const posts = [
    { id: mstrPathNote.id, date: mstrPathNote.date, title: mstr.title, summary: mstr.summary, image: mstrPathNote.images[1].path, original: true, chineseOnly: false, asset: "MSTR" },
    { id: cryptoRiskNote.id, date: cryptoRiskNote.date, title: cryptoRiskNote.title, summary: cryptoRiskNote.summary, image: "", original: true, chineseOnly: true, asset: "BTC · ETH" },
    ...publicNotes.map(note => ({ ...note, image: note.image ? `/images/public-notes/20260919/${note.image}-zh.webp` : "", original: false, chineseOnly: true })),
  ];
  return (
    <main>
      <CreatorProfile en={en} />
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section id="public-posts" aria-labelledby="feed-title" className="min-w-0 scroll-mt-24">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="feed-title" className="text-xl font-semibold">{en ? "Public journal" : "公开观点"}</h2>
            <span className="text-xs text-white/50">{en ? "Newest first · Free to read" : "按发布时间 · 免费阅读"}</span>
          </div>
          <div className="space-y-6">
            {posts.map(post => (
              <article key={post.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.025]">
                <div className="p-5 sm:p-7">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/55">
                    <span className="font-medium text-white/85">{en ? "Teacher Yi" : "易老师"}</span><span aria-hidden="true">·</span>
                    <time dateTime={post.date}>{post.date}</time>
                    <span className="ml-auto rounded-full bg-emerald-400/10 px-3 py-1 text-emerald-300">{en ? "Public" : "全员可见"}</span>
                  </div>
                  <p className="mt-5 text-xs tracking-wide text-emerald-200">{post.asset}</p>
                  <h3 className="mt-2 text-xl font-semibold leading-8"><Link href={`${prefix}/member/notes#note-${post.id}`} className="hover:text-emerald-200">{post.title}</Link></h3>
                  {en && post.chineseOnly && <p className="mt-2 text-xs text-white/45">Original Chinese post</p>}
                  <p className="mt-4 text-sm leading-7 text-white/65">{post.summary}</p>
                </div>
                {post.image && <Link href={`${prefix}/member/notes#note-${post.id}`} className="block border-y border-white/10 bg-black/20">
                  <Image src={post.image} alt={post.title} width={900} height={480} unoptimized className="max-h-72 w-full object-contain" />
                </Link>}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-xs sm:px-7">
                  <span className="text-white/45">{en ? (post.original ? "Dated observation · Not a live quote" : "Archive · Scenario illustration where shown") : (post.original ? "发布时点观察 · 非实时行情" : "历史观点 · 配图为情景示意")}</span>
                  <Link href={`${prefix}/member/notes#note-${post.id}`} className="py-2 font-medium text-emerald-300">{en ? "Read full post →" : "阅读全文与配图 →"}</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
        <aside className="space-y-5 self-start lg:sticky lg:top-24">
          <section className="rounded-2xl border border-white/10 bg-white/[.025] p-6">
            <h2 className="text-lg font-semibold">{en ? "A place for the full story" : "观点，不是喊单"}</h2>
            <p className="mt-3 text-sm leading-7 text-white/60">{en ? "Each post keeps its publication date and conditions. Charts explain a scenario; they do not promise a future price or execute a trade." : "每篇观点保留发布时间、判断依据与条件。配图帮助理解情景，不代表未来一定照图运行，也不会自动触发交易。"}</p>
          </section>
          <section className="rounded-2xl border border-emerald-300/20 bg-emerald-400/5 p-6">
            <h2 className="text-lg font-semibold">{en ? "Inside the member journal" : "进入会员专栏"}</h2>
            <p className="mt-3 text-sm leading-7 text-white/60">{en ? "Read member-only notes and take part in discussions where comments are open. Existing access rules still apply." : "阅读会员专享随笔，在开放评论的帖子下交流。已有会员权益与阅读权限保持不变。"}</p>
            <Link href={`${prefix}/member/notes#member-posts`} className="mt-5 block rounded-xl border border-emerald-300/30 px-4 py-3 text-center text-sm text-emerald-200 hover:bg-emerald-400/10">{en ? "Open member posts →" : "查看会员随笔 →"}</Link>
          </section>
          <nav aria-label={en ? "Research archive" : "历史研究"} className="space-y-3 px-2 text-sm text-white/55">
            <p className="text-xs uppercase tracking-widest text-white/35">{en ? "Keep exploring" : "历史资料保留"}</p>
            <Link className="block hover:text-white" href={`${prefix}/member/weekly-review`}>{en ? "Research reviews →" : "历史复盘 →"}</Link>
            <Link className="block hover:text-white" href={`${prefix}/member/monthly`}>{en ? "Monthly research archive →" : "月度研究记录 →"}</Link>
            <Link className="block hover:text-white" href={`${prefix}/member/videos`}>{en ? "Member videos →" : "会员视频 →"}</Link>
          </nav>
        </aside>
      </div>
    </main>
  );
}
