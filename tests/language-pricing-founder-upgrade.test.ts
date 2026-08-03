import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  ENGLISH_PUBLIC_ENABLED,
  PUBLIC_LOCALES,
} from "@/lib/i18n/config";
import {
  OFFICIAL_PLAN_PRICES,
  discountedPrice,
} from "@/lib/payments/founder-discount-shared";

const root = process.cwd();
const read = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

test("English is permanently available in the public language switcher", () => {
  assert.equal(ENGLISH_PUBLIC_ENABLED, true);
  assert.equal(PUBLIC_LOCALES.includes("en"), true);
  const switcher = read("components/layout/LanguageSwitcher.tsx");
  assert.match(switcher, /PUBLIC_LOCALES\.map/);
});

test("official membership list prices are 80, 200 and 700 USDT", () => {
  assert.deepEqual(OFFICIAL_PLAN_PRICES, {
    MONTHLY: 80,
    QUARTERLY: 200,
    YEARLY: 700,
  });
});

test("founding-member discount prices are calculated from current list price", () => {
  assert.equal(discountedPrice("MONTHLY", 20), 64);
  assert.equal(discountedPrice("QUARTERLY", 20), 160);
  assert.equal(discountedPrice("YEARLY", 20), 560);
  assert.equal(discountedPrice("MONTHLY", 10), 72);
  assert.equal(discountedPrice("QUARTERLY", 10), 180);
  assert.equal(discountedPrice("YEARLY", 10), 630);
});

test("first ten and members 11 through 50 are presented with continuity rules", () => {
  const pricing = read("components/payments/PricingPageContent.tsx");
  assert.match(pricing, /前10名付费会员/);
  assert.match(pricing, /第11至50名付费会员/);
  assert.match(pricing, /到期前提交续费订单/);
  assert.match(pricing, /一旦中断.*永久失效/);
  assert.match(pricing, /not transferable or stackable/i);
});

test("payment orders snapshot list price, discount and founder rank", () => {
  const store = read("lib/payments/payment-orders-store.ts");
  const route = read("app/api/payments/submit/route.ts");
  for (const key of ["listPrice", "discountPercent", "discountAmount", "founderRank", "founderTier"]) {
    assert.match(store, new RegExp(key));
  }
  assert.match(route, /getFounderDiscountQuote/);
  assert.match(route, /discountedPrice/);
  assert.match(route, /renewalWasSubmittedBeforeExpiry/);
  assert.match(route, /grantReferenceTime/);
});

test("production plan-price migration is additive and matches the new list prices", () => {
  const migration = read("supabase/migrations/010_membership_prices_and_founder_offer_20260803.sql");
  assert.match(migration, /MONTHLY[\s\S]*30, 80/);
  assert.match(migration, /QUARTERLY[\s\S]*90, 200/);
  assert.match(migration, /YEARLY[\s\S]*365, 700/);
  assert.match(migration, /on conflict \(code\) do update/i);
  assert.doesNotMatch(migration, /delete\s+from|drop\s+table/i);
});


test("a renewal submitted before expiry stays eligible while manual review is pending", () => {
  const server = read("lib/payments/founder-discount-server.ts");
  assert.match(server, /hasPendingRenewalSubmittedBeforeExpiry/);
  assert.match(server, /pendingRenewalPreservesContinuity/);
  assert.match(server, /manual review is pending/i);
});

test("core public conversion and account entry pages contain English copy", () => {
  const files = [
    "components/sections/HeroSection.tsx",
    "components/home/HomeValueOverview.tsx",
    "components/home/HomeMembershipComparison.tsx",
    "components/home/HomePricingEntryClient.tsx",
    "components/payments/PricingPageContent.tsx",
    "components/payments/PricingPlansClient.tsx",
    "components/payments/CheckoutClient.tsx",
    "components/auth/LoginForm.tsx",
    "components/auth/SignOutButton.tsx",
    "components/account/AccountPageClient.tsx",
    "components/account/AccountSecurityPanel.tsx",
    "components/account/AccountReferralPanel.tsx",
    "components/access/MemberDeviceGate.tsx",
    "components/access/MemberDeviceHeartbeat.tsx",
    "components/access/PublicFeaturePreview.tsx",
    "components/legal/TermsPageClient.tsx",
    "components/legal/PrivacyPageClient.tsx",
    "components/support/SupportPageClient.tsx",
    "components/verification/VerificationMethodDisclosure.tsx",
  ];
  for (const file of files) {
    const source = read(file);
    assert.match(source, /locale\s*===\s*["']en["']|const\s+en\s*=/, file);
  }
});
