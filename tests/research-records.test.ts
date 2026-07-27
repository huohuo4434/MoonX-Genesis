import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listResearchRecords } from "../lib/data/research-records.ts";
import { getResearchConflictForRecord } from "../lib/data/research-conflicts.ts";

describe("research records", () => {
  it("includes new oil and SSE annual records exactly once", async () => {
    const records = await listResearchRecords();
    const ids = records.map((r) => r.id);
    const oil = ids.filter((id) => id === "MX-OIL-20260602-0903-LIUYAO-001");
    const sse = ids.filter((id) => id === "MX-SSE-2026-ANNUAL-LIUYAO-001");
    assert.equal(oil.length, 1);
    assert.equal(sse.length, 1);
  });

  it("preserves existing A-share bullish records", async () => {
    const records = await listResearchRecords();
    const ids = new Set(records.map((r) => r.id));
    assert.ok(ids.has("QIMEN-A-SHARES-2026-H2"));
    assert.ok(ids.has("A-SH-2026-0727-ORACLE-001"));
  });

  it("links SSE conflict to three framework records", () => {
    const conflict = getResearchConflictForRecord("MX-SSE-2026-ANNUAL-LIUYAO-001");
    assert.ok(conflict);
    assert.equal(conflict!.records.length, 3);
    assert.ok(conflict!.records.some((r) => r.recordId === "QIMEN-A-SHARES-2026-H2"));
    assert.ok(conflict!.records.some((r) => r.recordId === "A-SH-2026-0727-ORACLE-001"));
  });
});
