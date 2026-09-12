import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { buildSync } from "esbuild";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Render the actual TSX with automatic JSX, without loading production credentials.
const output = buildSync({ entryPoints: ["components/education/FreeResearchExample.tsx"], bundle: true,
  platform: "node", format: "cjs", packages: "external", jsx: "automatic", write: false });
const compiled = { exports: {} as { FreeResearchExample: (props: { locale: "en" | "zh-CN" }) => React.ReactNode } };
new Function("require", "module", "exports", output.outputFiles[0]!.text)(createRequire(import.meta.url), compiled, compiled.exports);

test("real component renders the same illustrative levels, risks and three branches in both languages", () => {
  for (const locale of ["zh-CN", "en"] as const) {
    const html = renderToStaticMarkup(createElement(compiled.exports.FreeResearchExample, { locale }));
    for (const price of ["78,000", "79,000", "80,000", "82,000", "84,000"]) assert.ok(html.includes(price));
    assert.equal((html.match(/<details/g) ?? []).length, 3);
    assert.match(html, /id="free-example"/);
    assert.match(html, locale === "en" ? /FICTIONAL TEACHING EXAMPLE/ : /虚构价格教学/);
    assert.match(html, locale === "en" ? /no performance score/ : /不计命中率/);
    assert.ok(html.includes(`href="${locale === "en" ? "/en" : ""}/member/daily"`));
    assert.ok(html.includes(`href="${locale === "en" ? "/en" : ""}/verification"`));
    if (locale === "en") assert.doesNotMatch(html, /[\u4e00-\u9fff]/);
  }
});

test("entry points are accessible in both home modes; guide keeps localized signup and feedback", () => {
  for (const file of ["components/home/HomeWelcome.tsx", "components/home/HomeLandingBoard.tsx"]) {
    assert.match(readFileSync(file, "utf8"), /\/guide#free-example/);
  }
  const guide = readFileSync("app/guide/page.tsx", "utf8");
  assert.match(guide, /<FreeResearchExample locale=\{locale\}/);
  assert.match(guide, /href\("\/support"\)/);
  assert.match(guide, /encodeURIComponent\(href\("\/member\/daily"\)\)/);
  const component = readFileSync("components/education/FreeResearchExample.tsx", "utf8");
  assert.doesNotMatch(component, /fetch\(|getAdminClient|use client|SUPABASE|localStorage/);
});
