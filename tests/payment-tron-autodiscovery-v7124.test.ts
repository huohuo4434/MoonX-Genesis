import test from "node:test";
import assert from "node:assert/strict";
import { discoverTronTransferHash, verifyTronTransfer } from "@/lib/payments/verify-chain";

const recipient = "TTwZUWZiQfbMm9iyL2iT9qDivWqHttvmZ2";
const contract = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const txHash = "6".repeat(64);
const now = Date.now();

function response(json: unknown, status = 200): Response {
  return new Response(JSON.stringify(json), { status, headers: { "content-type": "application/json" } });
}

test("discovers a confirmed incoming exact-amount TRC20 transfer without pasted hash", async () => {
  const original = globalThis.fetch;
  let requested = "";
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    requested = String(input);
    return response({ data: [{
      transaction_id: txHash,
      block_timestamp: now,
      from: "TVJs9vDa8Vtp3AfEKwJRoEEf8B3CFqhWZz",
      to: recipient,
      type: "Transfer",
      value: "64000290",
      token_info: { address: contract, decimals: 6, symbol: "USDT" },
    }] });
  }) as typeof fetch;
  try {
    const found = await discoverTronTransferHash({
      recipientAddress: recipient,
      tokenContract: contract,
      expectedAmount: 64.00029,
      notBefore: new Date(now - 60_000),
      notAfter: new Date(now + 60_000),
    }, "key");
    assert.equal(found, txHash);
    assert.match(requested, /\/v1\/accounts\/.+\/transactions\/trc20\?/);
    assert.match(requested, /only_confirmed=true/);
    assert.match(requested, /only_to=true/);
    assert.match(requested, /contract_address=/);
  } finally { globalThis.fetch = original; }
});

test("wrong amount is not auto-matched", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => response({ data: [{
    transaction_id: txHash,
    block_timestamp: now,
    to: recipient,
    type: "Transfer",
    value: "62503890",
    token_info: { address: contract, decimals: 6 },
  }] })) as typeof fetch;
  try {
    const found = await discoverTronTransferHash({
      recipientAddress: recipient,
      tokenContract: contract,
      expectedAmount: 64.00389,
      notBefore: new Date(now - 60_000),
      notAfter: new Date(now + 60_000),
    });
    assert.equal(found, null);
  } finally { globalThis.fetch = original; }
});

test("multiple exact matches are never auto-selected", async () => {
  const original = globalThis.fetch;
  const secondHash = "7".repeat(64);
  globalThis.fetch = (async () => response({ data: [
    { transaction_id: txHash, block_timestamp: now, to: recipient, type: "Transfer", value: "64000290", token_info: { address: contract, decimals: 6 } },
    { transaction_id: secondHash, block_timestamp: now - 1, to: recipient, type: "Transfer", value: "64000290", token_info: { address: contract, decimals: 6 } },
  ] })) as typeof fetch;
  try {
    await assert.rejects(
      () => discoverTronTransferHash({
        recipientAddress: recipient,
        tokenContract: contract,
        expectedAmount: 64.00029,
        notBefore: new Date(now - 60_000),
        notAfter: new Date(now + 60_000),
      }),
      /Multiple matching TRON transfers found/
    );
  } finally { globalThis.fetch = original; }
});

test("final hash verification uses canonical confirmed transaction endpoint", async () => {
  const original = globalThis.fetch;
  const calls: Array<{ url: string; method: string }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, method: String(init?.method ?? "GET") });
    if (url.includes("walletsolidity/gettransactionbyid")) {
      return response({ txID: txHash, ret: [{ contractRet: "SUCCESS" }] });
    }
    if (url.includes(`/v1/transactions/${txHash}/events`)) {
      return response({ data: [{
        block_number: 123,
        block_timestamp: now,
        contract_address: contract,
        event_name: "Transfer",
        result: { from: "TVJs9vDa8Vtp3AfEKwJRoEEf8B3CFqhWZz", to: recipient, value: "64000290" },
      }] });
    }
    return response({}, 404);
  }) as typeof fetch;
  try {
    const verified = await verifyTronTransfer(txHash, {
      recipientAddress: recipient,
      tokenContract: contract,
      expectedAmount: 64.00029,
      notBefore: new Date(now - 60_000),
      notAfter: new Date(now + 60_000),
    });
    assert.equal(verified.amountNormalized, 64.00029);
    assert.equal(calls[0]?.url, "https://api.trongrid.io/walletsolidity/gettransactionbyid");
    assert.equal(calls[0]?.method, "POST");
    assert.equal(calls.some((c) => c.url.includes(`/v1/transactions/${txHash}`) && !c.url.includes("/events")), false);
  } finally { globalThis.fetch = original; }
});
