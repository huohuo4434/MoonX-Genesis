import { NextResponse } from "next/server";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { checkMemberApiRateLimit } from "@/lib/auth/member-api-rate-limit";
import { getAccessUser } from "@/lib/auth/get-access-user";
import {
  canMutateNote,
  isSameOriginJson,
  noteId,
  noteMutation,
  pageOffset,
} from "@/lib/member-notes/core";
import { listNotes, listReplies, mutateNote } from "@/lib/member-notes/store";

export const dynamic = "force-dynamic";
const respond = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
async function requireMemberNotesAccess(allowPreview = false) {
  if (allowPreview) {
    const access = await getAccessUser();
    if (!access.authenticated || !access.userId)
      throw new Error("LOGIN_REQUIRED");
    if (!access.isActiveMember && !access.isAdmin)
      return { userId: access.userId, isAdmin: false, previewOnly: true };
  }
  const gate = await getMemberDevicePageAccess({ failClosed: true });
  if (gate.status !== "ALLOWED" || !gate.access.userId)
    throw new Error(
      gate.status === "LOGIN_REQUIRED" ? "LOGIN_REQUIRED" : "FORBIDDEN",
    );
  return {
    userId: gate.access.userId,
    isAdmin: gate.access.isAdmin,
    previewOnly: false,
  };
}
function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "UNAVAILABLE";
  const statuses: Record<string, number> = {
    LOGIN_REQUIRED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INVALID_INPUT: 400,
    RATE_LIMIT: 429,
    REPLIES_CLOSED: 409,
    EDIT_CONFLICT: 409,
  };
  return respond(
    { error: statuses[code] ? code : "UNAVAILABLE" },
    statuses[code] ?? 503,
  );
}
export async function GET(request: Request) {
  try {
    const access = await requireMemberNotesAccess(true);
    if (!(await checkMemberApiRateLimit({ scope: "notes-read", limit: 90 })).ok)
      throw new Error("RATE_LIMIT");
    const params = new URL(request.url).searchParams;
    const offset = pageOffset(params.get("offset"));
    const postId = params.get("post");
    if (postId) {
      if (access.previewOnly) throw new Error("FORBIDDEN");
      if (!noteId.safeParse(postId).success) throw new Error("INVALID_INPUT");
      return respond(
        await listReplies(postId, access.isAdmin, access.userId, offset),
      );
    }
    return respond(
      await listNotes(
        access.isAdmin,
        offset,
        params.get("view") ?? "published",
        access.previewOnly,
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    if (!isSameOriginJson(request)) throw new Error("FORBIDDEN");
    const access = await requireMemberNotesAccess();
    if (
      !(await checkMemberApiRateLimit({ scope: "notes-write", limit: 15 })).ok
    )
      throw new Error("RATE_LIMIT");
    // Bound streamed input as well as Content-Length (which a caller may omit).
    const reader = request.body?.getReader();
    if (!reader) throw new Error("INVALID_INPUT");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 110000) {
        await reader.cancel();
        throw new Error("INVALID_INPUT");
      }
      chunks.push(value);
    }
    let raw: unknown;
    try {
      raw = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new Error("INVALID_INPUT");
    }
    const parsed = noteMutation.safeParse(raw);
    if (!parsed.success) throw new Error("INVALID_INPUT");
    if (!canMutateNote(access.isAdmin, parsed.data.action))
      throw new Error("FORBIDDEN");
    await mutateNote(parsed.data, access.userId, access.isAdmin);
    return respond({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
