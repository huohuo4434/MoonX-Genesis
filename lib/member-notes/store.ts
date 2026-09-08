import "server-only";
import { createHash } from "node:crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import type { Note, NoteMutation, Reply } from "./core";

const previewColumns =
  "id,title,title_en,preview,preview_en,status,published_at,updated_at,created_at";
const noteColumns = `${previewColumns},body,body_en,comments_open`;
type NoteRow = {
  id: string;
  title: string;
  body?: string;
  title_en: string;
  body_en?: string;
  preview: string;
  preview_en: string;
  status: Note["status"];
  comments_open?: boolean;
  published_at: string | null;
  updated_at: string;
  created_at: string;
};
type ReplyRow = {
  id: string;
  body: string;
  author_id: string;
  is_teacher: boolean;
  hidden_at: string | null;
  created_at: string;
};
function db() {
  const client = getAdminClient();
  if (!client) throw new Error("UNAVAILABLE");
  return client;
}
function checked(error: { message: string } | null) {
  if (!error) return;
  if (error.message.includes("REPLY_RATE_LIMIT")) throw new Error("RATE_LIMIT");
  if (error.message.includes("REPLIES_CLOSED"))
    throw new Error("REPLIES_CLOSED");
  if (error.message.includes("EDIT_CONFLICT")) throw new Error("EDIT_CONFLICT");
  throw new Error("UNAVAILABLE");
}
function toNote(row: NoteRow, previewOnly: boolean): Note {
  return {
    id: row.id,
    title: row.title,
    body: previewOnly ? "" : (row.body ?? ""),
    titleEn: row.title_en,
    bodyEn: previewOnly ? "" : (row.body_en ?? ""),
    preview: row.preview,
    previewEn: row.preview_en,
    locked: previewOnly,
    status: row.status,
    commentsOpen: !previewOnly && Boolean(row.comments_open),
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}
export async function listNotes(
  isAdmin: boolean,
  offset: number,
  view: string,
  previewOnly = false,
) {
  let query = db()
    .from("member_notes")
    .select(previewOnly ? previewColumns : noteColumns);
  query = query.eq(
    "status",
    isAdmin && (view === "draft" || view === "archived") ? view : "published",
  );
  const { data, error } = await query
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + 10);
  checked(error);
  return {
    posts: (data ?? [])
      .slice(0, 10)
      .map((row) => toNote(row as unknown as NoteRow, previewOnly)),
    hasMore: (data?.length ?? 0) > 10,
  };
}
export async function listReplies(
  postId: string,
  isAdmin: boolean,
  userId: string,
  offset: number,
) {
  let postQuery = db().from("member_notes").select("id").eq("id", postId);
  if (!isAdmin) postQuery = postQuery.eq("status", "published");
  const post = await postQuery.maybeSingle();
  checked(post.error);
  if (!post.data) throw new Error("NOT_FOUND");
  let query = db()
    .from("member_note_replies")
    .select("id,body,author_id,is_teacher,hidden_at,created_at")
    .eq("post_id", postId);
  if (!isAdmin) query = query.is("hidden_at", null);
  const { data, error } = await query
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range(offset, offset + 30);
  checked(error);
  const replies: Reply[] = (data ?? []).slice(0, 30).map((raw) => {
    const row = raw as ReplyRow;
    return {
      id: row.id,
      body: row.body,
      isTeacher: row.is_teacher,
      isOwn: row.author_id === userId,
      author: row.is_teacher
        ? "Yi"
        : createHash("sha256")
            .update(`member-notes:${row.author_id}`)
            .digest("hex")
            .slice(0, 8)
            .toUpperCase(),
      hidden: Boolean(row.hidden_at),
      createdAt: row.created_at,
    };
  });
  return { replies, hasMore: (data?.length ?? 0) > 30 };
}
export async function mutateNote(
  input: NoteMutation,
  userId: string,
  isAdmin: boolean,
) {
  const client = db();
  if (!isAdmin && input.action !== "reply" && input.action !== "withdraw")
    throw new Error("FORBIDDEN");
  if (input.action === "reply") {
    const { error } = await client.rpc("member_note_add_reply", {
      p_id: input.id,
      p_post_id: input.postId,
      p_author_id: userId,
      p_body: input.body,
      p_is_teacher: isAdmin,
    });
    checked(error);
    return;
  }
  if (input.action === "withdraw" || input.action === "moderate") {
    const restore = input.action === "moderate" && !input.hidden;
    let query = client
      .from("member_note_replies")
      .update({
        hidden_at: restore ? null : new Date().toISOString(),
        moderated_by: restore ? null : userId,
      })
      .eq("id", input.id);
    if (input.action === "withdraw") query = query.eq("author_id", userId);
    const result = await query.select("id").maybeSingle();
    checked(result.error);
    if (!result.data) throw new Error("NOT_FOUND");
    return;
  }
  if (!isAdmin) throw new Error("FORBIDDEN");
  if (input.action === "archive") {
    const result = await client
      .from("member_notes")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", input.id)
      .select("id")
      .maybeSingle();
    checked(result.error);
    if (!result.data) throw new Error("NOT_FOUND");
    return;
  }
  const result = await client.rpc("member_note_save", {
    p_id: input.id,
    p_author_id: userId,
    p_title: input.title,
    p_body: input.body,
    p_title_en: input.titleEn,
    p_body_en: input.bodyEn,
    p_status: input.status,
    p_comments_open: input.commentsOpen,
    p_expected_updated_at: input.expectedUpdatedAt,
  });
  checked(result.error);
}
