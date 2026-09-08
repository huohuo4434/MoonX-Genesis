"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Note, NoteMutation, Reply } from "@/lib/member-notes/core";

const field =
  "w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-violet-400";
const button =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-4 py-2 text-sm transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-40";
async function api<T>(url: string, mutation?: NoteMutation): Promise<T> {
  const response = await fetch(
    url,
    mutation
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mutation),
          cache: "no-store",
        }
      : { cache: "no-store" },
  );
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("UNAVAILABLE");
  }
  if (!response.ok) throw new Error(result.error ?? "UNAVAILABLE");
  return result as T;
}
function errorText(error: unknown, en: boolean) {
  const code = error instanceof Error ? error.message : "UNAVAILABLE";
  const messages: Record<string, [string, string]> = {
    LOGIN_REQUIRED: [
      "登录已过期，请重新登录。",
      "Your session expired. Please sign in again.",
    ],
    FORBIDDEN: [
      "当前会员或设备权限不足，请刷新页面检查。",
      "Your membership or device access changed. Please refresh.",
    ],
    INVALID_INPUT: [
      "请检查标题、正文和字数限制。",
      "Please check the title, text and length limits.",
    ],
    RATE_LIMIT: [
      "发送过于频繁，请稍候再试（回帖至少间隔10秒）。",
      "Please wait before trying again (at least 10 seconds between replies).",
    ],
    REPLIES_CLOSED: [
      "该文章已关闭讨论或已撤回。",
      "Discussion is closed or this post has been withdrawn.",
    ],
    EDIT_CONFLICT: [
      "这篇文章已在别处更新或撤回，未覆盖新版本。请先复制当前文字，再刷新并重新编辑。",
      "This post changed elsewhere. Nothing was overwritten. Copy your text, refresh, then edit the latest version.",
    ],
    NOT_FOUND: [
      "内容已不可用，请刷新。",
      "This content is no longer available. Please refresh.",
    ],
  };
  return (
    messages[code]?.[en ? 1 : 0] ??
    (en
      ? "Could not save or load. Your text is retained; please retry."
      : "暂时无法保存或加载，输入内容已保留，请重试。")
  );
}
function dateText(value: string, en: boolean) {
  return new Date(value).toLocaleString(en ? "en-GB" : "zh-CN", {
    timeZone: "Asia/Hong_Kong",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Discussion({
  note,
  en,
  isAdmin,
}: {
  note: Note;
  en: boolean;
  isAdmin: boolean;
}) {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const requestId = useRef("");
  async function load(append = false) {
    setBusy(true);
    setError("");
    try {
      const data = await api<{ replies: Reply[]; hasMore: boolean }>(
        `/api/member/notes?post=${note.id}&offset=${append ? replies.length : 0}`,
      );
      setReplies((previous) =>
        append ? [...previous, ...data.replies] : data.replies,
      );
      setHasMore(data.hasMore);
      setLoaded(true);
    } catch (err) {
      setError(errorText(err, en));
    } finally {
      setBusy(false);
    }
  }
  async function mutate(input: NoteMutation) {
    setBusy(true);
    setError("");
    try {
      await api("/api/member/notes", input);
      if (input.action === "reply") {
        setBody("");
        requestId.current = "";
      }
      await load();
    } catch (err) {
      setError(errorText(err, en));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      aria-label={en ? "Discussion" : "会员讨论"}
      className="mt-6 border-t border-white/10 pt-4"
    >
      <button className={button} disabled={busy} onClick={() => void load()}>
        {loaded
          ? en
            ? "Refresh discussion"
            : "刷新讨论"
          : en
            ? "View replies / Join discussion"
            : "查看回帖 / 参与讨论"}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-300">
          {error}
        </p>
      )}
      {loaded && (
        <div className="mt-4 space-y-4">
          {replies.length === 0 && (
            <p className="text-sm text-white/50">
              {en
                ? "No replies yet. Start the conversation."
                : "还没有回帖，来说说你的看法。"}
            </p>
          )}
          {replies.map((reply) => (
            <div
              key={reply.id}
              className={`rounded-xl bg-white/[.035] p-4 ${reply.hidden ? "opacity-50" : ""}`}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
                <strong
                  className={
                    reply.isTeacher ? "text-violet-300" : "text-white/80"
                  }
                >
                  {reply.isTeacher
                    ? en
                      ? "Teacher Yi · Author"
                      : "易老师 · 作者"
                    : `${en ? "Member" : "会员"} ${reply.author}`}
                </strong>
                <time dateTime={reply.createdAt}>
                  {dateText(reply.createdAt, en)} UTC+8
                </time>
                {reply.isOwn && <span>{en ? "You" : "我"}</span>}
                {reply.hidden && <span>{en ? "Hidden" : "已隐藏"}</span>}
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">
                {reply.body}
              </p>
              {(isAdmin || reply.isOwn) && (
                <button
                  disabled={busy}
                  className="mt-2 min-h-10 text-xs text-white/50 hover:text-white"
                  onClick={() => {
                    if (
                      !reply.hidden &&
                      !window.confirm(
                        en ? "Hide this reply?" : "确定隐藏这条回帖？",
                      )
                    )
                      return;
                    void mutate(
                      isAdmin
                        ? {
                            action: "moderate",
                            id: reply.id,
                            hidden: !reply.hidden,
                          }
                        : { action: "withdraw", id: reply.id },
                    );
                  }}
                >
                  {reply.hidden
                    ? en
                      ? "Restore"
                      : "恢复显示"
                    : en
                      ? "Hide reply"
                      : "隐藏回帖"}
                </button>
              )}
            </div>
          ))}
          {hasMore && (
            <button
              className={button}
              disabled={busy}
              onClick={() => void load(true)}
            >
              {en ? "More replies" : "更多回帖"}
            </button>
          )}
          {note.commentsOpen && note.status === "published" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!requestId.current) requestId.current = crypto.randomUUID();
                void mutate({
                  action: "reply",
                  id: requestId.current,
                  postId: note.id,
                  body,
                });
              }}
            >
              <label
                className="mb-2 block text-sm"
                htmlFor={`reply-${note.id}`}
              >
                {en ? "Your reply" : "写下你的看法"}
              </label>
              <textarea
                id={`reply-${note.id}`}
                className={field}
                rows={3}
                maxLength={2000}
                required
                value={body}
                disabled={busy}
                onChange={(event) => {
                  setBody(event.target.value);
                  requestId.current = "";
                }}
                placeholder={
                  en
                    ? "Discuss the post. Do not share private account information."
                    : "围绕文章交流，请勿留下账户、持仓截图等隐私信息。"
                }
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xs text-white/40">
                  {body.length}/2000 ·{" "}
                  {en
                    ? "A member alias is shown, never your email."
                    : "显示会员代号，不公开邮箱。"}
                </span>
                <button
                  type="submit"
                  className={`${button} bg-violet-600`}
                  disabled={busy || !body.trim()}
                >
                  {busy
                    ? en
                      ? "Sending…"
                      : "发送中…"
                    : en
                      ? "Reply"
                      : "发布回帖"}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-white/50">
              {en
                ? "Replies are closed for this post."
                : "这篇文章暂不开放回帖。"}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function Composer({
  initial,
  en,
  onSaved,
  onCancel,
}: {
  initial: Note | null;
  en: boolean;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [titleEn, setTitleEn] = useState(initial?.titleEn ?? "");
  const [bodyEn, setBodyEn] = useState(initial?.bodyEn ?? "");
  const [commentsOpen, setCommentsOpen] = useState(
    initial?.commentsOpen ?? true,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const id = useRef(initial?.id ?? "");
  async function save(status: "draft" | "published") {
    setBusy(true);
    setError("");
    if (!id.current) id.current = crypto.randomUUID();
    try {
      await api("/api/member/notes", {
        action: "save",
        id: id.current,
        title,
        body,
        titleEn,
        bodyEn,
        status,
        commentsOpen,
        expectedUpdatedAt: initial?.updatedAt ?? null,
      });
      onSaved();
    } catch (err) {
      setError(errorText(err, en));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mb-8 rounded-2xl border border-violet-400/30 bg-violet-400/[.05] p-5 sm:p-6">
      <h2 className="mb-4 text-xl font-semibold">
        {initial
          ? en
            ? "Edit post"
            : "编辑随笔"
          : en
            ? "Write a post"
            : "发布新随笔"}
      </h2>
      <fieldset disabled={busy} className="space-y-4">
        <label className="block text-sm">
          {en ? "Chinese title (required)" : "标题"}
          <input
            className={`${field} mt-2`}
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          {en ? "Chinese text (required)" : "正文"}
          <textarea
            className={`${field} mt-2`}
            rows={9}
            maxLength={12000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <div className="rounded-xl border border-white/10 p-3 text-sm">
          <p className="text-white/50">
            {en
              ? "Free-member preview: title + first line (up to 120 characters)."
              : "普通会员预览：标题＋第一行（最多120字），其余正文仅高级会员可见。"}
          </p>
          <p className="mt-2 whitespace-pre-wrap break-words">
            {body.trim().split("\n")[0]?.slice(0, 120) ||
              (en
                ? "Your opening line appears here."
                : "开头第一行会显示在这里。")}
          </p>
        </div>
        <details open={Boolean(initial?.bodyEn)}>
          <summary className="cursor-pointer py-2 text-sm text-violet-200">
            {en ? "English version (optional)" : "英文版本（可选）"}
          </summary>
          <div className="mt-2 space-y-4">
            <label className="block text-sm">
              English title
              <input
                className={`${field} mt-2`}
                maxLength={160}
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              English text
              <textarea
                className={`${field} mt-2`}
                rows={8}
                maxLength={12000}
                value={bodyEn}
                onChange={(e) => setBodyEn(e.target.value)}
              />
            </label>
          </div>
        </details>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={commentsOpen}
            onChange={(e) => setCommentsOpen(e.target.checked)}
          />
          {en ? "Allow paid members to reply" : "允许高级会员回帖讨论"}
        </label>
        {error && (
          <p role="alert" className="text-sm text-rose-300">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            className={`${button} bg-violet-600`}
            disabled={!title.trim() || !body.trim()}
            onClick={() => void save("published")}
          >
            {busy
              ? en
                ? "Saving…"
                : "保存中…"
              : en
                ? "Publish to members"
                : "发布到会员频道"}
          </button>
          <button
            className={button}
            disabled={!title.trim() || !body.trim()}
            onClick={() => void save("draft")}
          >
            {en ? "Save draft" : "保存草稿"}
          </button>
          <button className={button} onClick={onCancel}>
            {en ? "Cancel" : "取消"}
          </button>
        </div>
      </fieldset>
    </section>
  );
}

export function MemberNotesClient({
  en,
  isAdmin,
  previewOnly,
}: {
  en: boolean;
  isAdmin: boolean;
  previewOnly: boolean;
}) {
  const [posts, setPosts] = useState<Note[]>([]);
  const [view, setView] = useState("published");
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Note | null | undefined>(undefined);
  const [notice, setNotice] = useState("");
  const generation = useRef(0);
  async function load(append = false) {
    const current = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const data = await api<{ posts: Note[]; hasMore: boolean }>(
        `/api/member/notes?view=${view}&offset=${append ? posts.length : 0}`,
      );
      if (current !== generation.current) return;
      setPosts((previous) =>
        append ? [...previous, ...data.posts] : data.posts,
      );
      setHasMore(data.hasMore);
    } catch (err) {
      if (current === generation.current) setError(errorText(err, en));
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  useEffect(() => {
    void load();
    return () => {
      // This is a request sequence counter, not a DOM ref. Invalidate pending requests.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
    }; /* Load only on tab changes. No polling. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 text-white sm:px-6 sm:py-12">
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-300">
            MOOX · {en ? "Member posts" : "会员专栏"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            {en ? "Teacher Yi's Notes" : "易老师随笔"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            {en
              ? "Personal observations, market thoughts and conversations with members."
              : "分享个人见解、市场观察，和会员聊聊想法。"}
          </p>
        </div>
        {isAdmin && (
          <button
            className={`${button} bg-violet-600`}
            onClick={() => setEditing(null)}
            disabled={editing !== undefined}
          >
            {en ? "+ New post" : "＋ 发随笔"}
          </button>
        )}
      </header>
      <p className="mb-6 text-xs leading-5 text-white/40">
        {en
          ? "Personal commentary, not an official forecast or trading instruction."
          : "个人观点交流，不属于正式预测或交易指令。"}
      </p>
      {previewOnly && (
        <div className="mb-6 rounded-xl border border-violet-300/20 bg-violet-500/10 p-4 text-sm text-violet-100">
          {en
            ? "You can preview every title and opening line. Upgrade to read full posts and join discussions."
            : "你可以预览每篇标题和首行。升级高级会员，阅读全文并参与讨论。"}{" "}
          <Link
            className="underline underline-offset-4"
            href={en ? "/en/pricing" : "/pricing"}
          >
            {en ? "View membership →" : "查看会员权益 →"}
          </Link>
        </div>
      )}
      {editing !== undefined && (
        <Composer
          key={editing?.id ?? "new"}
          initial={editing}
          en={en}
          onSaved={() => {
            setEditing(undefined);
            setNotice(
              en
                ? "Saved. Check Published or Drafts below."
                : "已保存，可在下方已发布或草稿中查看。",
            );
            void load();
          }}
          onCancel={() => {
            if (
              window.confirm(
                en ? "Discard unsaved changes?" : "放弃尚未保存的修改？",
              )
            )
              setEditing(undefined);
          }}
        />
      )}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {isAdmin &&
          ["published", "draft", "archived"].map((tab, i) => (
            <button
              key={tab}
              disabled={busy}
              className={`${button} ${view === tab ? "bg-white/10" : ""}`}
              onClick={() => {
                setPosts([]);
                setView(tab);
              }}
            >
              {
                (en
                  ? ["Published", "Drafts", "Archived"]
                  : ["已发布", "草稿", "已撤回"])[i]
              }
            </button>
          ))}
        <button
          disabled={busy}
          className={`${button} ml-auto`}
          onClick={() => void load()}
        >
          {busy ? (en ? "Loading…" : "加载中…") : en ? "Refresh" : "刷新"}
        </button>
      </div>
      {notice && (
        <p role="status" className="mb-4 text-sm text-emerald-300">
          {notice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-rose-400/30 p-4 text-sm text-rose-300"
        >
          {error}
        </p>
      )}
      {!busy && !error && posts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/15 px-6 py-14 text-center">
          <h2 className="text-lg">
            {en ? "No posts here yet" : "这里还没有随笔"}
          </h2>
          <p className="mt-3 text-sm text-white/50">
            {isAdmin
              ? en
                ? "Use New post to share your first observation."
                : "点击「发随笔」，发布你的第一篇个人见解。"
              : en
                ? "New observations will appear here when published."
                : "易老师发布新见解后，会在这里与你见面。"}
          </p>
        </div>
      )}
      <div className="space-y-6">
        {posts.map((note) => (
          <article
            key={note.id}
            id={`note-${note.id}`}
            className="rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-7"
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/20 font-semibold text-violet-200">
                易
              </span>
              <div>
                <p className="text-sm font-semibold">
                  {en ? "Teacher Yi" : "易老师"}
                </p>
                <time
                  className="text-xs text-white/40"
                  dateTime={note.publishedAt ?? note.createdAt}
                >
                  {dateText(note.publishedAt ?? note.createdAt, en)} UTC+8
                </time>
              </div>
              <span className="ml-auto rounded-full border border-white/10 px-2 py-1 text-xs text-white/50">
                {en ? "Members" : "会员专享"}
              </span>
            </div>
            <h2 className="break-words text-xl font-semibold leading-8">
              {en && note.titleEn ? note.titleEn : note.title}
            </h2>
            {en && !note.bodyEn && !note.previewEn && (
              <p className="mt-2 text-xs text-white/40">
                Original Chinese text · English version not provided.
              </p>
            )}
            <p className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-8 text-white/85">
              {note.locked
                ? en && note.previewEn
                  ? note.previewEn
                  : note.preview
                : en && note.bodyEn
                  ? note.bodyEn
                  : note.body}
            </p>
            {note.locked ? (
              <div className="mt-5 border-t border-white/10 pt-5">
                <p className="mb-3 text-sm text-white/50">
                  {en
                    ? "The rest of this post and member replies are for paid members."
                    : "余下正文与讨论仅高级会员可见。"}
                </p>
                <Link
                  className={`${button} bg-violet-600`}
                  href={en ? "/en/pricing" : "/pricing"}
                >
                  {en
                    ? "Unlock full post & discussion"
                    : "升级后阅读全文和回帖"}
                </Link>
              </div>
            ) : (
              <Discussion note={note} en={en} isAdmin={isAdmin} />
            )}
            {isAdmin && (
              <div className="mt-4 flex gap-3 border-t border-white/10 pt-3">
                <button
                  className={button}
                  disabled={editing !== undefined}
                  onClick={() => {
                    setEditing(note);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  {en ? "Edit / Republish" : "编辑 / 重新发布"}
                </button>
                {note.status !== "archived" && (
                  <button
                    className={button}
                    disabled={busy}
                    onClick={async () => {
                      if (
                        !window.confirm(
                          en
                            ? "Withdraw this post? It can be restored from Archived."
                            : "撤回这篇随笔？之后可从「已撤回」恢复。",
                        )
                      )
                        return;
                      setBusy(true);
                      try {
                        await api("/api/member/notes", {
                          action: "archive",
                          id: note.id,
                        });
                        await load();
                      } catch (err) {
                        setError(errorText(err, en));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {en ? "Withdraw" : "撤回"}
                  </button>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
      {hasMore && (
        <button
          className={`${button} mt-6 w-full`}
          disabled={busy}
          onClick={() => void load(true)}
        >
          {en ? "Older posts" : "更早的随笔"}
        </button>
      )}
    </div>
  );
}
