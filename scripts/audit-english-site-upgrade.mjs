import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
let failures = 0;

function read(path) {
  const full = join(root, path);
  if (!existsSync(full)) {
    failures += 1;
    console.error(`FAIL missing: ${path}`);
    return "";
  }
  return readFileSync(full, "utf8");
}

function assert(path, pattern, label) {
  const source = read(path);
  const ok = typeof pattern === "string" ? source.includes(pattern) : pattern.test(source);
  if (ok) console.log(`PASS ${label}`);
  else {
    failures += 1;
    console.error(`FAIL ${label} (${path})`);
  }
}

function reject(path, pattern, label) {
  const source = read(path);
  const hit = typeof pattern === "string" ? source.includes(pattern) : pattern.test(source);
  if (!hit) console.log(`PASS ${label}`);
  else {
    failures += 1;
    console.error(`FAIL ${label} (${path})`);
  }
}

assert("middleware.ts", 'originalPath === "/en" || originalPath.startsWith("/en/")', "/en route detection");
assert("middleware.ts", "NextResponse.rewrite", "server-side /en rewrite");
assert("middleware.ts", "LOCALE_COOKIE_KEY", "locale cookie persistence");
assert("lib/i18n/server.ts", 'locale: english ? "en_US" : "zh_CN"', "localized Open Graph locale");
assert("lib/i18n/server.ts", '"x-default": basePath', "hreflang x-default");
assert("lib/i18n/server.ts", 'english ? "/moox-og-en.png" : "/moox-og.png"', "English Open Graph image");
assert("lib/i18n/config.ts", "The English version of this research note is being prepared.", "English missing-content protection");
assert("components/sections/HeroSection.tsx", "Direction first. Confirmation before entry.", "new English hero headline");
assert("components/member/AiTradingDeskClient.tsx", "AI Strategy Desk", "Strategy Desk naming");
assert("components/conviction/ConvictionListClient.tsx", "Research Watchlist", "Research Watchlist naming");
assert("components/methodology/MethodologyPageClient.tsx", "Qimen Dunjia", "Qimen terminology");
assert("components/payments/PricingPageContent.tsx", "md:hidden", "mobile pricing cards");
assert("app/sitemap.ts", "englishPath", "English URLs in sitemap");
assert("app/robots.ts", '"/en/member/"', "English private routes excluded from indexing");

for (const path of [
  "app/page.tsx",
  "app/pricing/page.tsx",
  "app/verification/page.tsx",
  "app/methodology/page.tsx",
  "app/support/page.tsx",
  "app/privacy/page.tsx",
  "app/terms/page.tsx",
  "app/featured-stocks/page.tsx",
  "app/member/weekly/page.tsx",
  "app/member/monthly/page.tsx",
  "app/member/ai-trading/page.tsx",
]) {
  assert(path, "buildLocalizedPageMetadata", `localized metadata: ${path}`);
}

for (const [path, phrase] of [
  ["components/member/AiTradingDeskClient.tsx", "AI trading desk"],
  ["components/conviction/ConvictionListClient.tsx", "Conviction List"],
  ["components/methodology/MethodologyPageClient.tsx", "Qi Men"],
  ["components/sections/HeroSection.tsx", "before the open"],
]) {
  reject(path, phrase, `removed legacy phrase: ${phrase}`);
}

try {
  JSON.parse(read("messages/en.json"));
  console.log("PASS valid messages/en.json");
} catch (error) {
  failures += 1;
  console.error(`FAIL invalid messages/en.json: ${error instanceof Error ? error.message : String(error)}`);
}

for (const path of ["lib/i18n/server.ts", "lib/i18n/english-content.ts", "public/moox-og-en.png"]) {
  if (existsSync(join(root, path))) console.log(`PASS exists: ${path}`);
  else {
    failures += 1;
    console.error(`FAIL missing: ${path}`);
  }
}

if (failures) {
  console.error(`\nEnglish-site audit failed: ${failures} problem(s).`);
  process.exit(1);
}
console.log("\nEnglish-site audit passed.");
