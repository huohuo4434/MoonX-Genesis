import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { memberDeskRefreshPresentation, startMemberDeskPolling } from "../lib/member-ai-desk-polling-core";

test("member desk reads immediately, polls at 30 seconds, and ignores an older late response", async () => {
  const resolvers: Array<(value: string) => void> = [];
  const signals: AbortSignal[] = [];
  let intervalCallback: (() => void) | null = null;
  const seen: string[] = [];
  const stop = startMemberDeskPolling({
    read: (signal) => { signals.push(signal); return new Promise<string>((resolve) => resolvers.push(resolve)); },
    onSnapshot: (value) => seen.push(value),
    onError: () => assert.fail("no read should fail"),
    intervalMs: 30_000,
    setIntervalFn: ((callback: () => void, milliseconds: number) => {
      assert.equal(milliseconds, 30_000);
      intervalCallback = callback;
      return 7 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval,
    clearIntervalFn: (() => undefined) as typeof clearInterval,
  });
  assert.equal(resolvers.length, 1, "mount must read without waiting for the interval");
  intervalCallback!();
  assert.equal(signals[0]!.aborted, true);
  resolvers[0]!("old");
  resolvers[1]!("new");
  await Promise.resolve();
  assert.deepEqual(seen, ["new"]);
  stop();
  assert.equal(signals[1]!.aborted, true);
});

test("member desk keeps the last snapshot when a later refresh fails and suppresses post-unmount work", async () => {
  const pending: Array<{ resolve: (value: string) => void; reject: (error: Error) => void }> = [];
  let tick: (() => void) | null = null;
  const seen: string[] = [];
  const errors: string[] = [];
  const stop = startMemberDeskPolling({
    read: () => new Promise<string>((resolve, reject) => pending.push({ resolve, reject })),
    onSnapshot: (value) => seen.push(value),
    onError: (error) => errors.push(error instanceof Error ? error.message : String(error)),
    intervalMs: 30_000,
    setIntervalFn: ((callback: () => void) => { tick = callback; return 8 as unknown as ReturnType<typeof setInterval>; }) as typeof setInterval,
    clearIntervalFn: (() => undefined) as typeof clearInterval,
  });
  pending[0]!.resolve("healthy");
  await Promise.resolve();
  tick!();
  pending[1]!.reject(new Error("read failed"));
  await Promise.resolve();
  assert.deepEqual(seen, ["healthy"]);
  assert.deepEqual(errors, ["read failed"]);
  tick!();
  stop();
  pending[2]!.resolve("too late");
  await Promise.resolve();
  assert.deepEqual(seen, ["healthy"]);
});

test("member UI marks refresh failure as danger and labels retained data as the last successful snapshot", () => {
  const failed = memberDeskRefreshPresentation("network failed", false);
  assert.deepEqual(failed, {
    stale: true,
    statusLabel: "刷新失败 · 上次成功快照",
    serverLabel: "刷新失败；当前显示上次成功快照",
  });
  assert.deepEqual(memberDeskRefreshPresentation("", false), {
    stale: false, statusLabel: null, serverLabel: null,
  });
  const source = readFileSync(resolve("components/member/AiTradingDeskClient.tsx"), "utf8");
  assert.match(source, /statusVariant\(snapshot, refreshPresentation\.stale\)/);
  assert.match(source, /if \(refreshFailed\) return "danger"/);
});
