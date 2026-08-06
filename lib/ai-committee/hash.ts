import { createHash } from "node:crypto";
import type { CommitteeInput } from "@/lib/ai-committee/types";

export function hashCommitteeInput(input: CommitteeInput): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
