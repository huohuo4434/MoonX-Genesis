import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { FedDecisionTeaser, FedSpecialView } from "../components/research/FedSeptemberSpecial";
import { canReadFedSpecial, fedSpecialPhase, judgeFedHold } from "../lib/research/fed-september-2026";

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
