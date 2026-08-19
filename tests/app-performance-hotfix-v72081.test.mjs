import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const layout = fs.readFileSync("app/layout.tsx", "utf8");
const compat = fs.readFileSync("components/system/DeferredLegacyCompatibility.tsx", "utf8");
const locale = fs.readFileSync("lib/i18n/LocaleProvider.tsx", "utf8");

test("V7.20.8.1 keeps deferred compatibility inside LocaleProvider", () => {
  const providerOpen = layout.indexOf("<LocaleProvider");
  const compatIndex = layout.indexOf("<DeferredLegacyCompatibility />");
  const providerClose = layout.indexOf("</LocaleProvider>");
  assert.ok(providerOpen >= 0, "LocaleProvider missing");
  assert.ok(compatIndex > providerOpen, "DeferredLegacyCompatibility must be after LocaleProvider opens");
  assert.ok(providerClose > compatIndex, "DeferredLegacyCompatibility must be inside LocaleProvider");
  assert.equal(layout.match(/<DeferredLegacyCompatibility \/>/g)?.length, 1, "compatibility layer should render exactly once");
});

test("the deferred member guide really depends on locale context", () => {
  assert.match(compat, /MemberWelcomeGuide/);
  assert.match(locale, /throw new Error\("useLocale\/useTranslations must be used within a <LocaleProvider>"\)/);
});
