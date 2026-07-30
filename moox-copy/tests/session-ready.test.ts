import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { isSessionReadyToVerify } from "../lib/verification/session-ready.ts";
import { formatDateTimeChina } from "../lib/utils/datetime.ts";

describe("session ready + datetime", () => {
  test("CN ready same day after 15:10 BJ", () => {
    const before = new Date("2026-07-28T07:09:00.000Z"); // 15:09 BJ
    const after = new Date("2026-07-28T07:10:00.000Z"); // 15:10 BJ
    assert.equal(isSessionReadyToVerify("CN", "2026-07-28", before), false);
    assert.equal(isSessionReadyToVerify("CN", "2026-07-28", after), true);
  });

  test("HK ready same day after 16:10 BJ", () => {
    const before = new Date("2026-07-28T08:09:00.000Z"); // 16:09 BJ
    const after = new Date("2026-07-28T08:10:00.000Z"); // 16:10 BJ
    assert.equal(isSessionReadyToVerify("HK", "2026-07-28", before), false);
    assert.equal(isSessionReadyToVerify("HK", "2026-07-28", after), true);
  });

  test("formatDateTimeChina never produces 728日", () => {
    const s = formatDateTimeChina("2026-07-28T01:00:00+08:00");
    assert.match(s, /2026年7月28日/);
    assert.doesNotMatch(s, /728日/);
  });
});
