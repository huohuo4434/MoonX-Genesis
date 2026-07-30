import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const batchPath = new URL(
  "../data/imports/moox-teacher-knowledge-batch-20260730.json",
  import.meta.url
);
const batch = JSON.parse(readFileSync(batchPath, "utf8")) as {
  schemaVersion: string;
  lessons: Array<{ ref: string; rawTranscript: string }>;
  rules: Array<{ sourceLessonRef: string; sourceQuote: string }>;
  cases: Array<{
    sourceLessonRef: string;
    sourceQuote: string;
    mainHexagram: string | null;
    changedHexagram: string | null;
    needsAdminFill: string[];
  }>;
  concepts: Array<{ sourceLessonRef: string; sourceQuote: string }>;
  quotes: Array<{ sourceLessonRef: string; quote: string }>;
  methods: Array<{ sourceLessonRef: string; sourceQuote: string }>;
};

const lessonByRef = new Map(batch.lessons.map((lesson) => [lesson.ref, lesson]));

test("teacher batch preserves all uploaded transcripts with unique lesson refs", () => {
  assert.equal(batch.lessons.length, 46);
  assert.equal(lessonByRef.size, batch.lessons.length);
  assert.ok(batch.lessons.every((lesson) => lesson.rawTranscript.trim().length > 100));
});

test("every extracted entity points to a real source lesson and exact source quote", () => {
  const entities = [
    ...batch.rules.map((x) => ({ ref: x.sourceLessonRef, quote: x.sourceQuote })),
    ...batch.cases.map((x) => ({ ref: x.sourceLessonRef, quote: x.sourceQuote })),
    ...batch.concepts.map((x) => ({ ref: x.sourceLessonRef, quote: x.sourceQuote })),
    ...batch.quotes.map((x) => ({ ref: x.sourceLessonRef, quote: x.quote })),
    ...batch.methods.map((x) => ({ ref: x.sourceLessonRef, quote: x.sourceQuote })),
  ];
  assert.ok(entities.length > 0);
  for (const entity of entities) {
    const lesson = lessonByRef.get(entity.ref);
    assert.ok(lesson, `missing source lesson ${entity.ref}`);
    assert.ok(entity.quote.trim().length > 0, `empty quote for ${entity.ref}`);
    assert.ok(
      lesson!.rawTranscript.includes(entity.quote),
      `source quote is not verbatim for ${entity.ref}`
    );
  }
});

test("case hexagram fields remain unfilled until screenshots are supplied", () => {
  for (const item of batch.cases) {
    assert.equal(item.mainHexagram, null);
    assert.equal(item.changedHexagram, null);
    assert.ok(item.needsAdminFill.includes("mainHexagram"));
    assert.ok(item.needsAdminFill.includes("actualResult"));
  }
});
