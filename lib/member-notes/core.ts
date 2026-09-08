import { z } from "zod";

export const noteId = z.string().uuid();
const text = (max: number) => z.string().trim().min(1).max(max);
export const noteMutation = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("save"),
      id: noteId,
      title: text(160),
      body: text(12000),
      titleEn: z.string().trim().max(160).default(""),
      bodyEn: z.string().trim().max(12000).default(""),
      status: z.enum(["draft", "published"]),
      commentsOpen: z.boolean(),
      expectedUpdatedAt: z
        .string()
        .datetime({ offset: true })
        .nullable()
        .default(null),
    })
    .strict(),
  z.object({ action: z.literal("archive"), id: noteId }).strict(),
  z
    .object({
      action: z.literal("reply"),
      id: noteId,
      postId: noteId,
      body: text(2000),
    })
    .strict(),
  z.object({ action: z.literal("withdraw"), id: noteId }).strict(),
  z
    .object({ action: z.literal("moderate"), id: noteId, hidden: z.boolean() })
    .strict(),
]);
export type NoteMutation = z.infer<typeof noteMutation>;
export type Note = {
  id: string;
  title: string;
  body: string;
  titleEn: string;
  bodyEn: string;
  preview: string;
  previewEn: string;
  locked: boolean;
  status: "draft" | "published" | "archived";
  commentsOpen: boolean;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
};
export type Reply = {
  id: string;
  body: string;
  author: string;
  isTeacher: boolean;
  isOwn: boolean;
  hidden: boolean;
  createdAt: string;
};
export function canMutateNote(
  isAdmin: boolean,
  action: NoteMutation["action"],
) {
  return isAdmin || action === "reply" || action === "withdraw";
}
export function isSameOriginJson(request: Request) {
  return (
    request.headers.get("origin") === new URL(request.url).origin &&
    request.headers.get("content-type")?.split(";")[0]?.trim() ===
      "application/json"
  );
}
export function pageOffset(value: string | null) {
  if (value === null) return 0;
  if (!/^\d{1,6}$/.test(value)) throw new Error("INVALID_INPUT");
  const offset = Number(value);
  if (offset > 100000) throw new Error("INVALID_INPUT");
  return offset;
}
