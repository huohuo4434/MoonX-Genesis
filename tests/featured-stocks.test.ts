import assert from "node:assert/strict";
import test from "node:test";
import { CONVICTION_ASSETS_MAX, CONVICTION_ASSET_SEED } from "../lib/data/conviction/seed.ts";
import {
  ASTEROID_PERIOD_FORECASTS,
  getAsteroidForecastByType,
  listAsteroidPeriodForecasts,
} from "../lib/data/conviction/asteroid-forecasts.ts";
import { hasConvictionFullAccess } from "../lib/data/conviction/access-mode.ts";
import { NAV_ROUTES, PUBLIC_PRIMARY_NAV } from "../config/navigation.ts";
import { normalizeFormalDirection } from "../lib/forecasts/formal-direction.ts";

test("conviction list has cxmt and asteroid", () => {
  assert.ok(CONVICTION_ASSET_SEED.length <= CONVICTION_ASSETS_MAX);
  assert.ok(CONVICTION_ASSET_SEED.length >= 2);
  assert.equal(CONVICTION_ASSET_SEED[0]?.slug, "cxmt");
  assert.equal(CONVICTION_ASSET_SEED[0]?.symbol, "688825");
  assert.equal(CONVICTION_ASSET_SEED[1]?.slug, "asteroid");
  assert.equal(CONVICTION_ASSET_SEED[1]?.nameZh, "Asteroid（太空狗）");
  assert.equal(CONVICTION_ASSET_SEED[1]?.nameEn, "Asteroid");
  assert.equal(CONVICTION_ASSET_SEED[1]?.network, "Ethereum / 以太坊");
  assert.equal(CONVICTION_ASSET_SEED[1]?.assetType, "CRYPTO");
  assert.equal(CONVICTION_ASSET_SEED[1]?.contractPendingAdminConfirm, false);
  assert.equal(
    CONVICTION_ASSET_SEED[1]?.contractAddress,
    "0xf280b16ef293d8e534e370794ef26bf312694126"
  );
  assert.ok(CONVICTION_ASSET_SEED[1]?.marketCapUpdatedAt);
  assert.ok(!/火箭狗/.test(CONVICTION_ASSET_SEED[1]?.nameZh ?? ""));
});

test("focused-assets nav uses the public featured-stocks route once", () => {
  const keys = PUBLIC_PRIMARY_NAV.map((n) => n.href);
  const signals = keys.indexOf(NAV_ROUTES.tradingSignals);
  const focused = keys.indexOf(NAV_ROUTES.featuredStocks);
  const verification = keys.indexOf(NAV_ROUTES.verification);

  assert.ok(signals >= 0 && focused === signals + 1 && verification === focused + 1);
  assert.equal(PUBLIC_PRIMARY_NAV.filter((n) => n.href === NAV_ROUTES.featuredStocks).length, 1);
  assert.equal(PUBLIC_PRIMARY_NAV.some((n) => n.href === NAV_ROUTES.watchlist), false);
  assert.equal(PUBLIC_PRIMARY_NAV.some((n) => n.href === NAV_ROUTES.memberStocks), false);
  assert.equal(PUBLIC_PRIMARY_NAV.find((n) => n.href === NAV_ROUTES.featuredStocks)?.labelZh, "重点关注");
});

test("asteroid periods: no fabricated today/tomorrow; long horizons published", () => {
  assert.equal(getAsteroidForecastByType("TODAY"), null);
  assert.equal(getAsteroidForecastByType("TOMORROW"), null);
  assert.ok(getAsteroidForecastByType("WEEK"));
  assert.ok(getAsteroidForecastByType("MONTH_1"));
  assert.ok(getAsteroidForecastByType("MONTH_3"));
  assert.ok(getAsteroidForecastByType("YEAR_1"));
  assert.ok(getAsteroidForecastByType("YEAR_5"));
  assert.equal(listAsteroidPeriodForecasts().length, 8);
  const ids = ASTEROID_PERIOD_FORECASTS.map((f) => f.id);
  for (const id of [
    "ASTEROID-W1-20260803-V3",
    "ASTEROID-W2-20260810-V1",
    "ASTEROID-W3-20260817-V1",
    "ASTEROID-W4-20260824-V1",
    "ASTEROID-M1-20260801-V3",
    "ASTEROID-M3-20260801-V2",
    "ASTEROID-Y1-20260801-V2",
    "ASTEROID-Y5-20260729-V1",
  ]) {
    assert.ok(ids.includes(id), `missing ${id}`);
  }
  for (const f of listAsteroidPeriodForecasts()) {
    assert.equal(f.status, "published");
    assert.ok(!JSON.stringify(f).includes("待验证"));
  }
});

test("conviction access: admin and member full; others publicOnly", () => {
  assert.equal(hasConvictionFullAccess({ authenticated: false, isAdmin: false, isActiveMember: false }), false);
  assert.equal(hasConvictionFullAccess({ authenticated: true, isAdmin: false, isActiveMember: false }), false);
  assert.equal(hasConvictionFullAccess({ authenticated: true, isAdmin: true, isActiveMember: false }), true);
  assert.equal(hasConvictionFullAccess({ authenticated: true, isAdmin: false, isActiveMember: true }), true);
});

test("formal direction migration", () => {
  assert.equal(normalizeFormalDirection("震荡偏多"), "震荡上涨");
  assert.equal(normalizeFormalDirection("偏多"), "震荡上涨");
  assert.equal(normalizeFormalDirection("先抑后扬"), "先跌后涨");
  assert.equal(normalizeFormalDirection("前高后低"), "先涨后跌");
  assert.equal(normalizeFormalDirection("高位惯性"), "冲高回落");
  assert.equal(normalizeFormalDirection("区间震荡"), "震荡");
  assert.equal(normalizeFormalDirection("观望"), "震荡");
});
