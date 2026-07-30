import "server-only";

import { listTeacherNotes } from "./store";
import { searchTeacherKnowledge, type TeacherSearchHit } from "./search-core";

export type { TeacherSearchHit } from "./search-core";
export { searchTeacherKnowledge, tokenizeTeacherQuery } from "./search-core";

/** Prefer teacher historical cases when AI analyzes stock hexagrams. */
export async function searchTeacherNotes(
  query: string,
  options?: number | { limit?: number }
): Promise<TeacherSearchHit[]> {
  const notes = await listTeacherNotes();
  const limit = typeof options === "number" ? options : options?.limit;
  return searchTeacherKnowledge(notes, query, { limit });
}
