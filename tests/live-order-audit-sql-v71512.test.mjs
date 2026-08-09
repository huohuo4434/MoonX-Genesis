import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("lib/bitget/demo-client.ts", "utf8");

test("production failed-order audit only reads LIVE ORDER_ERROR decisions", () => {
  assert.match(
    source,
    /FROM\s+trade_three_horizon_decisions[\s\S]{0,500}?WHERE\s+rejection_code\s*=\s*'ORDER_ERROR'[\s\S]{0,200}?AND\s+mode\s*=\s*'LIVE'/m
  );
});
