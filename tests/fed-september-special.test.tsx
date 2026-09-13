import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { FedDecisionTeaser, FedSpecialView } from "../components/research/FedSeptemberSpecial";
import { FED_SPECIAL, canReadFedSpecial, fedSpecialPhase, judgeFedHold } from "../lib/research/fed-september-2026";

test("v2 uses chart-grounded editorial voice in both languages and preserves the prior call", () => {
  const zh = renderToStaticMarkup(<FedSpecialView en={false} canRead={true} />);
  const en = renderToStaticMarkup(<FedSpecialView en={true} canRead={true} />);
  assert.match(zh, /六爻与奇门同向/);
  assert.match(zh, /未土发动化卯木，受回头克/);
  assert.match(zh, /等待正式决议检验/);
  assert.match(en, /Liu Yao and Qimen align/);
  assert.match(en, /Wei Earth to Mao Wood/);
  assert.doesNotMatch(zh + en, /用户提供|只作辅助|因果证据|supplied Liu Yao|Traditional divination is supplementary/);
  assert.equal(FED_SPECIAL.call, "HOLD");
  assert.equal(FED_SPECIAL.revision, 2);
  assert.equal(FED_SPECIAL.previousVersion.commit, "4ce6f184b80bcaeba49f75ab8113789a9d47f447");
  assert.equal(FED_SPECIAL.status, "AWAITING_OFFICIAL_RESULT");
});

test("ordinary free accounts unlock; anonymous accounts do not", () => {
  assert.equal(canReadFedSpecial({ authenticated: true }), true);
  assert.equal(canReadFedSpecial({ authenticated: false }), false);
  for (const en of [false, true]) {
    const guest = renderToStaticMarkup(<FedSpecialView en={en} canRead={false} />);
    const free = renderToStaticMarkup(<FedSpecialView en={en} canRead={true} />);
    assert.match(guest, /data-fed-gate/);
    assert.doesNotMatch(guest, /data-fed-full|01 \/|02 \/|03 \/|04 \//);
    assert.match(guest, en ? /\/en\/register\?next=%2Fen%2Ffed-september-2026/ : /\/register\?next=%2Ffed-september-2026/);
    assert.match(free, /data-fed-full/);
    assert.doesNotMatch(free, /data-fed-gate/);
  }
});
test("only unchanged bounds count; hike and cut both miss", () => {
  assert.equal(judgeFedHold([3.5, 3.75], [3.5, 3.75]), "HIT");
  assert.equal(judgeFedHold([3.5, 3.75], [3.75, 4]), "MISS");
  assert.equal(judgeFedHold([3.5, 3.75], [3.25, 3.5]), "MISS");
  assert.equal(judgeFedHold([NaN, 3.75], [3.5, 3.75]), "UNVERIFIABLE");
});
test("decision time switches to review-pending, never automatic success", () => {
  const before = new Date("2026-09-16T17:59:59Z");
  const after = new Date("2026-09-16T18:00:00Z");
  assert.equal(fedSpecialPhase(before), "PRE_MEETING");
  assert.equal(fedSpecialPhase(after), "REVIEW_PENDING");
  assert.match(renderToStaticMarkup(<FedDecisionTeaser locale="en" now={before} />), /fed-september-2026/);
  assert.equal(renderToStaticMarkup(<FedDecisionTeaser locale="en" now={after} />), "");
  assert.match(renderToStaticMarkup(<FedSpecialView en={false} canRead={true} now={after} />), /等待官方结果复核/);
});
test("the real route checks fresh access and renders dynamically on server", () => {
  const route = readFileSync("app/fed-september-2026/page.tsx", "utf8");
  assert.match(route, /getAccessUser\(\)/);
  assert.match(route, /canRead=\{canReadFedSpecial\(access\)\}/);
  assert.match(route, /force-dynamic/);
  assert.doesNotMatch(route, /isActiveMember|isAdmin|use client/);
  assert.doesNotMatch(readFileSync("components/research/FedSeptemberSpecial.tsx", "utf8"), /use client|dangerouslySetInnerHTML/);
});
