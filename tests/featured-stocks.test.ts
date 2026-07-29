import assert from "node:assert/strict";
import test from "node:test";
import {
  FEATURED_STOCKS_MAX,
  listFeaturedStocks,
  starsDisplay,
} from "../lib/data/featured-stocks.ts";
import { NAV_ROUTES, PUBLIC_PRIMARY_NAV } from "../config/navigation.ts";

test("featured stocks hard cap and required assets", () => {
  const list = listFeaturedStocks();
  assert.ok(list.length <= FEATURED_STOCKS_MAX);
  assert.ok(list.length >= 2);
  assert.equal(list[0]?.symbol, "688825");
  assert.equal(list[0]?.longTermRating, "A+");
  assert.equal(list[1]?.name, "Asteroid");
  assert.equal(list[1]?.longTermRating, "A-");
  assert.ok(!/推荐|暴涨|稳赚|牛股|翻倍|财富密码/.test(JSON.stringify(list)));
});

test("featured stocks nav sits between weekly and verification", () => {
  const keys = PUBLIC_PRIMARY_NAV.map((n) => n.href);
  const weekly = keys.indexOf(NAV_ROUTES.weeklyAnalysis);
  const featured = keys.indexOf(NAV_ROUTES.featuredStocks);
  const verification = keys.indexOf(NAV_ROUTES.verification);
  assert.ok(weekly >= 0 && featured > weekly && verification > featured);
});

test("starsDisplay", () => {
  assert.equal(starsDisplay(5), "★★★★★");
  assert.equal(starsDisplay(4), "★★★★☆");
  assert.equal(starsDisplay(3), "★★★☆☆");
});
