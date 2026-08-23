import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildSocialShareText,
  buildTelegramShareUrl,
  buildXShareUrl,
} from "../lib/social-cards/share.ts";

test("social share helpers build public marketing links", () => {
  const text = buildSocialShareText({
    forecastDate: "2026-07-29",
    assetName: "Bitcoin",
    direction: "上涨",
    summary: "日内偏多，留意关键压力",
  });
  assert.match(text, /MOOX/);
  assert.match(text, /Bitcoin/);
  assert.equal(text.includes("六爻"), false);
  assert.equal(text.includes("权重"), false);

  const x = buildXShareUrl("https://moon-x-genesis.vercel.app/forecasts/daily", text);
  assert.match(x, /twitter\.com\/intent\/tweet/);
  assert.match(x, /url=/);

  const tg = buildTelegramShareUrl("https://moon-x-genesis.vercel.app/forecasts/daily", text);
  assert.match(tg, /t\.me\/share\/url/);
});

test("vercel cron schedules Beijing 00:10 social card generation", () => {
  const raw = JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf8")) as {
    crons: Array<{ path: string; schedule: string }>;
  };
  const hit = raw.crons.find((c) => c.path === "/api/cron/generate-social-cards");
  assert.ok(hit);
  assert.equal(hit?.schedule, "10 16 * * *");
});

test("social card image route and admin page exist", () => {
  assert.ok(
    readFileSync(resolve(process.cwd(), "app/api/social-cards/[cardId]/image/route.tsx"), "utf8").includes(
      "1200"
    )
  );
  assert.ok(
    readFileSync(resolve(process.cwd(), "app/admin/social/page.tsx"), "utf8").includes("社交内容")
  );
});
