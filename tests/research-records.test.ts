import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterPublicResearchRecords, resolveResearchVisibility } from "../lib/research/visibility.ts";
import { listResearchRecords } from "../lib/data/research-records.ts";
import { getResearchConflictForRecord } from "../lib/data/research-conflicts.ts";

describe("research records", () => {
  it("includes new oil and SSE annual records exactly once", async () => {
    const records = await listResearchRecords();
    const ids = records.map((r) => r.id);
    assert.equal(new Set(ids).size, records.length);
    assert.ok(records.length >= 57);
    const oil = ids.filter((id) => id === "MX-OIL-20260602-0903-LIUYAO-001");
    const sse = ids.filter((id) => id === "MX-SSE-2026-ANNUAL-LIUYAO-001");
    assert.equal(oil.length, 1);
    assert.equal(sse.length, 1);
    assert.equal(ids.filter((id) => id.startsWith("T02-")).length, 5);
  });

  it("marks long-horizon research as internal for public surfaces", async () => {
    const records = await listResearchRecords();
    const publicRecords = filterPublicResearchRecords(records);
    assert.equal(publicRecords.length, 0);
    const annual = records.find((r) => r.id === "MX-SSE-2026-ANNUAL-LIUYAO-001");
    assert.ok(annual);
    assert.equal(resolveResearchVisibility(annual!), "internal");
  });

  it("keeps internal records available for engines", async () => {
    const records = await listResearchRecords();
    assert.ok(records.some((r) => r.id === "QIMEN-A-SHARES-2026-H2"));
    assert.ok(records.some((r) => r.id === "A-SH-2026-0727-ORACLE-001"));
  });

  it("links SSE conflict to three framework records", () => {
    const conflict = getResearchConflictForRecord("MX-SSE-2026-ANNUAL-LIUYAO-001");
    assert.ok(conflict);
    assert.equal(conflict!.records.length, 3);
    assert.ok(conflict!.records.some((r) => r.recordId === "QIMEN-A-SHARES-2026-H2"));
    assert.ok(conflict!.records.some((r) => r.recordId === "A-SH-2026-0727-ORACLE-001"));
  });
});
