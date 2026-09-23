import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const root = new URL('../', import.meta.url);
const source = path => readFileSync(new URL(path, root), 'utf8');
function load(path, mocks = {}, env = {}) {
  const exports = {};
  const sandbox = { exports, process: { env }, URL, Headers, Response, console, crypto: globalThis.crypto, TextEncoder,
    require(id) {
      if (id in mocks) return mocks[id];
      if (id === 'server-only') return {};
      if (id === 'next/server') return { NextResponse: { json: (data, init) => Response.json(data, init) } };
      if (id === 'next/cache') return { unstable_noStore() {} };
      if (id === 'zod') return require('zod');
      if (id === '@/lib/operations/lean-policy') return load('lib/operations/lean-policy.ts');
      if (id === '@/lib/consultations/access-core') return load('lib/consultations/access-core.ts');
      // Any unexpected IO is a hard failure, never real network/DB/exchange access.
      return new Proxy({}, { get: (_, key) => () => { throw new Error(`Unexpected effect: ${id}.${String(key)}`); } });
    },
  };
  vm.runInNewContext(ts.transpileModule(source(path), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, sandbox);
  return exports;
}
const request = (body = {}, headers = {}) => ({ headers: new Headers(headers), json: async () => body, nextUrl: new URL('https://test.invalid/') });
const authenticated = { getCurrentUser: async () => ({ id: 'test-user', email: 'test@example.invalid' }) };

test('approved lean policy matches the existing official Telegram handle', () => {
  const policy = load('lib/operations/lean-policy.ts');
  assert.equal(policy.MANUAL_PAYMENT_MODE, true);
  assert.equal(policy.CONSULTATIONS_PAUSED, true);
  assert.equal(policy.PAYMENT_TELEGRAM.url, 'https://t.me/jackuwin');
  assert.match(source('lib/site-config.ts'), /telegram: "@jackuwin"/);
});

for (const endpoint of ['create-order', 'auto-submit', 'submit']) {
  test(`${endpoint}: authenticated stale clients get contact-only instructions without writes`, async () => {
    const mod = load(`app/api/payments/${endpoint}/route.ts`, {
      '@/lib/auth/permissions': authenticated,
      '@/lib/feature-flags': { getFeatureFlags: () => ({ paymentsEnabled: true }) },
    });
    const response = await mod.POST(request());
    assert.equal(response.status, 409);
    const body = await response.json();
    assert.equal(body.autoVerify, false);
    assert.equal(body.contactUrl, 'https://t.me/jackuwin');
    assert.match(body.message, /勿重复付款/);
  });
  test(`${endpoint}: auth is still required`, async () => {
    const mod = load(`app/api/payments/${endpoint}/route.ts`, {
      '@/lib/auth/permissions': { getCurrentUser: async () => null },
      '@/lib/feature-flags': { getFeatureFlags: () => ({ paymentsEnabled: true }) },
    });
    assert.equal((await mod.POST(request())).status, 401);
  });
}

test('payment kill switch still blocks checkout API', async () => {
  const mod = load('app/api/payments/create-order/route.ts', {
    '@/lib/feature-flags': { getFeatureFlags: () => ({ paymentsEnabled: false }) },
  });
  assert.equal((await mod.POST(request())).status, 503);
  assert.match(source('app/checkout/page.tsx'), /!getFeatureFlags\(\)\.paymentsEnabled/);
});

test('worker and batch entry points do not read, scan, grant, expire or email', async () => {
  const mod = load('lib/payments/process-auto-payment.ts');
  const result = await mod.processAutoPaymentOrder('old-pending-id');
  assert.equal(result.activated, false);
  assert.equal(result.status, 'manual_review');
  const batch = await mod.reconcileAutoPayments(999);
  assert.equal(batch.checked, 0);
  assert.equal(batch.activated, 0);
});

test('retired payment cron authenticates then no-ops, even on an old scheduler', async () => {
  for (const key of [undefined, '', '  ']) {
    const mod = load('app/api/cron/reconcile-payments/route.ts', {}, { CRON_SECRET: key });
    assert.equal((await mod.GET(request())).status, 503);
  }
  const mod = load('app/api/cron/reconcile-payments/route.ts', {}, { CRON_SECRET: 'test-only' });
  assert.equal((await mod.GET(request())).status, 401);
  const good = await mod.GET(request({}, { authorization: 'Bearer test-only' }));
  assert.equal(good.status, 200);
  assert.equal((await good.json()).skipped, 'MANUAL_PAYMENT_MODE');
});

test('manual readiness does not require chain-provider or cron secrets or query order tables', async () => {
  const mod = load('lib/payments/readiness.ts', {
    '@/lib/payments/config': { getPaymentConfig: () => ({ trc20Address: 'test-address', bep20Enabled: false, bep20Address: 'disabled-address' }) },
  });
  const ready = await mod.getPaymentReadiness();
  assert.equal(ready.trc20Open, true);
  assert.equal(ready.autoVerificationReady, false);
  assert.equal(ready.bep20Open, false);
});

test('admin automatic retry/goodwill entry points are stopped before order IO', async () => {
  const path = 'app/api/admin/payments/auto-orders/route.ts';
  const noAdmin = load(path, { '@/lib/auth/permissions': { requireAdmin: async () => null } });
  assert.equal((await noAdmin.POST(request())).status, 403);
  const admin = load(path, { '@/lib/auth/permissions': { requireAdmin: async () => ({ id: 'admin' }) } });
  for (const action of ['retry', 'activate_goodwill_underpayment']) {
    const response = await admin.POST(request({ orderId: '11111111-1111-4111-8111-111111111111', action, confirm: true, txHash: 'a'.repeat(64), reason: 'Manually checked test reason' }));
    assert.equal(response.status, 409);
  }
});

for (const [path, methods] of [
  ['app/api/member/consultations/route.ts', ['GET', 'POST']],
  ['app/api/member/consultations/[id]/route.ts', ['GET', 'PATCH']],
]) {
  test(`${path}: paused before quota, payload, encryption or answer access`, async () => {
    for (const status of ['LOGIN_REQUIRED', 'MEMBERSHIP_REQUIRED', 'DEVICE_REQUIRED', 'ALLOWED']) {
      const mod = load(path, { '@/lib/auth/member-device-guard': { getMemberDevicePageAccess: async () => ({ status, access: { userId: status === 'LOGIN_REQUIRED' ? null : 'test-user' } }) } });
      for (const method of methods) {
        const response = await mod[method](request(), { params: Promise.resolve({ id: 'test-only' }) });
        assert.equal(response.status, status === 'LOGIN_REQUIRED' ? 401 : status === 'ALLOWED' ? 503 : 403);
      }
    }
  });
}

test('paused consultation delivery does not consume or mint entitlements', async () => {
  const result = await load('lib/consultations/quota-delivery.ts').deliverPaidOrderConsultationQuota('old-order');
  assert.equal(result.delivered, false);
  assert.equal(result.error, 'CONSULTATIONS_PAUSED');
});

test('manual checkout renders both locales and only enabled networks, with no auto fetch or polling', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  for (const locale of ['zh', 'en']) for (const bep20Enabled of [false, true]) {
    const mocks = {
      react: React, 'react/jsx-runtime': require('react/jsx-runtime'),
      'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
      'next/navigation': { useSearchParams: () => new URLSearchParams('plan=MONTHLY') },
      '@/lib/i18n/LocaleProvider': { useLocale: () => ({ locale, href: x => x }) },
      '@/components/ui': Object.fromEntries(['Button', 'Card', 'Text'].map(k => [k, ({ children }) => React.createElement('div', {}, children)])),
      '@/lib/payments/founder-discount-shared': load('lib/payments/founder-discount-shared.ts'),
    };
    const { ManualCheckoutClient } = load('components/payments/ManualCheckoutClient.tsx', mocks);
    const html = renderToStaticMarkup(React.createElement(ManualCheckoutClient, {
      email: 'test@example.invalid', trc20Address: 'test-tron', bep20Address: 'test-bsc', bep20Enabled,
      founderQuote: { discountPercent: 0 }, trc20Contract: 'test-tron-token', bep20Contract: 'test-bsc-token',
    }));
    assert.match(html, /https:\/\/t.me\/jackuwin/);
    assert.match(html, /80 USDT/);
    assert.match(html, /test-tron-token/);
    assert.equal(html.includes('value="BEP20"'), bep20Enabled);
    assert.match(html, locale === 'en' ? /not instant/ : /不是即时自动开通/);
  }
  assert.doesNotMatch(source('components/payments/ManualCheckoutClient.tsx'), /fetch\(|setInterval|\/api\/payments/);
  assert.match(source('app/checkout/page.tsx'), /<ManualCheckoutClient/);
  assert.doesNotMatch(source('app/checkout/page.tsx'), /<CheckoutClient/);
});

test('current pricing/order copy no longer promises automatic membership or new consultations', () => {
  for (const path of ['components/payments/PricingPageContent.tsx', 'components/payments/PricingPlansClient.tsx', 'components/payments/CheckoutIntro.tsx', 'app/pricing/page.tsx', 'components/support/SupportPageClient.tsx', 'components/legal/TermsPageClient.tsx']) {
    assert.doesNotMatch(source(path), /链上自动核验|自动开通会员|activates automatically|1 monthly, 3 quarterly, 12 yearly/);
  }
  assert.match(source('app/account/orders/page.tsx'), /保留历史订单/);
});

test('manual administrator adjustment retries reuse the same operation identity across reloads', async () => {
  const getId = () => load('lib/operations/membership-request-id.ts').membershipRequestId;
  const first = await getId()('user-one', 'activate_monthly', ' network TRC20; tx:test-receipt ');
  const again = await getId()('user-one', 'activate_monthly', 'network TRC20; tx:test-receipt');
  assert.equal(first, again);
  assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(first, await getId()('user-one', 'activate_monthly', 'network TRC20; tx:another-receipt'));
  const ui = source('components/admin/AdminUserMembershipActions.tsx');
  assert.match(ui, /membershipRequestId\(userId, action, trimmedReason\)/);
  assert.match(ui, /if \(inFlight.current\) return/);
  assert.match(ui, /finally/);
  assert.match(ui, /action\.startsWith\("activate_"\)/);
  assert.match(ui, /revokeAttempt\.current = null/);
});
