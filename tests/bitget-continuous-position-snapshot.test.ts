import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { confirmEmptyUtaPositionSnapshot } from "../lib/bitget/continuous-position-snapshot";
const auth = { apiKey: "test", secretKey: "test", passphrase: "test", clockOffsetMs: 0 };
function probe(patch: Record<string, unknown> = {}, mode = "snapshot") {
  const sent: Array<{ op: string; args: Array<{ timestamp: string; sign: string }> }> = []; let closed = 0;
  const handlers: Record<string, (event: {data?: string}) => void> = {};
  const socket = {
    addEventListener(name: string, fn: (event: {data?: string}) => void) { handlers[name] = fn; },
    close() { closed++; },
    send(text: string) {
      const data = JSON.parse(text); sent.push(data);
      queueMicrotask(() => {
        if (data.op === "login") handlers.message({ data: JSON.stringify({ event: "login", code: mode === "bad-auth" ? "1" : "0" }) });
        else if (mode === "ack-only") { handlers.message({data: JSON.stringify({event: "subscribe"})}); handlers.close({}); }
        else handlers.message({ data: JSON.stringify({ action: "snapshot", arg: { instType: "UTA", topic: "position" }, ts: Date.now(), data: [], ...patch }) });
      });
    },
  };
  const promise = confirmEmptyUtaPositionSnapshot(auth, url => {
    assert.equal(url, "wss://ws.bitget.com/v3/ws/private");
    queueMicrotask(() => { if (mode === "socket-error") handlers.error({}); else if (mode !== "timeout") handlers.open({}); }); return socket as unknown as WebSocket;
  });
  return { promise, sent, closed: () => closed };
}
test("authenticated fresh full empty snapshot is the only successful empty proof", async () => {
  const p = probe(); await p.promise; assert.equal(p.closed(), 1);
  assert.deepEqual(p.sent.map(x => x.op), ["login", "subscribe"]);
  const login = p.sent[0].args[0];
  assert.ok(Number.isInteger(Number(login.timestamp)));
  assert.ok(Math.abs(Number(login.timestamp) * 1000 - Date.now()) < 1500);
  assert.equal(login.sign, createHmac("sha256", auth.secretKey).update(login.timestamp + "GET/user/verify").digest("base64"));
  assert.doesNotMatch(JSON.stringify(p.sent), /place-order|cancel|trade/);
});
test("nonempty, missing, incremental, wrong-channel and stale snapshots fail closed", async () => {
  for (const patch of [{ data: [{}] }, { data: null }, { action: "update" }, { arg: { instType: "UTA", topic: "account" } }, { ts: 0 }, { ts: Date.now()+60000 }]) {
    const p = probe(patch); await assert.rejects(p.promise, /EXCHANGE_UNKNOWN|EXCHANGE_NOT_EMPTY/); assert.equal(p.closed(), 1);
  }
  for (const mode of ["bad-auth", "ack-only", "socket-error"]) { const p = probe({}, mode); await assert.rejects(p.promise); assert.equal(p.closed(), 1); }
});

test("invalid clock offsets never create a socket", async () => {
  for (const clockOffsetMs of [NaN, Infinity, "0", null]) {
    await assert.rejects(confirmEmptyUtaPositionSnapshot({ ...auth, clockOffsetMs: clockOffsetMs as number }, () => { throw new Error("must not connect"); }), /EXCHANGE_UNKNOWN/);
  }
});

test("connection timeout closes the read-only socket", async () => {
  const p = probe({}, "timeout"); await assert.rejects(p.promise, /EXCHANGE_UNKNOWN/); assert.equal(p.closed(), 1);
});
