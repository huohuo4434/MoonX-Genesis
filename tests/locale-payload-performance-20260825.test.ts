import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(file, "utf8");

test("client locale provider receives one server-selected dictionary", () => {
  const provider = read("lib/i18n/LocaleProvider.tsx");
  const layout = read("app/layout.tsx");
  assert.doesNotMatch(provider, /@\/messages\//);
  assert.doesNotMatch(provider, /DICTIONARIES/);
  assert.match(provider, /messages: LocaleMessages/);
  assert.match(layout, /getLocaleMessages\(locale\)/);
  assert.match(layout, /messages=\{messages\}/);
});

test("server locale selection preserves English fallback keys", () => {
  const source = read("lib/i18n/messages-server.ts");
  assert.match(source, /import "server-only"/);
  assert.match(source, /mergeMessages\(EN_MESSAGES, zhCN/);
  assert.match(source, /mergeMessages\(EN_MESSAGES, zhTW/);
  assert.match(source, /MESSAGES_BY_LOCALE\[locale\]/);
});
