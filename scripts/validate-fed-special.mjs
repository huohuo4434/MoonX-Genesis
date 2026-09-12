import assert from "node:assert/strict";

const site = process.argv[2] || "https://mooxintel.com";
for (const prefix of ["", "/en"]) {
  const response = await fetch(`${site}${prefix}/fed-september-2026`, { cache: "no-store", signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /data-fed-special="fed-september-2026-v1"/);
  assert.match(html, /data-fed-gate/);
  assert.doesNotMatch(html, /data-fed-full|汽油贡献|gasoline contributed/);
  assert.match(html, new RegExp(`${prefix}/register\\?next=${encodeURIComponent(`${prefix}/fed-september-2026`)}`));
  assert.match(html, prefix ? /Our pre-meeting call/ : /我们的会前判断/);
  assert.match(response.headers.get("cache-control") || "", /no-store|private/);
  console.log(`${prefix || "zh"}: anonymous gate, locale, return link, cache policy PASS`);
}
console.log("FED SPECIAL PUBLIC VALIDATION PASSED");
